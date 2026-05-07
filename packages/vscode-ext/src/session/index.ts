/**
 * Session Module - CCLocal VS Code Extension
 * Complete session lifecycle management
 */

// Types
export type {
  SessionStatus,
  SessionListItem,
  SessionDetail,
  SessionEventType,
  SessionEvent,
  SessionCreateOptions,
  SessionSearchQuery,
  SessionManagerStats,
  SessionTeleportOptions,
} from './types'

// Manager
export {
  SessionManager,
  getSessionManager,
  disposeSessionManager,
} from './SessionManager'

// Tree Provider
export { SessionTreeProvider, SessionTreeItem } from './SessionTreeProvider'

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Format session status for display
 */
export function formatSessionStatus(status: string): string {
  const map: Record<string, string> = {
    idle: 'Idle',
    running: 'Running...',
    paused: 'Paused',
    error: 'Error',
    loading: 'Loading...',
  }
  return map[status] || status
}

/**
 * Format relative time from timestamp
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * Get status color for theming
 */
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    idle: '#757575',
    running: '#2196F3',
    paused: '#FF9800',
    error: '#f44336',
    loading: '#2196F3',
  }
  return map[status] || '#757575'
}
