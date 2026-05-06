/**
 * Daemon IPC Protocol - JSON-RPC 2.0 based message types
 * for communication between CLI client and daemon supervisor.
 */

// ============================================================================
// Request Types
// ============================================================================

export type StartParams = {
  cwd?: string
  name?: string
  agent?: string
}

export type StopParams = {
  sessionId?: string
}

export type StatusParams = {
  // empty
}

export type ListParams = {
  // empty
}

export type LogsParams = {
  sessionId: string
  follow?: boolean
  lines?: number
}

export type KillParams = {
  sessionId: string
}

export type RestartParams = {
  sessionId?: string
}

export type DaemonRequest =
  | { method: 'start'; params: StartParams }
  | { method: 'stop'; params: StopParams }
  | { method: 'status'; params: StatusParams }
  | { method: 'list'; params: ListParams }
  | { method: 'logs'; params: LogsParams }
  | { method: 'kill'; params: KillParams }
  | { method: 'restart'; params: RestartParams }

// ============================================================================
// Response Types
// ============================================================================

export type DaemonResponse<T = unknown> =
  | { result: T; error?: undefined; id?: number }
  | { result?: undefined; error: { code: number; message: string }; id?: number }

// ============================================================================
// Session Info
// ============================================================================

export type SessionStatus = 'running' | 'idle' | 'waiting' | 'stopped'

export interface SessionInfo {
  sessionId: string
  name?: string
  pid: number
  status: SessionStatus
  startedAt: number
  cwd: string
  agent?: string
  logPath: string
}

// ============================================================================
// Daemon Status
// ============================================================================

export interface DaemonStatus {
  version: string
  pid: number
  uptime: number
  sessions: number
  socketPath: string
  startedAt: number
}

// ============================================================================
// Error Codes
// ============================================================================

export const DaemonErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  DAEMON_NOT_RUNNING: -32001,
  SESSION_NOT_FOUND: -32002,
  SESSION_ALREADY_EXISTS: -32003,
} as const

export type DaemonErrorCodeType = typeof DaemonErrorCode[keyof typeof DaemonErrorCode]

// ============================================================================
// Helper Functions
// ============================================================================

export function createResponse<T>(result: T, id?: number): DaemonResponse<T> {
  return { result, id }
}

export function createError(
  code: number,
  message: string,
  id?: number,
): DaemonResponse<never> {
  return { error: { code, message }, id }
}

export function isDaemonRunningError(
  response: DaemonResponse,
): response is DaemonResponse<never> & { error: { code: -32001 } } {
  return 'error' in response && response.error?.code === DaemonErrorCode.DAEMON_NOT_RUNNING
}

// ============================================================================
// Type Guards
// ============================================================================

export function isStartRequest(req: DaemonRequest): req is DaemonRequest & { method: 'start' } {
  return req.method === 'start'
}

export function isStopRequest(req: DaemonRequest): req is DaemonRequest & { method: 'stop' } {
  return req.method === 'stop'
}

export function isLogsRequest(req: DaemonRequest): req is DaemonRequest & { method: 'logs' } {
  return req.method === 'logs'
}

export function isKillRequest(req: DaemonRequest): req is DaemonRequest & { method: 'kill' } {
  return req.method === 'kill'
}

export function isRestartRequest(req: DaemonRequest): req is DaemonRequest & { method: 'restart' } {
  return req.method === 'restart'
}
