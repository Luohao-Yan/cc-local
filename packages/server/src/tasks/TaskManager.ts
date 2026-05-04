/**
 * Task Manager
 *
 * 管理后台任务，支持：
 * - 任务创建、启动、取消
 * - 任务状态追踪
 * - 并发控制
 * - 任务队列
 */

import { randomUUID } from 'crypto'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type TaskType = 'query' | 'tool' | 'agent'

export interface TaskConfig {
  sessionId: string
  type: TaskType
  name?: string
  config?: Record<string, unknown>
}

export interface Task {
  id: string
  sessionId: string
  type: TaskType
  name: string
  status: TaskStatus
  progress: number
  message?: string
  result?: unknown
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  config?: Record<string, unknown>
}

export interface TaskManagerOptions {
  /** 最大并发任务数 */
  maxConcurrent?: number
  /** 任务超时时间（毫秒） */
  timeout?: number
  /** 任务执行器 */
  executor?: TaskExecutor
}

export type TaskExecutor = (task: Task, signal: AbortSignal) => Promise<unknown>

interface TaskWithController extends Task {
  abortController?: AbortController
}

/**
 * 任务管理器
 */
export class TaskManager {
  private tasks = new Map<string, TaskWithController>()
  private queue: string[] = []
  private running = new Set<string>()
  private maxConcurrent: number
  private timeout: number
  private executor: TaskExecutor | null = null

  constructor(options: TaskManagerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 5
    this.timeout = options.timeout ?? 300000 // 5 分钟默认超时
    if (options.executor) {
      this.executor = options.executor
    }
  }

  /**
   * 设置任务执行器
   */
  setExecutor(executor: TaskExecutor): void {
    this.executor = executor
  }

  /**
   * 创建任务
   */
  createTask(config: TaskConfig): Task {
    const task: TaskWithController = {
      id: randomUUID(),
      sessionId: config.sessionId,
      type: config.type,
      name: config.name || `${config.type}-${Date.now()}`,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      config: config.config,
    }

    this.tasks.set(task.id, task)
    this.queue.push(task.id)
    this.processQueue()

    return task
  }

  /**
   * 处理任务队列
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const taskId = this.queue.shift()
      if (taskId && this.tasks.has(taskId)) {
        this.startTask(taskId)
      }
    }
  }

  /**
   * 启动任务
   */
  private async startTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'pending') return

    task.status = 'running'
    task.startedAt = Date.now()
    this.running.add(taskId)

    const abortController = new AbortController()
    task.abortController = abortController

    // 设置超时
    const timeoutId = setTimeout(() => {
      if (task.status === 'running') {
        this.cancelTask(taskId)
      }
    }, this.timeout)

    try {
      if (!this.executor) {
        throw new Error('No task executor configured')
      }

      const result = await this.executor(task, abortController.signal)

      task.status = 'completed'
      task.result = result
      task.progress = 100

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        task.status = 'cancelled'
      } else {
        task.status = 'failed'
        task.error = error instanceof Error ? error.message : String(error)
      }
    } finally {
      clearTimeout(timeoutId)
      task.completedAt = Date.now()
      task.abortController = undefined
      this.running.delete(taskId)
      this.processQueue()
    }
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    // 如果在队列中，直接移除
    const queueIndex = this.queue.indexOf(taskId)
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1)
      task.status = 'cancelled'
      task.completedAt = Date.now()
      return true
    }

    // 如果正在运行，中止
    if (task.abortController) {
      task.abortController.abort()
      return true
    }

    return false
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取任务列表
   */
  listTasks(sessionId?: string): Task[] {
    const tasks = Array.from(this.tasks.values())
    if (sessionId) {
      return tasks.filter(t => t.sessionId === sessionId)
    }
    return tasks
  }

  /**
   * 获取运行中的任务
   */
  getRunningTasks(sessionId?: string): Task[] {
    const tasks = this.listTasks(sessionId)
    return tasks.filter(t => t.status === 'running')
  }

  /**
   * 获取挂起的任务
   */
  getPendingTasks(sessionId?: string): Task[] {
    const tasks = this.listTasks(sessionId)
    return tasks.filter(t => t.status === 'pending')
  }

  /**
   * 等待任务完成
   */
  async waitForTask(taskId: string, timeout?: number): Promise<Task> {
    const deadline = timeout ? Date.now() + timeout : Infinity

    while (Date.now() < deadline) {
      const task = this.tasks.get(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        return task
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    throw new Error(`Task wait timeout: ${taskId}`)
  }

  /**
   * 清理已完成的任务
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now()
    for (const [taskId, task] of this.tasks) {
      if (task.completedAt && now - task.completedAt > maxAge) {
        this.tasks.delete(taskId)
      }
    }
  }

  /**
   * 清理会话的所有任务
   */
  cleanupSession(sessionId: string): void {
    for (const [taskId, task] of this.tasks) {
      if (task.sessionId === sessionId) {
        this.cancelTask(taskId)
        this.tasks.delete(taskId)
      }
    }
    // 从队列中移除
    this.queue = this.queue.filter(id => {
      const task = this.tasks.get(id)
      return task && task.sessionId !== sessionId
    })
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
  } {
    const tasks = Array.from(this.tasks.values())
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    }
  }
}

// 导出默认实例
export const taskManager = new TaskManager()
