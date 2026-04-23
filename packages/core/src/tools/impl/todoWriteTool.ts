import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface TodoItem {
  id?: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
}

const todosBySession = new Map<string, TodoItem[]>()

export const todoWriteTool: Tool = {
  name: 'TodoWrite',
  description: 'Create or update the session todo list for multi-step work.',
  input_schema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: 'Complete updated todo list.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['content', 'status'],
        },
      },
    },
    required: ['todos'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { todos } = input as { todos: TodoItem[] }
    if (!Array.isArray(todos)) {
      return {
        content: 'Error: todos must be an array',
        is_error: true,
      }
    }

    const normalized = todos.map((todo, index) => ({
      id: todo.id || `todo-${index + 1}`,
      content: String(todo.content || ''),
      status: todo.status,
      priority: todo.priority || 'medium',
    }))

    const invalid = normalized.find((todo) => !todo.content || !['pending', 'in_progress', 'completed'].includes(todo.status))
    if (invalid) {
      return {
        content: 'Error: each todo requires content and a valid status',
        is_error: true,
      }
    }

    todosBySession.set(context.sessionId, normalized)
    return {
      content: [
        'Todos updated successfully.',
        ...normalized.map((todo) => `- [${todo.status}] ${todo.content} (${todo.priority})`),
      ].join('\n'),
    }
  },
}

export function getSessionTodos(sessionId: string): TodoItem[] {
  return todosBySession.get(sessionId) || []
}
