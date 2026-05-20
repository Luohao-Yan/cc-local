/**
 * Context Collapse operations — projectView and stageCollapses.
 *
 * projectView: walks the messages array and replaces committed spans with
 * synthetic user messages containing the summary text.
 *
 * stageCollapses: identifies older tool-use cycles to collapse, creating
 * CollapseSpan objects with heuristic summaries.
 */

import type { Message, UserMessage } from '../../types/message.js'
import type { CommittedCollapse, CollapseSpan } from './index.js'
import { getCommittedSpans } from './index.js'
import { summarizeToolCycle, summarizeText } from './summarize.js'
import { logForDebugging } from '../../utils/debug.js'
import { tokenCountWithEstimation } from '../../utils/tokens.js'

// ---------------------------------------------------------------------------
// projectView
// ---------------------------------------------------------------------------

/**
 * Apply committed collapse spans to produce a projected view of messages.
 * Messages within a committed span are replaced by a single synthetic user
 * message containing the summary. Messages outside any span are preserved
 * unchanged.
 */
export function projectView(
  messages: Message[],
  committed?: CommittedCollapse[],
): Message[] {
  const spans = committed ?? getCommittedSpans()
  if (spans.length === 0) {
    return messages
  }

  // Build a set of UUIDs that are archived (hidden) in some committed span
  const archivedUuids = new Set<string>()
  // Map: firstArchivedUuid -> CommittedCollapse (for ordering)
  const spanStarts = new Map<string, CommittedCollapse>()

  for (const span of spans) {
    spanStarts.set(span.firstArchivedUuid, span)
    // We need to find all messages in the range [firstArchivedUuid, lastArchivedUuid]
    // and mark them as archived. Walk the messages array to do this.
  }

  // First pass: identify which messages are inside any committed span
  // A message is archived if it falls within [firstArchivedUuid, lastArchivedUuid]
  // for any committed span.
  const messageUuidSet = new Set(messages.map((m) => m.uuid))

  // For each committed span, find indices of first and last archived messages
  // and mark all messages between them as archived.
  const archivedIndices = new Set<number>()

  for (const span of spans) {
    const firstIdx = messages.findIndex((m) => m.uuid === span.firstArchivedUuid)
    const lastIdx = messages.findIndex((m) => m.uuid === span.lastArchivedUuid)

    if (firstIdx === -1 || lastIdx === -1) {
      // Messages not found (e.g. after compaction removed them); skip span
      continue
    }

    const lo = Math.min(firstIdx, lastIdx)
    const hi = Math.max(firstIdx, lastIdx)
    for (let i = lo; i <= hi; i++) {
      archivedIndices.add(i)
    }
  }

  // Second pass: build projected array
  const result: Message[] = []
  let i = 0

  while (i < messages.length) {
    if (archivedIndices.has(i)) {
      // Find which span starts at or covers this index
      const span = findSpanForIndex(messages, i, committed, archivedIndices)
      if (span) {
        // Emit synthetic summary message
        const syntheticMessage = createSummaryMessage(span)
        result.push(syntheticMessage)

        // Skip past all archived messages for this span
        const firstIdx = messages.findIndex(
          (m) => m.uuid === span.firstArchivedUuid,
        )
        const lastIdx = messages.findIndex(
          (m) => m.uuid === span.lastArchivedUuid,
        )
        const lo = Math.min(firstIdx, lastIdx)
        const hi = Math.max(firstIdx, lastIdx)

        // Skip to the message after the last archived one
        i = hi + 1
        continue
      }
      // No matching span found (shouldn't happen), just skip
      i++
      continue
    }

    // Not archived — keep as-is
    result.push(messages[i])
    i++
  }

  return result
}

function findSpanForIndex(
  messages: Message[],
  idx: number,
  committed: CommittedCollapse[],
  archivedIndices: Set<number>,
): CommittedCollapse | null {
  for (const span of spans) {
    const firstIdx = messages.findIndex(
      (m) => m.uuid === span.firstArchivedUuid,
    )
    const lastIdx = messages.findIndex(
      (m) => m.uuid === span.lastArchivedUuid,
    )

    if (firstIdx === -1 || lastIdx === -1) continue

    const lo = Math.min(firstIdx, lastIdx)
    const hi = Math.max(firstIdx, lastIdx)

    if (idx >= lo && idx <= hi) {
      return span
    }
  }
  return null
}

function createSummaryMessage(span: CommittedCollapse): UserMessage {
  return {
    type: 'user',
    uuid: span.summaryUuid,
    timestamp: Date.now(),
    message: {
      role: 'user',
      content: span.summaryContent,
    },
    isMeta: true,
    isVirtual: true,
  }
}

// ---------------------------------------------------------------------------
// stageCollapses
// ---------------------------------------------------------------------------

