/**
 * Hooks Module - CCLocal VS Code Extension
 * Complete hook system for tool execution, file operations, and lifecycle events
 */

// Types
export type {
  HookType,
  HookHandlerType,
  HookHandler,
  CommandHookHandler,
  HttpHookHandler,
  FunctionHookHandler,
  HookDefinition,
  HookContext,
  HookResult,
  HookExecutionOptions,
  HooksConfiguration,
  HookPriority,
  PrioritizedHookDefinition,
} from './types'

export {
  PREDEFINED_MATCHERS,
  DEFAULT_TIMEOUTS,
} from './types'

// Executors
export {
  HookExecutor,
  CommandHookExecutor,
  HttpHookExecutor,
  FunctionHookExecutor,
} from './executors'

// Manager
export {
  HookManager,
  getHookManager,
  disposeHookManager,
} from './HookManager'

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Create a default hook context
 */
export function createHookContext(
  type: import('./types').HookType,
  partial: Partial<import('./types').HookContext> = {}
): import('./types').HookContext {
  return {
    type,
    timestamp: Date.now(),
    ...partial,
  }
}

/**
 * Check if a hook result indicates blocking
 */
export function isHookBlocked(results: import('./types').HookResult[]): boolean {
  return results.some(r => r.block === true)
}

/**
 * Check if any hook execution failed
 */
export function hasHookFailure(results: import('./types').HookResult[]): boolean {
  return results.some(r => !r.success)
}

/**
 * Get all errors from hook results
 */
export function getHookErrors(results: import('./types').HookResult[]): string[] {
  return results
    .filter(r => r.error)
    .map(r => r.error!)
}

/**
 * Get all outputs from hook results
 */
export function getHookOutputs(results: import('./types').HookResult[]): string[] {
  return results
    .filter(r => r.output)
    .map(r => r.output!)
}

/**
 * Get total execution duration from hook results
 */
export function getTotalHookDuration(results: import('./types').HookResult[]): number {
  return results.reduce((sum, r) => sum + r.duration, 0)
}
