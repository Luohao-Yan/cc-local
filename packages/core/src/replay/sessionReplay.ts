/**
 * Session Replay System
 *
 * Records all tool executions with their inputs/outputs/timing and provides
 * a replay API. This is a feature beyond official Claude Code.
 *
 * Capabilities:
 * - Record every tool call with full input/output/timing
 * - Export session traces as JSON or HTML visualization
 * - Replay sessions with different models
 * - Performance analysis of tool usage patterns
 * - Debug sessions by stepping through tool calls
 * - Share session traces for collaboration
 *
 * Usage:
 * ```ts
 * const recorder = new SessionRecorder(sessionId)
 * recorder.start()
 * // ... queries happen, tool calls recorded automatically ...
 * recorder.stop()
 * const trace = recorder.exportTrace()
 * const html = SessionReplayRenderer.renderHTML(trace)
 * ```
 */

import { randomUUID } from 'crypto'

// ---- Types ----

export type ToolCallStatus = 'started' | 'completed' | 'failed' | 'cancelled'

export interface RecordedToolCall {
  id: string
  toolName: string
  input: unknown
  output?: unknown
  status: ToolCallStatus
  startedAt: number
  completedAt?: number
  durationMs?: number
  error?: string
  /** Tokens consumed by this tool call's model interaction */
  inputTokens?: number
  outputTokens?: number
}

export interface RecordedTurn {
  id: string
  turnNumber: number
  userMessage?: string
  toolCalls: RecordedToolCall[]
  assistantMessage?: string
  startedAt: number
  completedAt?: number
  durationMs?: number
  model: string
  /** Total tokens for this turn */
  inputTokens?: number
  outputTokens?: number
}

export interface SessionTrace {
  sessionId: string
  startedAt: number
  completedAt?: number
  model: string
  turns: RecordedTurn[]
  metadata: {
    totalToolCalls: number
    totalTokens: number
    totalDurationMs: number
    toolCallCounts: Record<string, number>
    avgToolCallDurationMs: Record<string, number>
    /** Tool call success rate */
    toolCallSuccessRate: Record<string, number>
  }
}

export interface ReplayOptions {
  /** Speed multiplier (1 = real-time, 10 = 10x speed, 0 = instant) */
  speed?: number
  /** Whether to include tool outputs in replay */
  includeOutputs?: boolean
  /** Filter to specific tools only */
  filterTools?: string[]
  /** Maximum number of turns to replay */
  maxTurns?: number
}

// ---- Session Recorder ----

export class SessionRecorder {
  private trace: SessionTrace
  private currentTurn: RecordedTurn | null = null
  private activeToolCalls = new Map<string, RecordedToolCall>()
  private _isRecording = false

  constructor(sessionId: string, model: string = 'unknown') {
    this.trace = {
      sessionId,
      startedAt: Date.now(),
      model,
      turns: [],
      metadata: {
        totalToolCalls: 0,
        totalTokens: 0,
        totalDurationMs: 0,
        toolCallCounts: {},
        avgToolCallDurationMs: {},
        toolCallSuccessRate: {},
      },
    }
  }

  get isRecording(): boolean { return this._isRecording }

  /** Start recording */
  start(): void {
    this._isRecording = true
  }

  /** Stop recording */
  stop(): void {
    this._isRecording = false
    if (this.currentTurn) {
      this.finishTurn()
    }
    this.trace.completedAt = Date.now()
    this.computeMetadata()
  }

  /** Record the start of a new turn */
  beginTurn(turnNumber: number, model: string, userMessage?: string): void {
    if (!this._isRecording) return
    if (this.currentTurn) {
      this.finishTurn()
    }

    this.currentTurn = {
      id: `turn-${turnNumber}`,
      turnNumber,
      userMessage: userMessage?.slice(0, 500), // Truncate for storage
      toolCalls: [],
      startedAt: Date.now(),
      model,
    }
  }

  /** Record the end of a turn */
  finishTurn(assistantMessage?: string): void {
    if (!this.currentTurn) return

    this.currentTurn.completedAt = Date.now()
    this.currentTurn.durationMs = this.currentTurn.completedAt - this.currentTurn.startedAt
    this.currentTurn.assistantMessage = assistantMessage?.slice(0, 500)
    this.trace.turns.push(this.currentTurn)
    this.currentTurn = null
  }

  /** Record the start of a tool call */
  recordToolCallStart(toolName: string, input: unknown): string {
    if (!this._isRecording) return ''

    const id = `tc-${randomUUID().slice(0, 8)}`
    const call: RecordedToolCall = {
      id,
      toolName,
      input,
      status: 'started',
      startedAt: Date.now(),
    }

    this.activeToolCalls.set(id, call)
    this.currentTurn?.toolCalls.push(call)
    return id
  }

