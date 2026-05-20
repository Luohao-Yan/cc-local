/**
 * End-to-end tests for MCP tools integration with QueryEngine
 *
 * Tests: register MCP server → connect → tools sync to registry →
 *         QueryEngine calls MCP tool → result flows back
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MCPManager, type MCPManagerOptions } from '@cclocal/core'
import { ToolRegistry } from '@cclocal/core'
import type { Tool, ToolResult } from '@cclocal/shared'

function createMockConnectionHandle(tools: { name: string; description: string }[]) {
  return {
    listTools: vi.fn(async () =>
      tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: { type: 'object' as const, properties: { query: { type: 'string' as const } } },
      }))
    ),
    callTool: vi.fn(async (name: string, args: unknown) => ({
      content: `Mock result from ${name}: ${JSON.stringify(args)}`,
    }) as unknown as Promise<ToolResult>),
    close: vi.fn(async () => {}),
  }
}

describe('MCP tools integration', () => {
  let registry: ToolRegistry
  let manager: MCPManager

  beforeEach(() => {
    registry = new ToolRegistry()
    registry.registerDefaults()
  })

  it('registers MCP server and syncs tools to registry on connect', async () => {
    const mockHandle = createMockConnectionHandle([
      { name: 'search', description: 'Search the web' },
      { name: 'fetch', description: 'Fetch a URL' },
    ])

    manager = new MCPManager({
      toolRegistry: registry,
      syncToolsToRegistry: true,
      connectionFactory: async () => mockHandle,
    })

    manager.registerServer({
      name: 'test-server',
      config: { type: 'http', url: 'http://localhost:9999/sse' },
    })

    const record = await manager.connectServer('test-server')
    expect(record.status).toBe('connected')

    // Tools should be synced to the registry
    const allTools = registry.getAll()
    const mcpTools = allTools.filter((t) => t.name.startsWith('mcp__test_server__'))
    expect(mcpTools.length).toBe(2)
    expect(mcpTools.some((t) => t.name.includes('search'))).toBe(true)
    expect(mcpTools.some((t) => t.name.includes('fetch'))).toBe(true)
  })

  it('can call an MCP tool through the registry', async () => {
    const mockHandle = createMockConnectionHandle([
      { name: 'echo', description: 'Echo input' },
    ])

    manager = new MCPManager({
      toolRegistry: registry,
      syncToolsToRegistry: true,
      connectionFactory: async () => mockHandle,
    })

    manager.registerServer({
      name: 'echo-server',
      config: { type: 'http', url: 'http://localhost:9998/sse' },
    })

    await manager.connectServer('echo-server')

    // Find the registered MCP tool
    const echoTool = registry.getAll().find((t) => t.name.includes('echo'))
    expect(echoTool).toBeDefined()

    // Execute it
    const result = await echoTool!.execute({ query: 'hello' }, {
      sessionId: 'test',
      cwd: '/tmp',
    })

    expect(result).toBeDefined()
    expect(mockHandle.callTool).toHaveBeenCalledWith('echo', { query: 'hello' })
  })

  it('unregisters tools when MCP server disconnects', async () => {
    const mockHandle = createMockConnectionHandle([
      { name: 'temp', description: 'Temporary tool' },
    ])

    manager = new MCPManager({
      toolRegistry: registry,
      syncToolsToRegistry: true,
      connectionFactory: async () => mockHandle,
    })

    manager.registerServer({
      name: 'temp-server',
      config: { type: 'http', url: 'http://localhost:9997/sse' },
    })

    await manager.connectServer('temp-server')
    const beforeCount = registry.getAll().filter((t) => t.name.includes('temp')).length
    expect(beforeCount).toBeGreaterThan(0)

    await manager.disconnectServer('temp-server')
    const afterCount = registry.getAll().filter((t) => t.name.includes('temp')).length
    expect(afterCount).toBe(0)
  })

  it('handles multiple MCP servers with distinct tool namespaces', async () => {
    const handle1 = createMockConnectionHandle([
      { name: 'search', description: 'Web search' },
    ])
    const handle2 = createMockConnectionHandle([
      { name: 'search', description: 'Code search' },
    ])

    manager = new MCPManager({
      toolRegistry: registry,
      syncToolsToRegistry: true,
      connectionFactory: async (record) =>
        record.name === 'web' ? handle1 : handle2,
    })

    manager.registerServer({
      name: 'web',
      config: { type: 'http', url: 'http://localhost:9000/sse' },
    })
    manager.registerServer({
      name: 'code',
      config: { type: 'http', url: 'http://localhost:9001/sse' },
    })

    await manager.connectServer('web')
    await manager.connectServer('code')

    const allTools = registry.getAll().filter((t) => t.name.startsWith('mcp__'))
    expect(allTools.length).toBe(2)
    expect(allTools.some((t) => t.name.includes('mcp__web__search'))).toBe(true)
    expect(allTools.some((t) => t.name.includes('mcp__code__search'))).toBe(true)
  })
})
