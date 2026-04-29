/**
 * Agent Tool - Spawn sub-agents for delegated tasks
 *
 * This is the native packages/core implementation of the Agent tool.
 * It creates isolated query contexts that run with their own message history
 * and stream results back to the parent.
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { QueryEngine } from '../../engine/queryEngine.js'
import { toolRegistry } from '../registry.js'

export interface AgentInput {
  prompt: string
  model?: string
  cwd?: string
}

export const agentTool: Tool = {
  name: 'Agent',
  description:
    'Launch a sub-agent to handle a specific task. The sub-agent runs in its own context with separate message history. Use for delegating focused work that can be done independently.',
  input_schema: {
    type: 'object' as const,
    properties: {
      prompt: {
        type: 'string',
        description: 'The task description for the sub-agent',
      },
      model: {
        type: 'string',
        description: 'Optional model override for the sub-agent',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the sub-agent task',
      },
    },
    required: ['prompt'],
  },

  async call(input: AgentInput, context: ToolContext): Promise<ToolResult> {
    const agentEngine = new QueryEngine({
      model: input.model ?? context.model ?? 'claude-sonnet-4-20250514',
      systemPrompt: `You are a sub-agent handling a delegated task. Complete the task and return results concisely.

Task: ${input.prompt}

Working directory: ${input.cwd ?? context.cwd ?? process.cwd()}`,
      maxTurns: 10,
    })

    const messages = [
      {
        id: `agent-${Date.now()}`,
        role: 'user' as const,
        content: [{ type: 'text' as const, text: input.prompt }],
        timestamp: Date.now(),
      },
    ]

    try {
      const result = await agentEngine.query(messages, {
        onStream: context.onStream,
      })

      const textContent = result.message.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n')

      return {
        content: [
          {
            type: 'text',
            text: textContent || '[Agent completed with no text output]',
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `[Agent error] ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      }
    }
  },
}