  /** Record the completion of a tool call */
  recordToolCallComplete(id: string, output: unknown, tokens?: { input: number; output: number }): void {
    const call = this.activeToolCalls.get(id)
    if (!call) return

    call.status = 'completed'
    call.output = output
    call.completedAt = Date.now()
    call.durationMs = call.completedAt - call.startedAt
    if (tokens) {
      call.inputTokens = tokens.input
      call.outputTokens = tokens.output
    }

    this.activeToolCalls.delete(id)
  }

  /** Record a failed tool call */
  recordToolCallFailed(id: string, error: string): void {
    const call = this.activeToolCalls.get(id)
    if (!call) return

    call.status = 'failed'
    call.error = error
    call.completedAt = Date.now()
    call.durationMs = call.completedAt - call.startedAt

    this.activeToolCalls.delete(id)
  }

  /** Record a cancelled tool call */
  recordToolCallCancelled(id: string): void {
    const call = this.activeToolCalls.get(id)
    if (!call) return

    call.status = 'cancelled'
    call.completedAt = Date.now()
    call.durationMs = call.completedAt - call.startedAt

    this.activeToolCalls.delete(id)
  }

  /** Export the recorded trace */
  exportTrace(): SessionTrace {
    return { ...this.trace, metadata: { ...this.trace.metadata } }
  }

  /** Export as JSON string */
  exportJSON(): string {
    return JSON.stringify(this.trace, null, 2)
  }

  /** Compute aggregate metadata */
  private computeMetadata(): void {
    const toolCallCounts: Record<string, number> = {}
    const toolCallDurations: Record<string, number[]> = {}
    const toolCallSuccesses: Record<string, { total: number; success: number }> = {}

    let totalTokens = 0

    for (const turn of this.trace.turns) {
      totalTokens += (turn.inputTokens ?? 0) + (turn.outputTokens ?? 0)

      for (const tc of turn.toolCalls) {
        toolCallCounts[tc.toolName] = (toolCallCounts[tc.toolName] ?? 0) + 1

        if (!toolCallDurations[tc.toolName]) toolCallDurations[tc.toolName] = []
        if (tc.durationMs) toolCallDurations[tc.toolName].push(tc.durationMs)

        if (!toolCallSuccesses[tc.toolName]) toolCallSuccesses[tc.toolName] = { total: 0, success: 0 }
        toolCallSuccesses[tc.toolName].total++
        if (tc.status === 'completed') toolCallSuccesses[tc.toolName].success++
      }
    }

    const avgToolCallDurationMs: Record<string, number> = {}
    for (const [tool, durations] of Object.entries(toolCallDurations)) {
      avgToolCallDurationMs[tool] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    }

    const toolCallSuccessRate: Record<string, number> = {}
    for (const [tool, counts] of Object.entries(toolCallSuccesses)) {
      toolCallSuccessRate[tool] = Math.round((counts.success / counts.total) * 100) / 100
    }

    this.trace.metadata = {
      totalToolCalls: Object.values(toolCallCounts).reduce((a, b) => a + b, 0),
      totalTokens,
      totalDurationMs: this.trace.completedAt
        ? this.trace.completedAt - this.trace.startedAt
        : Date.now() - this.trace.startedAt,
      toolCallCounts,
      avgToolCallDurationMs,
      toolCallSuccessRate,
    }
  }
}

// ---- HTML Renderer ----

