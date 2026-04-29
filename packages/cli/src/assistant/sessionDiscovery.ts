/**
 * Stub — assistant session discovery for `claude assistant` (Kairos).
 */
export type AssistantSession = {
  id: string
  /** Human-readable label in session picker */
  label?: string
  environmentId?: string
}

export async function discoverAssistantSessions(): Promise<AssistantSession[]> {
  return []
}
