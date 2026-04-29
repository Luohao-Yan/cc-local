import type { ToolUseContext } from '../../Tool.js'
import type { Message } from '../../types/message.js'

export type SkillPrefetchHandle = symbol

export function startSkillDiscoveryPrefetch(
  _pivot: null,
  _messages: Message[],
  _toolUseContext: ToolUseContext,
): SkillPrefetchHandle | null {
  return null
}

export async function collectSkillDiscoveryPrefetch(
  _handle: SkillPrefetchHandle,
): Promise<never[]> {
  return []
}
