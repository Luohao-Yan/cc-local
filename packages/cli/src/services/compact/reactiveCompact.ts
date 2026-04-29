import type { QuerySource } from '../../constants/querySource.js'
import type { ToolUseContext } from '../../Tool.js'
import type { Message } from '../../types/message.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import type { CompactionResult } from './compact.js'

export type ReactiveCompactArgs = {
  hasAttempted: boolean
  querySource: QuerySource
  aborted: boolean
  messages: Message[]
  cacheSafeParams: {
    systemPrompt: SystemPrompt
    userContext: { [k: string]: string }
    systemContext: { [k: string]: string }
    toolUseContext: ToolUseContext
    forkContextMessages: Message[]
  }
}

export type ReactiveCompactManualOptions = {
  customInstructions: string | undefined
  trigger: 'manual' | 'auto'
}

export type ReactiveCompactOnPromptOutcome =
  | { ok: true; result: CompactionResult }
  | {
      ok: false
      reason:
        | 'too_few_groups'
        | 'aborted'
        | 'exhausted'
        | 'error'
        | 'media_unstrippable'
    }

export function isReactiveCompactEnabled(): boolean {
  return false
}

export function isReactiveOnlyMode(): boolean {
  return false
}

export function isWithheldPromptTooLong(_message: Message | undefined): boolean {
  return false
}

export function isWithheldMediaSizeError(_message: Message | undefined): boolean {
  return false
}

export async function tryReactiveCompact(
  _args: ReactiveCompactArgs,
): Promise<CompactionResult | null> {
  return null
}

export async function reactiveCompactOnPromptTooLong(
  _messages: Message[],
  _cacheSafeParams: unknown,
  _options: ReactiveCompactManualOptions,
): Promise<ReactiveCompactOnPromptOutcome> {
  return { ok: false, reason: 'error' }
}
