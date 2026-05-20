/**
 * Stub for internal-only server module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export interface ServerConfig {
  port: number
  host: string
  authToken: string
  unix?: string
  workspace?: string
  idleTimeoutMs: number
  maxSessions: number
}

export interface ServerInstance {
  port?: number
  stop(graceful?: boolean): void
}

export function startServer(_config: ServerConfig, _sessionManager: unknown, _logger: unknown): ServerInstance {
  return { port: 0, stop() {} }
}
