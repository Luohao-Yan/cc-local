/**
 * Cached Microcompact — cache-editing integration.
 *
 * When the Anthropic API supports cache editing (cache_reference + cache_edits),
 * this module tracks tool results across turns and generates cache_edits blocks
 * to delete old tool results without invalidating the cached prompt prefix.
 *
 * Unlike the ANT-only version which relies on GrowthBook for config and model
 * support lists, this version provides sensible defaults and environment
 * variable overrides.
 *
 * Key concepts:
 * - Register: Track tool results as they appear in the conversation.
 * - Trigger: When registered tools exceed threshold, queue a cache_edits block.
 * - Pin: After the API responds, pin the edits to their user-message position.
 * - Re-send: On subsequent requests, re-send pinned edits at their original positions.
 */

export interface CacheEditsBlock {
  /** The cache_control directive for the edited block. */
  cache_control?: { type: 'ephemeral' }
  /** The edited content. */
  [key: string]: unknown
}

export interface PinnedCacheEdits {
  /** The user message index where edits were inserted. */
  userMessageIndex: number
  /** The cache_edits block. */
  block: CacheEditsBlock
}

export interface CachedMCState {
  pinnedEdits: PinnedCacheEdits[]
  registeredTools: Set<string>
  toolOrder: string[]
  deletedRefs: Set<string>
}

export interface CachedMCConfig {
  /** Models that support cache editing. */
  supportedModels: string[]
  /** Number of registered tool results to trigger deletion. */
  triggerThreshold: number
  /** Number of recent tool results to keep (not delete). */
  keepRecent: number
}

/** Default config — can be overridden with environment variables. */
const DEFAULT_CONFIG: CachedMCConfig = {
  supportedModels: [
    'claude-sonnet-4-20250514',
    'claude-sonnet-4',
    'claude-opus-4-20250514',
    'claude-opus-4',
    'claude-sonnet-4-6-20250514',
    'claude-sonnet-4-6',
    'claude-opus-4-6-20250514',
    'claude-opus-4-6',
  ],
  triggerThreshold: 8,
  keepRecent: 3,
}

export function createCachedMCState(): CachedMCState {
  return {
    pinnedEdits: [],
    registeredTools: new Set(),
    toolOrder: [],
    deletedRefs: new Set(),
  }
}

/** Register a tool result ID so we can track it for later deletion. */
export function registerToolResult(state: CachedMCState, toolUseId: string): void {
  state.registeredTools.add(toolUseId)
}

/** Register a group of tool result IDs (from one user message). */
export function registerToolMessage(
  state: CachedMCState,
  groupIds: string[],
): void {
  for (const id of groupIds) {
    state.toolOrder.push(id)
  }
}

/**
 * Determine which tool results should be deleted.
 * We delete all registered tools except the most recent `keepRecent`.
 * We skip tools that have already been deleted.
 */
export function getToolResultsToDelete(state: CachedMCState): string[] {
  const config = getCachedMCConfig()
  const keepSet = new Set(state.toolOrder.slice(-config.keepRecent))
  const toDelete = state.toolOrder.filter(
    (id) => state.registeredTools.has(id) && !keepSet.has(id) && !state.deletedRefs.has(id),
  )
  return toDelete
}

/**
 * Create a cache_edits block that removes the specified tool results.
 *
 * In the real API, this would be a structured block with operation
 * type "delete" and references to the tool_use_ids. Since the
 * exact API schema may differ, we produce a generic structure
 * that can be adapted.
 */
export function createCacheEditsBlock(
  state: CachedMCState,
  toolUseIds: string[],
): CacheEditsBlock | null {
  if (toolUseIds.length === 0) {
    return null
  }

  // Mark these as deleted in our state
  for (const id of toolUseIds) {
    state.deletedRefs.add(id)
  }

  return {
    type: 'cache_edits',
    operations: toolUseIds.map((id) => ({
      op: 'delete',
      tool_use_id: id,
    })),
  }
}

/** Whether cached microcompact is enabled. */
export function isCachedMicrocompactEnabled(): boolean {
  // Check environment override first
  const envVal = process.env.CCLOCAL_CACHED_MC
  if (envVal !== undefined) {
    return envVal === '1' || envVal.toLowerCase() === 'true'
  }
  // Default: enabled for models that support it
  return true
}

/** Check if a model supports cache editing. */
export function isModelSupportedForCacheEditing(model: string): boolean {
  const config = getCachedMCConfig()
  return config.supportedModels.some(
    (supported) =>
      model === supported || model.startsWith(supported.split('-').slice(0, 3).join('-')),
  )
}

/** Get the cached MC config, with environment overrides. */
export function getCachedMCConfig(): CachedMCConfig {
  const config = { ...DEFAULT_CONFIG }

  const threshold = process.env.CCLOCAL_CACHED_MC_THRESHOLD
  if (threshold) {
    const parsed = parseInt(threshold, 10)
    if (!isNaN(parsed) && parsed > 0) {
      config.triggerThreshold = parsed
    }
  }

  const keep = process.env.CCLOCAL_CACHED_MC_KEEP_RECENT
  if (keep) {
    const parsed = parseInt(keep, 10)
    if (!isNaN(parsed) && parsed > 0) {
      config.keepRecent = parsed
    }
  }

  return config
}

/** Mark all registered tools as sent to the API (after a successful response). */
export function markToolsSentToAPI(state: CachedMCState): void {
  // No-op — the registration tracking is sufficient
  // In the ANT version, this clears a "pending" flag
}

/** Reset state for a new session or after cache invalidation. */
export function resetCachedMCState(state: CachedMCState): void {
  state.pinnedEdits.length = 0
  state.registeredTools.clear()
  state.toolOrder.length = 0
  state.deletedRefs.clear()
}
