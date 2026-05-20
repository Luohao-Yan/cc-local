/**
 * Cached Micro-Compact Configuration
 *
 * CACHED_MICROCOMPACT feature: caches the microcompact configuration
 * to avoid re-fetching it on every compaction cycle.
 */

interface MCConfig {
  enabled: boolean
  maxToolResultChars: number
  maxFileContentChars: number
  compactAttachments: boolean
  stripAnsi: boolean
}

const DEFAULT_MC_CONFIG: MCConfig = {
  enabled: true,
  maxToolResultChars: 8000,
  maxFileContentChars: 12000,
  compactAttachments: true,
  stripAnsi: true,
}

let cachedConfig: MCConfig | null = null

/**
 * Get the cached microcompact configuration.
 * Falls back to defaults if not yet cached.
 */
export function getCachedMCConfig(): MCConfig {
  if (!cachedConfig) {
    cachedConfig = { ...DEFAULT_MC_CONFIG }
  }
  return cachedConfig
}

/**
 * Update the cached microcompact configuration.
 */
export function setCachedMCConfig(config: Partial<MCConfig>): void {
  cachedConfig = { ...getCachedMCConfig(), ...config }
}

/**
 * Invalidate the cached microcompact configuration.
 */
export function invalidateCachedMCConfig(): void {
  cachedConfig = null
}