/**
 * Identify older tool-use cycles to collapse. A "tool-use cycle" is a pair
 * of assistant message containing a tool_use block, followed by a user
 * message containing the corresponding tool_result.
 *
 * Strategy:
 * - Skip the most recent 4 cycles (likely still relevant)
 * - Skip cycles whose tool_result is very short (likely still useful)
 * - Collapse remaining older cycles into CollapseSpan objects
 * - Stop adding spans once projected token count would be under budget
 */
export function stageCollapses(
  messages: Message[],
  budget: number,
  existingCommitted: CommittedCollapse[],
): CollapseSpan[] {
  const spans: CollapseSpan[] = []

  // Build tool-use cycle pairs: [(assistantIdx, userIdx, toolName, resultContent)]
  const cycles = extractToolUseCycles(messages)
  if (cycles.length === 0) {
    return spans
  }

  // Don't collapse the most recent cycles (still likely in active context)
  const recentToKeep = 4
  const candidates = cycles.slice(0, Math.max(0, cycles.length - recentToKeep))

  // Process from oldest first (most savings)
  let runningTokens = tokenCountWithEstimation(
    projectView(messages, existingCommitted),
  )

  for (const cycle of candidates) {
    if (runningTokens <= budget) break

    const summary = summarizeToolCycle(cycle.toolName, cycle.resultContent)
    const risk = computeRisk(cycle)

    // Find the range of messages to collapse: the assistant message with tool_use
    // through the user message with tool_result
    const firstMsg = messages[cycle.assistantIdx]
    const lastMsg = messages[cycle.userIdx]
    if (!firstMsg || !lastMsg) continue

    const archivedMessages = messages.slice(
      cycle.assistantIdx,
      cycle.userIdx + 1,
    )

    spans.push({
      collapseId: '', // Assigned by caller
      firstArchivedUuid: firstMsg.uuid,
      lastArchivedUuid: lastMsg.uuid,
      summary,
      risk,
      stagedAt: Date.now(),
      archived: archivedMessages,
    })

    // Rough estimate: each collapsed span saves ~ (original - summary) tokens
    const originalTokens = tokenCountWithEstimation(archivedMessages)
    const summaryTokens = Math.ceil(summary.length / 4) // rough char-to-token
    runningTokens -= (originalTokens - summaryTokens)
  }

  logForDebugging(
    `contextCollapse: stageCollapses identified ${spans.length} candidate spans`,
  )
  return spans
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ToolUseCycle = {
  assistantIdx: number
  userIdx: number
  toolName: string
  resultContent: string
}

function extractToolUseCycles(messages: Message[]): ToolUseCycle[] {
  const cycles: ToolUseCycle[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.type !== 'assistant') continue

    const content = msg.message?.content
    if (!Array.isArray(content)) continue

    // Find tool_use blocks in this assistant message
    for (const block of content) {
      if (
        block &&
        typeof block === 'object' &&
        'type' in block &&
        block.type === 'tool_use' &&
        'name' in block &&
        typeof block.name === 'string' &&
        'id' in block
      ) {
        const toolName = block.name
        const toolUseId = block.id

        // Find the corresponding tool_result in a subsequent user message
        for (let j = i + 1; j < messages.length; j++) {
          const userMsg = messages[j]
          if (userMsg.type !== 'user') continue

          const userContent = userMsg.message?.content
          if (!Array.isArray(userContent)) continue

          for (const userBlock of userContent) {
            if (
              userBlock &&
              typeof userBlock === 'object' &&
              'type' in userBlock &&
              userBlock.type === 'tool_result' &&
              'tool_use_id' in userBlock &&
              userBlock.tool_use_id === toolUseId
            ) {
              const resultContent = extractToolResultContent(userBlock)
              cycles.push({
                assistantIdx: i,
                userIdx: j,
                toolName,
                resultContent,
              })
              break
            }
          }
          break // Only look at the first user message after the assistant
        }
      }
    }
  }

  return cycles
}

function extractToolResultContent(block: unknown): string {
  if (!block || typeof block !== 'object') return ''
  const b = block as Record<string, unknown>

  if (typeof b.content === 'string') return b.content
  if (Array.isArray(b.content)) {
    return b.content
      .map((c: unknown) => {
        if (typeof c === 'string') return c
        if (c && typeof c === 'object' && 'text' in c && typeof (c as Record<string, unknown>).text === 'string') {
          return (c as Record<string, unknown>).text as string
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function computeRisk(cycle: ToolUseCycle): number {
  // Higher risk for write tools (file edits, bash) — their results
  // may be needed for subsequent operations.
  const writeTools = new Set([
    'FileEdit',
    'FileWrite',
    'NotebookEdit',
    'Bash',
    'PowerShell',
  ])
  if (writeTools.has(cycle.toolName)) return 0.7

  // Lower risk for read-only tools
  const readTools = new Set([
    'FileRead',
    'Glob',
    'Grep',
    'LSP',
    'WebFetch',
    'WebSearch',
    'CtxInspect',
  ])
  if (readTools.has(cycle.toolName)) return 0.2

  // Medium risk for everything else
  return 0.4
}
