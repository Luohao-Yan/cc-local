import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

interface TaskRecord {
  id: string
  subject: string
  description?: string
  status: TaskStatus
  owner?: string
  createdAt: number
  updatedAt: number
}

const tasksBySession = new Map<string, TaskRecord[]>()

function getTasks(sessionId: string): TaskRecord[] {
  const tasks = tasksBySession.get(sessionId)
  if (tasks) {
    return tasks
  }
  const next: TaskRecord[] = []
  tasksBySession.set(sessionId, next)
  return next
}

function formatTask(task: TaskRecord): string {
  return [
    `ID: ${task.id}`,
    `Subject: ${task.subject}`,
    `Status: ${task.status}`,
    task.description ? `Description: ${task.description}` : undefined,
    task.owner ? `Owner: ${task.owner}` : undefined,
  ].filter(Boolean).join('\n')
}

export const taskCreateTool: Tool = {
  name: 'TaskCreate',
  description: 'Create a lightweight task record for the current session.',
  input_schema: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Task subject.' },
      description: { type: 'string', description: 'Optional task description.' },
      owner: { type: 'string', description: 'Optional task owner.' },
    },
    required: ['subject'],
  },
  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { subject, description, owner } = input as { subject?: string; description?: string; owner?: string }
    if (!subject) {
      return { content: 'Error: subject is required', is_error: true }
    }
    const now = Date.now()
    const task: TaskRecord = {
      id: `task-${now.toString(36)}`,
      subject,
      description,
      owner,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    getTasks(context.sessionId).push(task)
    return { content: `Task created.\n${formatTask(task)}` }
  },
}

export const taskListTool: Tool = {
  name: 'TaskList',
  description: 'List lightweight task records for the current session.',
  input_schema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Optional status filter.' },
    },
  },
  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { status } = input as { status?: TaskStatus }
    const tasks = getTasks(context.sessionId).filter((task) => !status || task.status === status)
    if (tasks.length === 0) {
      return { content: 'No tasks found.' }
    }
    return {
      content: tasks.map(formatTask).join('\n\n'),
    }
  },
}

export const taskGetTool: Tool = {
  name: 'TaskGet',
  description: 'Get one lightweight task record by ID.',
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Task ID.' },
    },
    required: ['id'],
  },
  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { id } = input as { id?: string }
    const task = getTasks(context.sessionId).find((item) => item.id === id)
    if (!task) {
      return { content: `Task not found: ${id || ''}`, is_error: true }
    }
    return { content: formatTask(task) }
  },
}

export const taskUpdateTool: Tool = {
  name: 'TaskUpdate',
  description: 'Update one lightweight task record by ID.',
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Task ID.' },
      subject: { type: 'string', description: 'New subject.' },
      description: { type: 'string', description: 'New description.' },
      status: { type: 'string', description: 'New status.' },
      owner: { type: 'string', description: 'New owner.' },
    },
    required: ['id'],
  },
  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { id, subject, description, status, owner } = input as Partial<TaskRecord>
    const task = getTasks(context.sessionId).find((item) => item.id === id)
    if (!task) {
      return { content: `Task not found: ${id || ''}`, is_error: true }
    }
    if (subject !== undefined) task.subject = subject
    if (description !== undefined) task.description = description
    if (owner !== undefined) task.owner = owner
    if (status !== undefined) {
      if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return { content: `Invalid task status: ${status}`, is_error: true }
      }
      task.status = status
    }
    task.updatedAt = Date.now()
    return { content: `Task updated.\n${formatTask(task)}` }
  },
}

export function clearTaskStore(): void {
  tasksBySession.clear()
}
