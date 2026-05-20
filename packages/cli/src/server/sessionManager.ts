/**
 * Stub for internal-only session manager module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export class SessionManager {
  constructor(_backend: unknown, _opts?: { idleTimeoutMs?: number; maxSessions?: number }) {}
  async destroyAll(): Promise<void> {}
}
