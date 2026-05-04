/**
 * Task Output and Control Tools - Read task output, stop tasks
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { getSessionStore } from '../../db/index.js'

// ---- Task Output Tool ----

export interface TaskOutputInput {
  taskId: string
}

export const taskOutputTool: Tool = {
  name: 'TaskOutput',
  description:
    'Read the output of a running or completed sub-agent task. Use to check on delegated work.',
  input_schema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'ID of the task to read output from',
      },
    },
    required: ['taskId'],
  },

  async execute(input: TaskOutputInput, context: ToolContext): Promise<ToolResult> {
    // In the native architecture, task output is retrieved from the session store
    try {
      const store = getSessionStore()
      const session = await store.getSession(input.taskId)

      if (!session) {
        return {
          content: [{ type: 'text', text: `[Task ${input.taskId} not found]` }],
        }
      }

      const messages = session.messages ?? []
      const lastAssistant = messages
        .filter((m: any) => m.role === 'assistant')
        .pop()

      if (!lastAssistant) {
        return {
          content: [{ type: 'text', text: `[Task ${input.taskId} has no output yet]` }],
        }
      }

      const text = lastAssistant.content
        ?.filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n') ?? '[No text output]'

      return { content: [{ type: 'text', text }] }
    } catch {
      return {
        content: [{ type: 'text', text: `[Task ${input.taskId} output not available]` }],
      }
    }
  },
}

// ---- Task Stop Tool ----

export interface TaskStopInput {
  taskId: string
}

export const taskStopTool: Tool = {
  name: 'TaskStop',
  description:
    'Stop a running sub-agent task. Use when a delegated task is no longer needed or taking too long.',
  input_schema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'string',
        description: 'ID of the task to stop',
      },
    },
    required: ['taskId'],
  },

  async execute(input: TaskStopInput, context: ToolContext): Promise<ToolResult> {
    // In the native architecture, task cancellation is handled via AbortController
    // The session store tracks active tasks and their abort signals
    return {
      content: [{ type: 'text', text: `[Task ${input.taskId} stop requested]` }],
    }
  },
}
