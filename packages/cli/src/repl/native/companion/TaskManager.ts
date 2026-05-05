/**
 * Task Manager for Native REPL
 *
 * Manages background task display: task list, progress bars,
 * and status indicators.
 */

import chalk from 'chalk'

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled'

/**
 * Task entry
 */
export interface TaskEntry {
  /** Task ID */
  id: string
  /** Task subject */
  subject: string
  /** Task status */
  status: TaskStatus
  /** Progress percentage (0-100) */
  progress: number
  /** Status message */
  message?: string
  /** Error message (if failed) */
  error?: string
  /** Creation timestamp */
  createdAt: number
  /** Completion timestamp */
  completedAt?: number
  /** Sub-tasks */
  subtasks?: TaskEntry[]
}

/**
 * Task Manager class
 */
export class TaskManager {
  private tasks: Map<string, TaskEntry> = new Map()
  private listeners: Set<() => void> = new Set()

  /**
   * Add a new task
   */
  addTask(id: string, subject: string): TaskEntry {
    const task: TaskEntry = {
      id,
      subject,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    }
    this.tasks.set(id, task)
    this.notifyListeners()
    return { ...task }
  }

  /**
   * Update task status
   */
  updateTask(id: string, updates: Partial<Pick<TaskEntry, 'status' | 'progress' | 'message' | 'error'>>): TaskEntry | undefined {
    const task = this.tasks.get(id)
    if (!task) return undefined

    Object.assign(task, updates)

    // Auto-set progress on completion
    if (updates.status === 'completed') {
      task.progress = 100
      task.completedAt = Date.now()
    }

    this.notifyListeners()
    return { ...task }
  }

  /**
   * Remove a task
   */
  removeTask(id: string): boolean {
    const result = this.tasks.delete(id)
    if (result) this.notifyListeners()
    return result
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): TaskEntry | undefined {
    const task = this.tasks.get(id)
    return task ? { ...task } : undefined
  }

  /**
   * Get all tasks
   */
  getAllTasks(): TaskEntry[] {
    return [...this.tasks.values()]
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): TaskEntry[] {
    return [...this.tasks.values()].filter((t) => t.status === status)
  }

  /**
   * Get active tasks (pending or in_progress)
   */
  getActiveTasks(): TaskEntry[] {
    return [...this.tasks.values()].filter(
      (t) => t.status === 'pending' || t.status === 'in_progress',
    )
  }

  /**
   * Clear completed/failed tasks
   */
  clearFinished(): number {
    let count = 0
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'canceled') {
        this.tasks.delete(id)
        count++
      }
    }
    if (count > 0) this.notifyListeners()
    return count
  }

  /**
   * Render task list
   */
  renderTasks(): string {
    const tasks = [...this.tasks.values()]
    if (tasks.length === 0) return ''

    const lines: string[] = []
    lines.push(chalk.bold('Background Tasks'))
    lines.push('')

    for (const task of tasks) {
      lines.push(renderTaskEntry(task))
    }

    return lines.join('\n')
  }

  /**
   * Render compact task summary (for status bar)
   */
  renderCompactSummary(): string {
    const active = this.getActiveTasks()
    const completed = this.getTasksByStatus('completed').length
    const failed = this.getTasksByStatus('failed').length

    if (active.length === 0 && completed === 0 && failed === 0) return ''

    const parts: string[] = []

    if (active.length > 0) {
      parts.push(chalk.cyan(`⟳ ${active.length} active`))
    }
    if (completed > 0) {
      parts.push(chalk.green(`✓ ${completed} done`))
    }
    if (failed > 0) {
      parts.push(chalk.red(`✗ ${failed} failed`))
    }

    return parts.join(chalk.dim(' │ '))
  }

  /**
   * Subscribe to task changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

/**
 * Render a single task entry
 */
function renderTaskEntry(task: TaskEntry): string {
  const statusIcon: Record<TaskStatus, string> = {
    pending: chalk.dim('○'),
    in_progress: chalk.cyan('◌'),
    completed: chalk.green('●'),
    failed: chalk.red('●'),
    canceled: chalk.dim('○'),
  }

  const icon = statusIcon[task.status]
  const subject = task.status === 'completed' ? chalk.dim(task.subject) : task.subject
  const message = task.message ? chalk.dim(` — ${task.message}`) : ''
  const progress = renderProgressBar(task.progress)

  let line = `  ${icon} ${subject}${message}`

  if (task.status === 'in_progress' && task.progress > 0) {
    line += ` ${progress}`
  }

  if (task.status === 'failed' && task.error) {
    line += `\n    ${chalk.red(task.error)}`
  }

  return line
}

/**
 * Render a mini progress bar
 */
function renderProgressBar(percent: number, width: number = 10): string {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return chalk.dim(`[${bar}] ${percent}%`)
}

/**
 * Create a task manager instance
 */
export function createTaskManager(): TaskManager {
  return new TaskManager()
}
