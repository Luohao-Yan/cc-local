/**
 * Context Collapse — projection mechanism that replaces ranges of messages
 * in the conversation with compressed summaries, reducing token count before
 * sending to the API.
 *
 * Design: heuristic-only summarization (no model calls). Tool-use cycles
 * get a first-5-lines summary; text messages get first-paragraph (200 chars).
 * Collapsed spans are committed lazily and projected via projectView().
 */

import type { Message, UserMessage } from '../../types/message.js'
import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from '../../types/logs.js'
import { logForDebugging } from '../../utils/debug.js'
import { tokenCountWithEstimation } from '../../utils/tokens.js'
import {
  getEffectiveContextWindowSize,
} from '../compact/autoCompact.js'
import { projectView, stageCollapses } from './operations.js'
import { summarizeToolCycle, summarizeText } from './summarize.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CollapseSpan = {
  /** Unique ID for this span (monotonically increasing, 16-digit string). */
  collapseId: string
  /** UUID of the first archived message. */
  firstArchivedUuid: string
  /** UUID of the last archived message. */
  lastArchivedUuid: string
  /** Heuristic summary replacing the archived messages. */
  summary: string
  /** Risk score 0-1 (higher = more information loss). */
  risk: number
  /** Timestamp when staged. */
  stagedAt: number
  /** The messages that were archived (kept for local use, not persisted). */
  archived: Message[]
}

export type CommittedCollapse = {
  collapseId: string
  firstArchivedUuid: string
  lastArchivedUuid: string
  summary: string
  summaryUuid: string
  summaryContent: string
  archived: Message[]
}

