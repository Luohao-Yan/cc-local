/**
 * Shared state for /goal and /loop auto-continue modes.
 *
 * These features auto-re-query the model after a turn completes,
 * with different stop conditions:
 *  - /goal: continues until the model declares the goal achieved
 *  - /loop: continues until the user presses Esc
 */

export type GoalState = {
  active: true
  description: string
  startMs: number
  turnCount: number
  inputTokens: number
  outputTokens: number
} | { active: false }

export type LoopState = {
  active: true
  startMs: number
  turnCount: number
  inputTokens: number
  outputTokens: number
} | { active: false }

let goalState: GoalState = { active: false }
let loopState: LoopState = { active: false }

const listeners = new Set<() => void>()

function notify(): void {
  for (const fn of listeners) fn()
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

// ── Goal ──

export function getGoalState(): GoalState {
  return goalState
}

export function setGoalActive(description: string): void {
  goalState = {
    active: true,
    description,
    startMs: Date.now(),
    turnCount: 0,
    inputTokens: 0,
    outputTokens: 0,
  }
  notify()
}

export function clearGoal(): void {
  goalState = { active: false }
  notify()
}

export function updateGoalStats(inputDelta: number, outputDelta: number): void {
  if (!goalState.active) return
  goalState = {
    ...goalState,
    turnCount: goalState.turnCount + 1,
    inputTokens: goalState.inputTokens + inputDelta,
    outputTokens: goalState.outputTokens + outputDelta,
  }
  notify()
}

// ── Loop ──

export function getLoopState(): LoopState {
  return loopState
}

export function setLoopActive(): void {
  loopState = {
    active: true,
    startMs: Date.now(),
    turnCount: 0,
    inputTokens: 0,
    outputTokens: 0,
  }
  notify()
}

export function clearLoop(): void {
  loopState = { active: false }
  notify()
}

export function updateLoopStats(inputDelta: number, outputDelta: number): void {
  if (!loopState.active) return
  loopState = {
    ...loopState,
    turnCount: loopState.turnCount + 1,
    inputTokens: loopState.inputTokens + inputDelta,
    outputTokens: loopState.outputTokens + outputDelta,
  }
  notify()
}

// ── Helpers ──

export function isAutoContinueActive(): boolean {
  return goalState.active || loopState.active
}

export function clearAllAutoContinue(): void {
  goalState = { active: false }
  loopState = { active: false }
  notify()
}
