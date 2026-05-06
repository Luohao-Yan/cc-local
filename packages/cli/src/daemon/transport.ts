/**
 * Daemon Transport - WebSocket + Lock File (与官方 IdeServer 一致)
 *
 * 架构：
 * - Daemon 启动时在随机端口创建 WebSocket 服务器
 * - 将连接信息写入 ~/.claude/daemon.lock 文件
 * - CLI 客户端通过读取 lock 文件发现端口并连接
 */

import { join } from 'node:path'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'

// ============================================================================
// Constants
// ============================================================================

const DAEMON_LOCK_FILE = 'daemon.lock'
const DAEMON_LOGS_DIR = 'logs'

// ============================================================================
// Path Generation
// ============================================================================

/**
 * Get the daemon lock file path
 */
export function getDaemonLockPath(): string {
  return join(getClaudeConfigHomeDir(), DAEMON_LOCK_FILE)
}

/**
 * Get the daemon logs directory
 */
export function getDaemonLogsDir(): string {
  return join(getClaudeConfigHomeDir(), DAEMON_LOGS_DIR)
}

/**
 * Get the log file path for a specific session
 */
export function getSessionLogPath(sessionId: string): string {
  return join(getDaemonLogsDir(), `${sessionId}.log`)
}

/**
 * Get the sessions registry directory
 */
export function getSessionsRegistryDir(): string {
  return join(getClaudeConfigHomeDir(), 'sessions')
}

// ============================================================================
// Lock File Content Types
// ============================================================================

export interface DaemonLockContent {
  /** WebSocket port */
  port: number
  /** Daemon process ID */
  pid: number
  /** Started timestamp */
  startedAt: number
  /** Auth token for WebSocket connection */
  authToken: string
  /** WebSocket URL */
  url: string
}

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Environment variable for daemon fork detection
 */
export const ENV_DAEMON_FORKED = 'CLAUDE_DAEMON_FORKED'

/**
 * Environment variable for worker options
 */
export const ENV_WORKER_OPTIONS = 'CLAUDE_WORKER_OPTIONS'

/**
 * Environment variable for session kind
 */
export const ENV_SESSION_KIND = 'CLAUDE_CODE_SESSION_KIND'

/**
 * Environment variable for session name
 */
export const ENV_SESSION_NAME = 'CLAUDE_CODE_SESSION_NAME'

/**
 * Environment variable for session log path
 */
export const ENV_SESSION_LOG = 'CLAUDE_CODE_SESSION_LOG'
