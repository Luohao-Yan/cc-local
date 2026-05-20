/**
 * Stub for internal-only server log module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export interface ServerLogger {
  log(msg: string): void
}

export function createServerLogger(): ServerLogger {
  return { log(_msg: string) {} }
}