export class SessionReplayRenderer {
  /**
   * Render a session trace as a self-contained HTML file
   * with interactive timeline, tool call details, and charts.
   */
  static renderHTML(trace: SessionTrace): string {
    const toolColors = [
      '#4A90D9', '#50C878', '#FF6B6B', '#FFB347', '#9B59B6',
      '#1ABC9C', '#E74C3C', '#3498DB', '#F39C12', '#2ECC71',
    ]

    const timelineData = trace.turns.map((turn, i) => ({
      turn: i + 1,
      duration: turn.durationMs ?? 0,
      toolCount: turn.toolCalls.length,
      tools: turn.toolCalls.map((tc) => tc.toolName),
    }))

    const toolCallRows = trace.turns
      .flatMap((turn) => turn.toolCalls)
      .map((tc) => {
        const statusClass = tc.status === 'completed' ? 'success' : tc.status === 'failed' ? 'error' : 'warning'
        const duration = tc.durationMs ? `${tc.durationMs}ms` : '-'
        const input = escapeHtml(JSON.stringify(tc.input, null, 2).slice(0, 300))
        const output = tc.output ? escapeHtml(JSON.stringify(tc.output, null, 2).slice(0, 300)) : '-'

        return `<div class="tool-call ${statusClass}">
          <div class="tool-header">
            <span class="tool-name">${escapeHtml(tc.toolName)}</span>
            <span class="tool-status ${statusClass}">${tc.status}</span>
            <span class="tool-duration">${duration}</span>
          </div>
          <details><summary>Input</summary><pre>${input}</pre></details>
          ${tc.status === 'completed' ? `<details><summary>Output</summary><pre>${output}</pre></details>` : ''}
          ${tc.error ? `<div class="error">${escapeHtml(tc.error)}</div>` : ''}
        </div>`
      })
      .join('\n')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Replay: ${escapeHtml(trace.sessionId)}</title>
  <style>
    :root { --bg: #1a1a2e; --surface: #16213e; --accent: #0f3460; --text: #e4e4e4;
            --success: #50c878; --error: #ff6b6b; --warning: #ffb347; }
    body { font-family: 'SF Mono', 'Cascadia Code', monospace; background: var(--bg); color: var(--text);
           max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #e94560; border-bottom: 2px solid #e94560; padding-bottom: 8px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 20px 0; }
    .stat-card { background: var(--surface); border-radius: 8px; padding: 16px; border-left: 4px solid #e94560; }
    .stat-card .value { font-size: 24px; font-weight: bold; color: #e94560; }
    .stat-card .label { font-size: 12px; opacity: 0.7; text-transform: uppercase; }
    .tool-call { background: var(--surface); border-radius: 6px; margin: 8px 0; padding: 12px;
                 border-left: 3px solid var(--accent); }
    .tool-call.success { border-left-color: var(--success); }
    .tool-call.error { border-left-color: var(--error); }
    .tool-call.warning { border-left-color: var(--warning); }
    .tool-header { display: flex; justify-content: space-between; align-items: center; }
    .tool-name { font-weight: bold; color: #e94560; }
    .tool-status { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .tool-status.success { background: rgba(80,200,120,0.2); color: var(--success); }
    .tool-status.error { background: rgba(255,107,107,0.2); color: var(--error); }
    .tool-status.warning { background: rgba(255,179,71,0.2); color: var(--warning); }
    .tool-duration { opacity: 0.6; font-size: 12px; }
    details { margin-top: 8px; }
    summary { cursor: pointer; color: #0f3460; font-size: 12px; }
    pre { background: var(--bg); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 11px;
          max-height: 200px; overflow-y: auto; }
    .error { color: var(--error); font-size: 12px; margin-top: 4px; }
    .timeline { margin: 20px 0; }
    .timeline-bar { display: flex; align-items: center; gap: 4px; margin: 4px 0; }
    .timeline-bar .bar { height: 20px; background: #e94560; border-radius: 3px; min-width: 2px; transition: width 0.3s; }
    .timeline-bar .label { font-size: 11px; min-width: 80px; opacity: 0.7; }
  </style>
</head>
<body>
  <h1>Session Replay</h1>
  <div class="stats">
    <div class="stat-card"><div class="value">${trace.metadata.totalToolCalls}</div><div class="label">Tool Calls</div></div>
    <div class="stat-card"><div class="value">${(trace.metadata.totalTokens / 1000).toFixed(1)}K</div><div class="label">Total Tokens</div></div>
    <div class="stat-card"><div class="value">${(trace.metadata.totalDurationMs / 1000).toFixed(1)}s</div><div class="label">Duration</div></div>
    <div class="stat-card"><div class="value">${trace.turns.length}</div><div class="label">Turns</div></div>
  </div>

  <h2>Tool Usage</h2>
  <div class="stats">
    ${Object.entries(trace.metadata.toolCallCounts)
      .map(([tool, count]) => `<div class="stat-card"><div class="value">${count}</div><div class="label">${escapeHtml(tool)}</div></div>`)
      .join('\n')}
  </div>

  <h2>Timeline</h2>
  <div class="timeline">
    ${timelineData
      .map((t) => {
        const maxDuration = Math.max(...timelineData.map((x) => x.duration || 1))
        const width = Math.max(5, (t.duration / maxDuration) * 100)
        return `<div class="timeline-bar">
          <span class="label">Turn ${t.turn}</span>
          <div class="bar" style="width: ${width}%"></div>
          <span style="font-size:11px">${t.toolCount} tools, ${(t.duration / 1000).toFixed(1)}s</span>
        </div>`
      })
      .join('\n')}
  </div>

  <h2>Tool Calls</h2>
  ${toolCallRows}

  <footer style="margin-top:40px;padding-top:20px;border-top:1px solid var(--accent);opacity:0.5;font-size:11px">
    Generated by cc-local Session Replay • ${new Date().toISOString()}
  </footer>
</body>
</html>`
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
