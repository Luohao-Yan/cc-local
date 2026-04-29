/**
 * Analytics Service - Lightweight telemetry stub
 *
 * Provides event logging and metrics collection.
 * No data is sent externally — events are stored locally.
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const ANALYTICS_DIR = join(homedir(), '.cclocal', 'analytics')
const EVENTS_FILE = join(ANALYTICS_DIR, 'events.jsonl')

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, unknown>
  timestamp?: number
  sessionId?: string
}

let enabled = true

export function setAnalyticsEnabled(value: boolean): void {
  enabled = value
}

export async function logEvent(event: AnalyticsEvent): Promise<void> {
  if (!enabled) return

  const record = {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  }

  try {
    if (!existsSync(ANALYTICS_DIR)) {
      mkdirSync(ANALYTICS_DIR, { recursive: true })
    }
    appendFileSync(EVENTS_FILE, JSON.stringify(record) + '\n', 'utf-8')
  } catch {
    // Analytics should never block execution
  }
}

export async function logToolUsage(toolName: string, durationMs: number, sessionId?: string): Promise<void> {
  await logEvent({
    name: 'tool_usage',
    properties: { toolName, durationMs },
    sessionId,
  })
}

export async function logQueryMetrics(
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  model: string,
  sessionId?: string
): Promise<void> {
  await logEvent({
    name: 'query_complete',
    properties: { inputTokens, outputTokens, durationMs, model },
    sessionId,
  })
}
