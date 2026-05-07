/**
 * Active Model Context (Provider_Router)
 *
 * Replaces the fragile pattern of reading process.env to determine the active
 * provider configuration. Module-level state tracks the active ResolvedModel,
 * while still setting env vars for backward compatibility with the Anthropic SDK.
 *
 * The routing decision (anthropic vs openai format) is based on
 * getActiveAPIFormat() rather than checking env vars.
 *
 * IMPORTANT: Original env vars are saved and restored on clear, so switching
 * back to first-party after using a custom model works correctly.
 */

import type { ResolvedModel } from './multiModel.js'
import type { APIFormat, APIProvider } from './providers.js'

// ===== Module-level state =====

let activeModel: ResolvedModel | null = null

/** Saved original values of env vars before any setActiveModel() call */
let savedBaseUrl: string | undefined = undefined
let savedApiKey: string | undefined = undefined
let hasSavedEnv = false

/** Nesting level for withActiveModel calls (for concurrency safety) */
let activeModelNestingLevel = 0

// ===== Public API =====

/**
 * Set the active model and configure env vars for backward compatibility.
 * Saves the original env vars on the first call so they can be restored later.
 */
export function setActiveModel(model: ResolvedModel): void {
  // Save originals on first call only (not in nested context)
  if (!hasSavedEnv && activeModelNestingLevel === 0) {
    savedBaseUrl = process.env.ANTHROPIC_BASE_URL
    savedApiKey = process.env.ANTHROPIC_API_KEY
    hasSavedEnv = true
  }

  activeModel = model

  // Set env vars for Anthropic SDK compatibility
  process.env.ANTHROPIC_BASE_URL = model.baseUrl
  if (model.apiKey !== null) {
    process.env.ANTHROPIC_API_KEY = model.apiKey
  } else {
    process.env.ANTHROPIC_API_KEY = 'local-no-key'
  }

  // Clear betas memoization caches since the active format changed
  // (getModelBetas is memoized and reads getActiveAPIFormat at evaluation time)
  try {
    const { clearBetasCaches } = require('./betas.js') as { clearBetasCaches: () => void }
    clearBetasCaches()
  } catch {
    // betas.js may not be available in all contexts (e.g., core package)
  }
}

/**
 * Get the currently active resolved model.
 * Returns null if no custom model has been activated (first-party default).
 */
export function getActiveResolvedModel(): ResolvedModel | null {
  return activeModel
}

/**
 * Create a snapshot of the current active model state for later restoration.
 * Returns null if no model is active, or a ResolvedModel copy if one is.
 * Use this with restoreActiveModel for safe model switching.
 */
export function snapshotActiveModel(): ResolvedModel | null {
  if (activeModel === null) return null
  // Return a shallow copy to prevent mutation issues
  return { ...activeModel }
}

/**
 * Restore the active model from a snapshot.
 * Pass null to clear the active model (restore first-party defaults).
 */
export function restoreActiveModel(snapshot: ResolvedModel | null): void {
  if (snapshot === null) {
    clearActiveModel()
  } else {
    setActiveModel(snapshot)
  }
}

/**
 * Execute a callback with a temporary active model, automatically restoring
 * the previous state afterward. This is the safe way to temporarily switch
 * models (e.g., for buddy/smallFastModel queries).
 *
 * @param model The model to temporarily activate
 * @param callback The async function to execute with the temporary model
 * @returns The result of the callback
 */
export async function withActiveModel<T>(
  model: ResolvedModel,
  callback: () => Promise<T>,
): Promise<T> {
  const snapshot = snapshotActiveModel()
  activeModelNestingLevel++

  try {
    setActiveModel(model)
    return await callback()
  } finally {
    activeModelNestingLevel--
    restoreActiveModel(snapshot)
  }
}

/**
 * Get the API format for the currently active model.
 * Returns 'anthropic' when no custom model is active (first-party default).
 */
export function getActiveAPIFormat(): APIFormat {
  return activeModel?.apiFormat ?? 'anthropic'
}

/**
 * Get the effective provider type for the currently active model.
 * Returns 'firstParty' when no custom model is active.
 */
export function getActiveProviderType(): APIProvider {
  return activeModel?.providerType ?? 'firstParty'
}

/**
 * Clear the active model state and restore original env vars.
 * Used when switching back to first-party or resetting the session.
 */
export function clearActiveModel(): void {
  activeModel = null

  // Only restore original env vars if not in a nested context
  if (hasSavedEnv && activeModelNestingLevel === 0) {
    if (savedBaseUrl === undefined) {
      delete process.env.ANTHROPIC_BASE_URL
    } else {
      process.env.ANTHROPIC_BASE_URL = savedBaseUrl
    }
    if (savedApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = savedApiKey
    }
    hasSavedEnv = false
  }
}
