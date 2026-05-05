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

// ===== Public API =====

/**
 * Set the active model and configure env vars for backward compatibility.
 * Saves the original env vars on the first call so they can be restored later.
 */
export function setActiveModel(model: ResolvedModel): void {
  // Save originals on first call only
  if (!hasSavedEnv) {
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

  // Restore original env vars
  if (hasSavedEnv) {
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
