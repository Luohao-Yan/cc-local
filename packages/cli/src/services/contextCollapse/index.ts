/** Stubs for context-collapse (feature-gated requires). */

import type { Message } from '../../types/message.js'

export type ContextCollapseStats = {
  collapsedSpans: number
  stagedSpans: number
  collapsedMessages: number
  health: {
    totalErrors: number
    totalEmptySpawns: number
    totalSpawns: number
    emptySpawnWarningEmitted: boolean
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function initContextCollapse(): void {}

export function resetContextCollapse(): void {}

export function isContextCollapseEnabled(): boolean {
  return false
}

export function getStats(): ContextCollapseStats {
  return {
    collapsedSpans: 0,
    stagedSpans: 0,
    collapsedMessages: 0,
    health: {
      totalErrors: 0,
      totalEmptySpawns: 0,
      totalSpawns: 0,
      emptySpawnWarningEmitted: false,
    },
  }
}

export function subscribe(_onStoreChange: () => void): () => void {
  return () => {}
}

export async function applyCollapsesIfNeeded(
  messages: Message[],
  _toolUseContext: unknown,
  _querySource: unknown,
): Promise<{ messages: Message[] }> {
  return { messages }
}

export function isWithheldPromptTooLong(
  _message: unknown,
  _isPromptTooLongMessage: (m: unknown) => boolean,
  _querySource: unknown,
): boolean {
  return false
}

export function recoverFromOverflow(
  messages: Message[],
  _querySource: unknown,
): { messages: Message[]; committed: number } {
  return { messages, committed: 0 }
}