export type ContextCollapseStats = {
  collapsedSpans: number
  stagedSpans: number
  collapsedMessages: number
  health: {
    totalErrors: number
    totalEmptySpawns: number
    totalSpawns: number
    emptySpawnWarningEmitted: boolean
    lastError?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

type CollapseStore = {
  staged: CollapseSpan[]
  committed: CommittedCollapse[]
  health: {
    totalErrors: number
    totalEmptySpawns: number
    totalSpawns: number
    emptySpawnWarningEmitted: boolean
    lastError?: string
  }
  subscribers: Set<() => void>
  nextId: number
  initialized: boolean
}

let store: CollapseStore = createEmptyStore()

function createEmptyStore(): CollapseStore {
  return {
    staged: [],
    committed: [],
    health: {
      totalErrors: 0,
      totalEmptySpawns: 0,
      totalSpawns: 0,
      emptySpawnWarningEmitted: false,
    },
    subscribers: new Set(),
    nextId: 1,
    initialized: false,
  }
}

function nextCollapseId(): string {
  const id = String(store.nextId).padStart(16, '0')
  store.nextId++
  return id
}

function notifySubscribers(): void {
  for (const fn of store.subscribers) {
    try {
      fn()
    } catch {
      // Subscriber errors should not break collapse
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isContextCollapseEnabled(): boolean {
  return true
}

export function initContextCollapse(): void {
  store = createEmptyStore()
  store.initialized = true
  logForDebugging('contextCollapse: initialized')
}

export function resetContextCollapse(): void {
  store = createEmptyStore()
  notifySubscribers()
  logForDebugging('contextCollapse: reset')
}

export function getStats(): ContextCollapseStats {
  const totalMessages = store.committed.reduce(
    (sum, c) => sum + c.archived.length,
    0,
  )
  return {
    collapsedSpans: store.committed.length,
    stagedSpans: store.staged.length,
    collapsedMessages: totalMessages,
    health: { ...store.health },
  }
}

export function subscribe(onStoreChange: () => void): () => void {
  store.subscribers.add(onStoreChange)
  return () => {
    store.subscribers.delete(onStoreChange)
  }
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

export async function applyCollapsesIfNeeded(
  messages: Message[],
  _toolUseContext: unknown,
  _querySource: unknown,
): Promise<{ messages: Message[] }> {
  if (!store.initialized) {
    return { messages }
  }

  // Step 1: Apply already-committed spans via projectView
  let projected = projectView(messages, store.committed)

  // Step 2: Check if still over budget
  const model = getModelFromContext(_toolUseContext)
  const budget = model ? getEffectiveContextWindowSize(model) : 200_000
  const currentTokens = tokenCountWithEstimation(projected)

  if (currentTokens > budget * 0.85) {
    logForDebugging(
      `contextCollapse: over budget (${currentTokens} > ${Math.round(budget * 0.85)}), staging collapses`,
    )
    store.health.totalSpawns++
    const newSpans = stageCollapses(messages, budget * 0.6, store.committed)

    if (newSpans.length === 0) {
      store.health.totalEmptySpawns++
      if (store.health.totalEmptySpawns >= 3) {
        store.health.emptySpawnWarningEmitted = true
      }
    } else {
      // Assign IDs and add to staged
      for (const span of newSpans) {
        span.collapseId = nextCollapseId()
        store.staged.push(span)
      }
    }

    // Commit staged spans and re-project
    commitStagedSpans()
    projected = projectView(messages, store.committed)
    notifySubscribers()
  }

  return { messages: projected }
}

export function isWithheldPromptTooLong(
  _message: unknown,
  isPromptTooLongMessage: (m: unknown) => boolean,
  _querySource: unknown,
): boolean {
  // If prompt is too long and we have staged spans to commit,
  // we can still recover — so only return true if there's nothing left to commit.
  if (!isPromptTooLongMessage(_message)) {
    return false
  }
  // If there are staged spans, we can still try to drain them.
  // Return true only when we've exhausted all collapse options.
  return store.staged.length === 0 && store.committed.length > 0
}

export function recoverFromOverflow(
  messages: Message[],
  _querySource: unknown,
): { messages: Message[]; committed: number } {
  if (!store.initialized) {
    return { messages, committed: 0 }
  }

  // Commit all staged spans immediately
  const committedCount = store.staged.length
  commitStagedSpans()

  const projected = projectView(messages, store.committed)
  notifySubscribers()

  logForDebugging(
    `contextCollapse: recovered from overflow, committed ${committedCount} spans`,
  )

  return { messages: projected, committed: committedCount }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function commitStagedSpans(): void {
  for (const span of store.staged) {
    const summaryUuid = `collapse-summary-${span.collapseId}`
    const summaryContent = `<collapsed id="${span.collapseId}">${span.summary}</collapsed>`

    store.committed.push({
      collapseId: span.collapseId,
      firstArchivedUuid: span.firstArchivedUuid,
      lastArchivedUuid: span.lastArchivedUuid,
      summary: span.summary,
      summaryUuid,
      summaryContent,
      archived: span.archived,
    })
  }
  store.staged = []
}

function getModelFromContext(toolUseContext: unknown): string | null {
  // Try to extract model name from toolUseContext for budget calculation
  if (toolUseContext && typeof toolUseContext === 'object') {
    const ctx = toolUseContext as Record<string, unknown>
    if (ctx.options && typeof ctx.options === 'object') {
      const opts = ctx.options as Record<string, unknown>
      if (typeof opts.mainLoopModel === 'string') {
        return opts.mainLoopModel
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Persist / Restore (used by persist.ts)
// ---------------------------------------------------------------------------

export function getCommittedSpans(): CommittedCollapse[] {
  return store.committed
}

export function getStagedSpans(): CollapseSpan[] {
  return store.staged
}

export function getSnapshotData(): ContextCollapseSnapshotEntry['staged'] {
  return store.staged.map((s) => ({
    startUuid: s.firstArchivedUuid,
    endUuid: s.lastArchivedUuid,
    summary: s.summary,
    risk: s.risk,
    stagedAt: s.stagedAt,
  }))
}

export function getArmedState(): boolean {
  return store.health.totalSpawns > 0
}

export function getLastSpawnTokens(): number {
  return store.health.totalSpawns
}

export function restoreFromCommitted(
  entries: ContextCollapseCommitEntry[],
): void {
  for (const entry of entries) {
    store.committed.push({
      collapseId: entry.collapseId,
      firstArchivedUuid: entry.firstArchivedUuid,
      lastArchivedUuid: entry.lastArchivedUuid,
      summary: entry.summary,
      summaryUuid: entry.summaryUuid,
      summaryContent: entry.summaryContent,
      archived: [], // Archive is lazy-filled by projectView on next call
    })
    // Bump ID counter past any persisted IDs
    const numericId = parseInt(entry.collapseId, 10)
    if (!isNaN(numericId) && numericId >= store.nextId) {
      store.nextId = numericId + 1
    }
  }
  notifySubscribers()
  logForDebugging(
    `contextCollapse: restored ${entries.length} committed spans from entries`,
  )
}

export function restoreFromSnapshot(
  snapshot: ContextCollapseSnapshotEntry,
): void {
  // Convert snapshot staged spans back to CollapseSpan objects
  for (const staged of snapshot.staged) {
    store.staged.push({
      collapseId: nextCollapseId(),
      firstArchivedUuid: staged.startUuid,
      lastArchivedUuid: staged.endUuid,
      summary: staged.summary,
      risk: staged.risk,
      stagedAt: staged.stagedAt,
      archived: [], // Lazy-filled by projectView
    })
  }
  notifySubscribers()
  logForDebugging(
    `contextCollapse: restored ${snapshot.staged.length} staged spans from snapshot`,
  )
}

// Re-export operations for direct access
export { projectView, stageCollapses } from './operations.js'
