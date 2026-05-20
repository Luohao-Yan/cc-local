/**
 * Snip Projection — view layer for snipped messages.
 *
 * Provides a projected view of the message list where snipped-away
 * rounds appear as a compact placeholder. This is used by the UI
 * to show "N rounds trimmed" instead of rendering each removed message.
 */

import type { Message } from '../../types/message.js'
import { isSnipMarkerMessage } from './snipCompact.js'

/**
 * Check if a message is a snip boundary (same check as snipCompact
 * but from the projection module's perspective).
 */
export function isSnipBoundaryMessage(message: Message): boolean {
  return isSnipMarkerMessage(message)
}

/**
 * Project a "snipped view" of the messages for UI rendering.
 * Messages before the first snip boundary marker are collapsed
 * into a single placeholder entry.
 *
 * If no snip boundary exists, returns the messages unchanged.
 */
export function projectSnippedView<T extends Message>(messages: T[]): T[] {
  const firstSnipIndex = messages.findIndex((m) => isSnipBoundaryMessage(m))

  if (firstSnipIndex === -1) {
    return messages
  }

  // Everything from the first snip boundary onward is the active context
  return messages.slice(firstSnipIndex)
}
