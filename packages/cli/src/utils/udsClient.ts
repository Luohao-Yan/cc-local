/** UDS client for live session discovery / send (BG_SESSIONS, SendMessageTool). */

export type LiveUdsSession = {
  kind?: string
  sessionId?: string
  [key: string]: unknown
}

export async function listAllLiveSessions(): Promise<LiveUdsSession[]> {
  return []
}

export async function sendToUdsSocket(_target: string, _message: string): Promise<void> {}
