/**
 * System Prompt Builder
 *
 * Merges the structured SystemPrompt type with user/system context maps
 * into a single string suitable for the QueryEngine.
 *
 * Single source of truth — both queryEngineAdapter and nativeBridgeAdapter
 * should import from here.
 */

import type { SystemPrompt } from '../utils/systemPromptType.js'

export interface SystemPromptInput {
  systemPrompt: SystemPrompt
  userContext?: Record<string, string>
  systemContext?: Record<string, string>
}

export function buildSystemPrompt(params: SystemPromptInput): string {
  const parts: string[] = []

  // SystemPrompt may be a string or a structured object
  const sp = params.systemPrompt
  if (typeof sp === 'string' && sp) {
    parts.push(sp)
  } else if (sp && typeof sp === 'object' && 'prompt' in sp) {
    parts.push((sp as { prompt: string }).prompt)
  }

  if (params.userContext && Object.keys(params.userContext).length > 0) {
    const contextEntries = Object.entries(params.userContext)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    parts.push(`User context:\n${contextEntries}`)
  }

  if (params.systemContext && Object.keys(params.systemContext).length > 0) {
    const sysEntries = Object.entries(params.systemContext)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    parts.push(`System context:\n${sysEntries}`)
  }

  return parts.join('\n\n')
}
