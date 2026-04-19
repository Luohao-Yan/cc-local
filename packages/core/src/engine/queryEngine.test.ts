import { describe, expect, it } from 'vitest'
import { QueryEngine } from './queryEngine.js'
import { MCPManager } from '../mcp/MCPManager.js'
import { toolRegistry } from '../tools/registry.js'

describe('QueryEngine', () => {
  it('executes tool calls and continues the response loop', async () => {
    const seenMessages: Array<Array<{ role: string; content: unknown }>> = []
    let callCount = 0

    const engine = new QueryEngine({
      model: 'test-model',
      client: {
        async *streamQuery(messages) {
          seenMessages.push(messages.map((message) => ({
            role: message.role,
            content: message.content,
          })))

          if (callCount === 0) {
            callCount += 1
            yield {
              type: 'tool_use' as const,
              name: 'echo_tool',
              input: { value: 'hello' },
              id: 'tool-1',
            }
            yield {
              type: 'usage' as const,
              inputTokens: 10,
              outputTokens: 5,
            }
            return
          }

          yield {
            type: 'text' as const,
            text: 'final answer',
          }
          yield {
            type: 'usage' as const,
            inputTokens: 2,
            outputTokens: 3,
          }
        },
      },
      tools: [{
        name: 'echo_tool',
        description: 'Echoes the provided value',
        input_schema: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
          required: ['value'],
        },
        async execute(input: unknown) {
          return {
            content: `echo:${(input as { value: string }).value}`,
          }
        },
      }],
    })

    const result = await engine.query([{
      id: 'user-1',
      role: 'user',
      content: [{ type: 'text', text: 'run a tool' }],
      timestamp: 1,
    }])

    expect(result.message.content).toEqual([{ type: 'text', text: 'final answer' }])
    expect(result.usage).toEqual({
      inputTokens: 12,
      outputTokens: 8,
    })
    expect(seenMessages).toHaveLength(2)
    expect(seenMessages[1]?.at(-1)).toMatchObject({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: 'tool-1',
        content: 'echo:hello',
      }],
    })
  })

  it('includes connected MCP tools in the default tool pool', async () => {
    const manager = new MCPManager({
      toolRegistry,
      syncToolsToRegistry: true,
      connectionFactory: async () => ({
        async listTools() {
          return [{
            name: 'read_file',
            description: 'Read a file from disk',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
              },
            },
          }]
        },
        async callTool(name) {
          return {
            content: `mcp:${name}`,
          }
        },
        async close() {},
      }),
    })

    manager.registerServer({
      name: 'filesystem',
      config: {
        type: 'stdio',
        command: 'npx',
      },
    })
    await manager.connectServer('filesystem')

    const seenToolSets: Array<Array<{ name: string; description: string; input_schema: unknown }>> = []
    let callCount = 0

    const engine = new QueryEngine({
      model: 'test-model',
      client: {
        async *streamQuery(_messages, options) {
          seenToolSets.push(((options?.tools) ?? []) as Array<{ name: string; description: string; input_schema: unknown }>)

          if (callCount === 0) {
            callCount += 1
            yield {
              type: 'tool_use' as const,
              name: 'mcp__filesystem__read_file',
              input: { path: '/tmp/demo' },
              id: 'tool-1',
            }
            return
          }

          yield {
            type: 'text' as const,
            text: 'done',
          }
          yield {
            type: 'usage' as const,
            inputTokens: 1,
            outputTokens: 1,
          }
        },
      },
    })

    const result = await engine.query([{
      id: 'user-1',
      role: 'user',
      content: [{ type: 'text', text: 'use the MCP tool' }],
      timestamp: 1,
    }])

    expect(seenToolSets[0]?.some((tool) => tool.name === 'mcp__filesystem__read_file')).toBe(true)
    expect(result.message.content).toEqual([{ type: 'text', text: 'done' }])

    await manager.removeServer('filesystem')
  })
})
