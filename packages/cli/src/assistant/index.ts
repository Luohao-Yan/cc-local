/** Assistant / KAIROS mode entry (feature-gated dynamic imports). */

let assistantForced = false

export function markAssistantForced(): void {
  assistantForced = true
}

export function isAssistantForced(): boolean {
  return assistantForced
}

export function isAssistantMode(): boolean {
  return false
}

export async function initializeAssistantTeam(): Promise<Record<string, unknown>> {
  return {}
}

export function getAssistantSystemPromptAddendum(): string {
  return ''
}

export function getAssistantActivationPath(): string | undefined {
  return undefined
}
