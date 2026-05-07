/**
 * Task Summary utilities for background sessions
 *
 * Provides task tracking and summary generation for bg sessions.
 * Powers `claude ps` by keeping a periodic summary of what each
 * session is working on.
 */

import { randomUUID } from 'crypto'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import type { Message } from '../types/message.js'
import type { ToolUseContext } from '../Tool.js'
import type { SystemPrompt } from './systemPromptType.js'
import { getSessionId, getIsNonInteractiveSession } from '../bootstrap/state.js'
import { getCwd } from './cwd.js'
import { logForDebugging } from './debug.js'
import { extractTextContent } from './messages.js'
import { getClaudeConfigHomeDir } from './envUtils.js'
import { queryHaiku } from '../services/api/claude.js'

export interface TaskSummary {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt?: number
  result?: string
  error?: string
}

// ── in-memory store ────────────────────────────────────────────────────

const summaries = new Map<string, TaskSummary>()

// ── interval & throttle ────────────────────────────────────────────────

const MIN_INTERVAL_MS = 30_000 // at most one summary every 30s
let lastGeneratedAt = 0

/**
 * Whether enough time has elapsed since the last summary generation.
 * Throttled to avoid hammering the API on fast turns.
 */
export function shouldGenerateTaskSummary(): boolean {
  const now = Date.now()
  return now - lastGeneratedAt >= MIN_INTERVAL_MS
}

/**
 * Parameters accepted by maybeGenerateTaskSummary.
 */
export interface MaybeGenerateTaskSummaryParams {
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  toolUseContext: ToolUseContext
  forkContextMessages: Message[]
}

/**
 * Conditionally generate a task summary and persist it.
 *
 * Uses the small-fast model (via queryHaiku) to produce a one-line
 * summary of what the current turn is about, then stores it so
 * `claude ps` can read it.
 */
export async function maybeGenerateTaskSummary(
  params: MaybeGenerateTaskSummaryParams,
): Promise<void> {
  if (!shouldGenerateTaskSummary()) {
    return
  }

  lastGeneratedAt = Date.now()

  try {
    // Extract the last assistant message text for context
    const lastAssistant = params.forkContextMessages
      .filter(m => m.type === 'assistant')
      .at(-1)

    let activity = '(no activity yet)'
    if (lastAssistant && lastAssistant.type === 'assistant') {
      const text = extractTextContent(lastAssistant.message.content)
      activity = text.slice(0, 500)
    }

    const userPrompt = `Summarize what this Claude Code session is currently doing in one short sentence (max 80 chars). Focus on the task, not the tools.

Current activity: ${activity}
Working directory: ${getCwd()}

Summary:`

    // Use queryHaiku for fast, cheap inference (same as buddy observer)
    const controller = new AbortController()
    const result = await queryHaiku({
      systemPrompt: params.systemPrompt,
      userPrompt,
      signal: controller.signal,
      options: {
        querySource: 'task_summary',
        agents: [],
        isNonInteractiveSession: getIsNonInteractiveSession(),
        hasAppendSystemPrompt: false,
        mcpTools: [],
      },
    })

    const summaryText = extractTextContent(result.message.content).trim().slice(0, 120) || 'Working...'

    const sessionId = getSessionId()
    if (!sessionId) {
      return
    }

    const entry: TaskSummary = {
      id: randomUUID(),
      name: summaryText,
      status: 'running',
      startedAt: Date.now(),
    }

    summaries.set(sessionId, entry)
    setSessionTaskSummary(sessionId, entry)

    logForDebugging(`[taskSummary] generated: "${summaryText}"`)
  } catch (error) {
    // Non-critical — never block the main loop on summary failure
    logForDebugging(`[taskSummary] generation failed: ${error}`)
  }
}

// ── persistence helpers ──────────────────────────────────────────────────

function getSummaryDir(): string {
  return join(getClaudeConfigHomeDir(), 'sessions')
}

function setSessionTaskSummary(sessionId: string, summary: TaskSummary): void {
  try {
    const dir = getSummaryDir()
    mkdirSync(dir, { recursive: true })
    const filePath = join(dir, `${sessionId}.json`)
    writeFileSync(filePath, JSON.stringify(summary, null, 2))
  } catch {
    // best effort
  }
}

/**
 * Generate a summary of tasks completed in a session.
 */
export function generateTaskSummary(_sessionId: string): TaskSummary | null {
  const sessionId = getSessionId()
  if (!sessionId) return null
  return summaries.get(sessionId) ?? null
}

/**
 * Format a task summary for display.
 */
export function formatTaskSummary(summary: TaskSummary): string {
  const duration = summary.completedAt
    ? Math.round((summary.completedAt - summary.startedAt) / 1000)
    : Math.round((Date.now() - summary.startedAt) / 1000)

  const status = summary.status === 'running' ? '⏳' : summary.status === 'completed' ? '✅' : '❌'
  return `${status} ${summary.name} (${duration}s)`
}

/**
 * Get all task summaries for a session.
 */
export function getSessionTaskSummaries(_sessionId: string): TaskSummary[] {
  const sessionId = getSessionId()
  if (!sessionId) return []
  const summary = summaries.get(sessionId)
  return summary ? [summary] : []
}

/**
 * Get all running task summaries (for `claude ps`).
 */
export function getAllRunningTaskSummaries(): TaskSummary[] {
  const result: TaskSummary[] = []
  const dir = getSummaryDir()

  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const content = readFileSync(join(dir, file), 'utf-8')
        const summary: TaskSummary = JSON.parse(content)
        if (summary.status === 'running') {
          result.push(summary)
        }
      } catch {
        // skip corrupted files
      }
    }
  } catch {
    // dir doesn't exist yet
  }

  return result
}
