/** History snip / compact helpers (feature-gated requires). */

import type { Message } from '../../types/message.js'

export const SNIP_NUDGE_TEXT = ''

export function isSnipRuntimeEnabled(): boolean {
  return false
}

export function isSnipMarkerMessage(_message: unknown): boolean {
  return false
}

export function shouldNudgeForSnips(_messages: Message[]): boolean {
  return false
}

export function snipCompactIfNeeded(
  messages: Message[],
  _opts?: { force?: boolean },
): {
  messages: Message[]
  tokensFreed: number
  boundaryMessage?: Message
} {
  return { messages, tokensFreed: 0 }
}
