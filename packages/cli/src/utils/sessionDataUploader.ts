/**
 * Stub for internal-only session data uploader module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export type SessionTurnUploader = (messages: unknown[]) => void

export function createSessionTurnUploader(): SessionTurnUploader | null {
  return null
}
