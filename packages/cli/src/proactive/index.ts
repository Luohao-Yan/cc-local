/** Stubs for proactive / autonomous mode (feature-gated requires). */

type ProactiveReason = string

const NOOP_SUBSCRIBE = (_onStoreChange: () => void) => () => {}

export function isProactiveActive(): boolean {
  return false
}

export function isProactivePaused(): boolean {
  return false
}

export function activateProactive(_reason: ProactiveReason): void {}

export function deactivateProactive(): void {}

export function pauseProactive(): void {}

export function resumeProactive(): void {}

export function setContextBlocked(_blocked: boolean): void {}

export function subscribeToProactiveChanges(onStoreChange: () => void): () => void {
  return NOOP_SUBSCRIBE(onStoreChange)
}

export function getNextTickAt(): null {
  return null
}
