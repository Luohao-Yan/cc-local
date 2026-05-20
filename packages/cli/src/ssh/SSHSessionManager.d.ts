/**
 * Type declarations for the SSHSessionManager module.
 * This is an internal Anthropic feature that is disabled.
 */
export class SSHSessionManager {
  connect(options?: Record<string, unknown>): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  getSession(): unknown | null
}
