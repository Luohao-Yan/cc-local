/**
 * Message sequence validation for Anthropic API compliance.
 *
 * Validates that a message array follows the Anthropic Messages API
 * conventions before it is sent to the API. Catches structural errors
 * early with descriptive messages instead of opaque 400 errors.
 */

import type { Message } from '@cclocal/shared'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates that a message sequence follows Anthropic API conventions:
 * 1. Must start with a user message
 * 2. user and assistant messages must alternate
 * 3. tool_result blocks must only appear in user messages
 * 4. tool_use blocks must only appear in assistant messages
 * 5. Each tool_result's tool_use_id must reference a preceding tool_use
 * 6. No duplicate tool_use IDs
 */
export function validateMessageSequence(messages: Message[]): ValidationResult {
  const errors: string[] = []

  if (messages.length === 0) {
    return { valid: true, errors: [] }
  }

  // Rule 1: First message must be user
  if (messages[0]!.role !== 'user') {
    errors.push('First message must have role "user"')
  }

  // Rule 2: Messages must alternate user/assistant
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1]!
    const curr = messages[i]!
    if (prev.role === curr.role) {
      errors.push(`Consecutive messages with same role "${curr.role}" at indices ${i - 1} and ${i}`)
    }
  }

  // Track tool_use IDs and their locations
  const toolUseIds = new Map<string, number>() // id -> message index
  const toolResultIds = new Set<string>()

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!

    for (const block of msg.content) {
      if (block.type === 'tool_use') {
        // Rule 4: tool_use must be in assistant messages
        if (msg.role !== 'assistant') {
          errors.push(`tool_use block (id: ${block.id}) found in non-assistant message at index ${i}`)
        }
        // Rule 6: No duplicate tool_use IDs
        if (toolUseIds.has(block.id)) {
          errors.push(`Duplicate tool_use id "${block.id}" at indices ${toolUseIds.get(block.id)} and ${i}`)
        }
        toolUseIds.set(block.id, i)
      }

      if (block.type === 'tool_result') {
        // Rule 3: tool_result must be in user messages
        if (msg.role !== 'user') {
          errors.push(`tool_result block found in non-user message at index ${i}`)
        }
        toolResultIds.add(block.tool_use_id)
      }
    }
  }

  // Rule 5: Each tool_result must reference a preceding tool_use
  for (const trId of toolResultIds) {
    if (!toolUseIds.has(trId)) {
      errors.push(`tool_result references unknown tool_use_id "${trId}"`)
    }
  }

  // Each tool_use should have a corresponding tool_result
  for (const [tuId] of toolUseIds) {
    if (!toolResultIds.has(tuId)) {
      errors.push(`tool_use id "${tuId}" has no corresponding tool_result`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
