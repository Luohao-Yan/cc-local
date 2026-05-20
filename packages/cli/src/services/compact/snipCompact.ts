/**
 * Snip Compact — emergency history truncation.
 *
 * When autocompact and reactive compact can't shrink the context enough
 * (e.g., prompt-too-long persists after compaction), snip compact
 * forcibly removes the oldest API rounds from the conversation.
 *
 * This is a last-resort measure — the model loses access to those
 * messages entirely, unlike normal compaction which summarizes them.
 *
 * Unlike the ANT-only gated version, this is always available.
 */

import type { Message } from '../../types/message.js'
import { groupMessagesByApiRound } from './grouping.js'

export const SNIP_NUDGE_TEXT =
  'Some earlier messages were removed to fit the context window. Key information may be missing — ask the user if you need details from before.'

/** Whether snip compact is enabled at runtime. Always true in cc-local. */
export function isSnipRuntimeEnabled(): boolean {
  return true
}

/**
 * Check if a message is a snip boundary marker
 * (the system message we insert to tell the model history was trimmed).
 */
export function isSnipMarkerMessage(message: Message): boolean {
  if (message.type !== 'user' || !Array.isArray(message.message.content)) {
    return false
  }
  return message.message.content.some(
    (block) =>
      block.type === 'text' &&
      typeof block.text === 'string' &&
      block.text.includes('Some earlier messages were removed'),
  )
}

/**
 * Determine if we should nudge the model about snipped history.
 * Only nudge once per session (when a snip boundary exists but no
 * nudge has been emitted yet in the current message list).
 */
export function shouldNudgeForSnips(messages: Message[]): boolean {
  return messages.some((m) => isSnipMarkerMessage(m))
}

/**
 * Snip (forcibly remove) the oldest API rounds from the message history.
 *
 * @param messages - Current message list
 * @param opts.force - Force snipping even if only 1 round remains
 * @returns Snip result with trimmed messages and token-freed estimate
 */
export function snipCompactIfNeeded(
  messages: Message[],
  opts?: { force?: boolean },
): {
  messages: Message[]
  tokensFreed: number
  boundaryMessage?: Message
} {
  const force = opts?.force ?? false

  if (messages.length < 4) {
    return { messages, tokensFreed: 0 }
  }

  const rounds = groupMessagesByApiRound(messages)

  if (rounds.length < 2 && !force) {
    // Need at least 2 rounds to snip one and keep one
    return { messages, tokensFreed: 0 }
  }

  // Remove the oldest 1-2 rounds (keep at least 1 if not forced)
  const roundsToRemove = force ? 1 : Math.min(2, rounds.length - 1)
  if (roundsToRemove < 1) {
    return { messages, tokensFreed: 0 }
  }

  const removedMessages = rounds.slice(0, roundsToRemove).flat()
  const keptMessages = rounds.slice(roundsToRemove).flat()

  // Rough token estimate: ~4 chars/token for removed content
  const charsRemoved = removedMessages.reduce((sum, msg) => {
    if (!Array.isArray(msg.message.content)) return sum
    for (const block of msg.message.content) {
      if (block.type === 'text') sum += (block as { text: string }).text.length
      if (block.type === 'tool_result') {
        const content = (block as { content: unknown }).content
        sum +=
          typeof content === 'string'
            ? content.length
            : JSON.stringify(content ?? '').length
      }
      if (block.type === 'tool_use') {
        sum += JSON.stringify(
          (block as { input: unknown }).input ?? {},
        ).length
      }
    }
    return sum
  }, 0)

  const tokensFreed = Math.ceil(charsRemoved / 4)

  // Insert a boundary marker at the start
  const boundaryMessage: Message = {
    type: 'user',
    message: {
      id: `snip-boundary-${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text: SNIP_NUDGE_TEXT }],
      timestamp: new Date().toISOString(),
    },
  } as unknown as Message

  return {
    messages: [boundaryMessage, ...keptMessages],
    tokensFreed,
    boundaryMessage,
  }
}
