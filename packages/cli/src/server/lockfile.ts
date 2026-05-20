/**
 * Stub for internal-only lockfile module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export interface ServerLock {
  pid: number
  port: number
  host: string
  httpUrl: string
  startedAt: number
}

export async function writeServerLock(_lock: ServerLock): Promise<void> {}
export async function removeServerLock(): Promise<void> {}
export async function probeRunningServer(): Promise<ServerLock | undefined> { return undefined }
