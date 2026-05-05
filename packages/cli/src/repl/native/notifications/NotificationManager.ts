/**
 * Notification Manager for Native REPL
 *
 * Manages transient notifications displayed in the terminal:
 * - API errors and rate limits
 * - MCP server status changes
 * - Update availability
 * - Permission changes
 * - Task status updates
 */

import chalk from 'chalk'

/**
 * Notification severity levels
 */
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success'

/**
 * Notification category
 */
export type NotificationCategory =
  | 'api'
  | 'rate_limit'
  | 'mcp'
  | 'update'
  | 'permission'
  | 'task'
  | 'system'

/**
 * Notification entry
 */
export interface Notification {
  /** Unique ID */
  id: string
  /** Notification message */
  message: string
  /** Severity level */
  severity: NotificationSeverity
  /** Category */
  category: NotificationCategory
  /** Creation timestamp */
  timestamp: number
  /** Auto-dismiss timeout in ms (0 = manual dismiss) */
  duration: number
  /** Whether the notification has been dismissed */
  dismissed: boolean
  /** Optional action label */
  actionLabel?: string
  /** Optional action callback */
  onAction?: () => void
}

/**
 * Notification manager options
 */
export interface NotificationManagerOptions {
  /** Maximum notifications to keep in memory */
  maxNotifications?: number
  /** Default auto-dismiss timeout (ms) */
  defaultDuration?: number
  /** Maximum visible notifications at once */
  maxVisible?: number
}

/**
 * Notification Manager class
 */
export class NotificationManager {
  private notifications: Notification[] = []
  private listeners: Set<() => void> = new Set()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private maxNotifications: number
  private defaultDuration: number
  private maxVisible: number

  constructor(options: NotificationManagerOptions = {}) {
    this.maxNotifications = options.maxNotifications ?? 100
    this.defaultDuration = options.defaultDuration ?? 5000
    this.maxVisible = options.maxVisible ?? 3
  }

  /**
   * Show a notification
   */
  show(
    message: string,
    severity: NotificationSeverity = 'info',
    category: NotificationCategory = 'system',
    duration?: number,
  ): Notification {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const actualDuration = duration ?? this.defaultDuration

    const notification: Notification = {
      id,
      message,
      severity,
      category,
      timestamp: Date.now(),
      duration: actualDuration,
      dismissed: false,
    }

    this.notifications.push(notification)

    // Enforce max
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(-this.maxNotifications)
    }

    // Auto-dismiss timer
    if (actualDuration > 0) {
      const timer = setTimeout(() => this.dismiss(id), actualDuration)
      this.timers.set(id, timer)
    }

    this.notifyListeners()
    return notification
  }

  /**
   * Dismiss a notification by ID
   */
  dismiss(id: string): boolean {
    const notif = this.notifications.find((n) => n.id === id)
    if (!notif || notif.dismissed) return false

    notif.dismissed = true

    // Clear timer
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }

    this.notifyListeners()
    return true
  }

  /**
   * Dismiss all active notifications
   */
  dismissAll(): void {
    for (const notif of this.notifications) {
      if (!notif.dismissed) {
        notif.dismissed = true
      }
    }

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()

    this.notifyListeners()
  }

  /**
   * Get all active (non-dismissed) notifications
   */
  getActive(): Notification[] {
    return this.notifications.filter((n) => !n.dismissed)
  }

  /**
   * Get visible notifications (limited count)
   */
  getVisible(): Notification[] {
    return this.getActive().slice(-this.maxVisible)
  }

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return [...this.notifications]
  }

  /**
   * Find notification by ID
   */
  get(id: string): Notification | undefined {
    return this.notifications.find((n) => n.id === id)
  }

  /**
   * Render active notifications as a string
   */
  render(): string {
    const visible = this.getVisible()
    if (visible.length === 0) return ''

    const lines: string[] = []

    for (const notif of visible) {
      lines.push(renderNotification(notif))
    }

    return lines.join('\n')
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Convenience: show API error
   */
  apiError(message: string, duration?: number): Notification {
    return this.show(message, 'error', 'api', duration ?? 0) // Don't auto-dismiss errors
  }

  /**
   * Convenience: show rate limit warning
   */
  rateLimit(waitSeconds: number): Notification {
    return this.show(
      `Rate limit reached. Wait ${waitSeconds}s before continuing.`,
      'warning',
      'rate_limit',
      waitSeconds * 1000 + 2000,
    )
  }

  /**
   * Convenience: show MCP status
   */
  mcpStatus(serverName: string, connected: boolean): Notification {
    return this.show(
      `MCP ${serverName}: ${connected ? 'connected' : 'disconnected'}`,
      connected ? 'success' : 'warning',
      'mcp',
      3000,
    )
  }

  /**
   * Convenience: show update available
   */
  updateAvailable(version: string): Notification {
    return this.show(
      `Update available: v${version}. Run /doctor to update.`,
      'info',
      'update',
      0,
    )
  }

  /**
   * Convenience: show permission change
   */
  permissionChange(mode: string): Notification {
    return this.show(
      `Permission mode changed to: ${mode}`,
      'info',
      'permission',
      3000,
    )
  }

  /**
   * Convenience: show task status
   */
  taskStatus(taskId: string, status: string): Notification {
    return this.show(
      `Task ${taskId}: ${status}`,
      status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'info',
      'task',
      4000,
    )
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

/**
 * Render a single notification
 */
function renderNotification(notif: Notification): string {
  const severityConfig: Record<NotificationSeverity, { icon: string; color: (s: string) => string }> = {
    info: { icon: 'ℹ', color: chalk.blue },
    warning: { icon: '⚠', color: chalk.yellow },
    error: { icon: '✗', color: chalk.red },
    success: { icon: '✓', color: chalk.green },
  }

  const config = severityConfig[notif.severity]
  const prefix = config.color(`${config.icon} `)
  const msg = notif.severity === 'error' ? chalk.red.bold(notif.message) : config.color(notif.message)

  const action = notif.actionLabel ? chalk.dim(` [${notif.actionLabel}]`) : ''

  return `${prefix}${msg}${action}`
}

/**
 * Create a notification manager instance
 */
export function createNotificationManager(options?: NotificationManagerOptions): NotificationManager {
  return new NotificationManager(options)
}
