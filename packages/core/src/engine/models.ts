/**
 * Model Resolution - Map aliases and fast mode to concrete model IDs
 *
 * This module resolves user-facing model names (e.g. "opus", "sonnet", "haiku")
 * and fast mode indicators to concrete Anthropic API model IDs.
 *
 * Fast mode:
 * - When enabled, opus models resolve to claude-opus-4-6-fast variants
 * - Other models are unaffected by fast mode
 */

/** All supported model aliases and their concrete IDs */
const MODEL_ALIASES: Record<string, string> = {
  // Short aliases
  opus: 'claude-opus-4-6-20250514',
  sonnet: 'claude-sonnet-4-6-20250514',
  haiku: 'claude-haiku-4-5-20251001',

  // Previous generation aliases
  'opus-4': 'claude-opus-4-20250514',
  'sonnet-4': 'claude-sonnet-4-20250514',
  'opus-4-5': 'claude-opus-4-5-20250514',
  'sonnet-4-5': 'claude-sonnet-4-5-20250514',

  // Full model IDs (pass through)
  'claude-opus-4-6-20250514': 'claude-opus-4-6-20250514',
  'claude-sonnet-4-6-20250514': 'claude-sonnet-4-6-20250514',
  'claude-opus-4-5-20250514': 'claude-opus-4-5-20250514',
  'claude-sonnet-4-5-20250514': 'claude-sonnet-4-5-20250514',
  'claude-haiku-4-5-20251001': 'claude-haiku-4-5-20251001',
}

/** Fast mode model overrides for opus-family models */
const FAST_MODE_OVERRIDES: Record<string, string> = {
  'claude-opus-4-6-20250514': 'claude-opus-4-6-fast-20250514',
  'claude-opus-4-5-20250514': 'claude-opus-4-5-fast-20250514',
}

/** Models that support fast mode variants */
const FAST_MODE_SUPPORTED = new Set([
  'claude-opus-4-6-20250514',
  'claude-opus-4-5-20250514',
  'opus',
  'opus-4',
  'opus-4-5',
  'opus-4-6',
])

/**
 * Resolve a model name/alias to a concrete API model ID.
 *
 * @param model - User-specified model name (alias or full ID)
 * @param fastMode - Whether fast mode is enabled
 * @returns Concrete model ID for the API
 */
export function resolveModelId(model: string, fastMode = false): string {
  // Normalize: lowercase, strip whitespace
  const normalized = model.trim().toLowerCase()

  // Resolve alias → base model ID
  const baseId = MODEL_ALIASES[normalized] ?? normalized

  // Apply fast mode override if applicable
  if (fastMode && FAST_MODE_OVERRIDES[baseId]) {
    return FAST_MODE_OVERRIDES[baseId]
  }

  return baseId
}

/**
 * Check if a model supports fast mode.
 */
export function isFastModeSupported(model: string): boolean {
  const normalized = model.trim().toLowerCase()
  return FAST_MODE_SUPPORTED.has(normalized) || FAST_MODE_SUPPORTED.has(MODEL_ALIASES[normalized] ?? '')
}

/**
 * Get the fast mode variant of a model, or null if not supported.
 */
export function getFastModeModel(model: string): string | null {
  if (!isFastModeSupported(model)) return null
  const baseId = MODEL_ALIASES[model.trim().toLowerCase()] ?? model.trim().toLowerCase()
  return FAST_MODE_OVERRIDES[baseId] ?? null
}

/**
 * Get the display name for a model.
 */
export function getModelDisplayName(model: string): string {
  const normalized = model.trim().toLowerCase()

  if (normalized.includes('opus-4-6-fast') || normalized.includes('opus-4-5-fast')) {
    return 'Opus 4.6 (fast)'
  }
  if (normalized.includes('opus-4-6')) return 'Opus 4.6'
  if (normalized.includes('opus-4-5')) return 'Opus 4.5'
  if (normalized.includes('sonnet-4-6')) return 'Sonnet 4.6'
  if (normalized.includes('sonnet-4-5')) return 'Sonnet 4.5'
  if (normalized.includes('haiku-4-5')) return 'Haiku 4.5'

  // Fallback: use the model ID
  return model
}

/**
 * Get all available model aliases.
 */
export function getModelAliases(): Record<string, string> {
  return { ...MODEL_ALIASES }
}
