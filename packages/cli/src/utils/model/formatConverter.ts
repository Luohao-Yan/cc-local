/**
 * Anthropic Messages API <-> OpenAI Chat Completions API Format Converter
 *
 * Translates request/response payloads between the two API formats so that
 * OpenAI-compatible endpoints (DeepSeek, Doubao/Ark, Ollama, etc.) can be
 * used transparently alongside the existing Anthropic SDK path.
 *
 * Design notes:
 * - Stateless pure functions — no side effects, no I/O
 * - Round-trip safe: convertAnthropicToOpenAI → convertOpenAIToAnthropic
 *   preserves all information that the downstream pipeline needs
 * - Anthropic-only features (thinking blocks, cache_control, betas) are
 *   intentionally dropped during conversion since OpenAI has no equivalent
 */

import type Anthropic from '@anthropic-ai/sdk'
import { logForDebugging } from '../debug.js'
import { convertToolsToOpenAI as convertToolsToOpenAISchema } from './toolSchemaConverter.js'
import { OPENAI_STOP_REASON_MAP } from './openAIThinking.js'

// ===== Anthropic-side type aliases =====
// Using broad types to avoid SDK version-specific issues

type AnthropicMessageCreateParams = Record<string, unknown>
type AnthropicTextBlockParam = Anthropic.TextBlockParam
type AnthropicToolUseBlockParam = Record<string, unknown>
type AnthropicToolResultBlockParam = Anthropic.ToolResultBlockParam
type AnthropicImageBlockParam = Anthropic.ImageBlockParam
type AnthropicThinkingBlockParam = Record<string, unknown>
type AnthropicBetaMessage = Record<string, unknown>
type AnthropicBetaToolUnion = Record<string, unknown>

// ===== OpenAI-side types =====

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | OpenAIContentPart[] | null
  /** Present when role='assistant' and the model made tool calls */
  tool_calls?: OpenAIToolCall[]
  /** Present when role='tool' — references the specific tool call */
  tool_call_id?: string
  /** Preserved reasoning/thinking content for DeepSeek v4 round-trip compatibility */
  reasoning_content?: string
}

export interface OpenAIContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' }
}

export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface OpenAIChatParams {
  model: string
  messages: OpenAIChatMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stop?: string[]
  stream?: boolean
  tools?: OpenAITool[]
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } }
  response_format?: { type: 'json_object' | 'text' } | { type: 'json_schema'; json_schema: unknown }
}

export interface OpenAITool {
  type: 'function'
  function: { name: string; description?: string; parameters: unknown }
}

export interface OpenAIChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: { role: string; content: string | null; tool_calls?: OpenAIToolCall[] }
    finish_reason: string | null
  }[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface OpenAIStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    delta: {
      role?: string
      content?: string | null
      tool_calls?: { index: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }[]
      reasoning_content?: string
    }
    finish_reason: string | null
  }[]
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

// ===== Conversion: Anthropic → OpenAI =====

/**
 * Convert Anthropic Messages API params to OpenAI Chat Completions params.
 *
 * Drops Anthropic-only fields: thinking, cache_control, betas, metadata,
 * context_management, output_config, speed, etc.
 */
export function convertAnthropicToOpenAI(params: AnthropicMessageCreateParams): OpenAIChatParams {
  const p = params as Record<string, unknown>
  const messages: OpenAIChatMessage[] = []

  // System prompt → system message
  const system = p.system as string | AnthropicTextBlockParam[] | undefined
  if (system) {
    const systemText = Array.isArray(system)
      ? (system as unknown as Array<Record<string, unknown>>)
          .filter(b => b.type === 'text')
          .map(b => b.text as string)
          .join('\n')
      : system
    if (systemText) {
      messages.push({ role: 'system', content: systemText })
    }
  }

  // Convert each Anthropic message
  const inputMessages = (p.messages || []) as Array<{ role: string; content: string | unknown[] }>
  for (const msg of inputMessages) {
    if (msg.role === 'user') {
      messages.push(...convertUserMessage(msg.content))
    } else if (msg.role === 'assistant') {
      messages.push(convertAssistantMessage(msg.content))
    }
  }

  // Fix consecutive same-role messages (OpenAI requires alternating)
  const fixed = fixConsecutiveRoles(messages)

  const result: OpenAIChatParams = {
    model: p.model as string,
    messages: fixed,
    max_tokens: p.max_tokens as number | undefined,
    ...(p.temperature !== undefined && { temperature: p.temperature as number }),
    ...(p.top_p !== undefined && { top_p: p.top_p as number }),
    ...(Array.isArray(p.stop_sequences) && p.stop_sequences.length > 0 && { stop: p.stop_sequences as string[] }),
    stream: (p.stream as boolean) ?? false,
  }

  // Convert tools
  const tools = p.tools as AnthropicBetaToolUnion[] | undefined
  if (tools && tools.length > 0) {
    result.tools = convertToolsToOpenAI(tools)
  }

  // Convert tool_choice
  if (p.tool_choice) {
    result.tool_choice = convertToolChoiceToOpenAI(p.tool_choice)
  }

  // Convert output_config.format → response_format
  const outputConfig = p.output_config as Record<string, unknown> | undefined
  if (outputConfig?.format) {
    const fmt = outputConfig.format as Record<string, unknown>
    if (fmt.type === 'json_schema' && fmt.json_schema) {
      result.response_format = { type: 'json_schema', json_schema: fmt.json_schema }
    } else if (fmt.type === 'json_object') {
      result.response_format = { type: 'json_object' }
    }
  }

  return result
}

function convertUserMessage(content: string | unknown[]): OpenAIChatMessage[] {
  if (typeof content === 'string') {
    return [{ role: 'user', content }]
  }

  const parts: OpenAIContentPart[] = []
  const toolResults: OpenAIChatMessage[] = []
  let hasNonToolContent = false

  for (const block of content as Record<string, unknown>[]) {
    const blockType = block.type as string
    if (blockType === 'text') {
      parts.push({ type: 'text', text: block.text as string })
      hasNonToolContent = true
    } else if (blockType === 'image') {
      const src = block.source as Record<string, unknown>
      if (src.type === 'base64') {
        const dataUrl = `data:${src.media_type as string};base64,${src.data as string}`
        parts.push({ type: 'image_url', image_url: { url: dataUrl } })
        hasNonToolContent = true
      } else if (src.type === 'url') {
        parts.push({ type: 'image_url', image_url: { url: src.url as string } })
        hasNonToolContent = true
      }
    } else if (blockType === 'tool_result') {
      const toolResult = convertToolResult(block as unknown as Record<string, unknown>)
      toolResults.push(toolResult)
    }
  }

  const result: OpenAIChatMessage[] = []
  if (hasNonToolContent) {
    result.push({ role: 'user', content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text! : parts })
  }
  result.push(...toolResults)

  return result
}

function convertToolResult(block: Record<string, unknown>): OpenAIChatMessage {
  let content: string
  const blockContent = block.content
  const isError = block.is_error === true
  if (typeof blockContent === 'string') {
    content = isError ? `[ERROR] ${blockContent}` : blockContent
  } else if (Array.isArray(blockContent)) {
    const textParts = (blockContent as Record<string, unknown>[])
      .filter(c => c.type === 'text')
      .map(c => c.text as string)
      .join('\n')
    content = isError ? `[ERROR] ${textParts}` : textParts
  } else {
    content = isError ? '[ERROR]' : ''
  }

  return {
    role: 'tool',
    tool_call_id: block.tool_use_id as string,
    content,
  }
}

function convertAssistantMessage(content: string | unknown[]): OpenAIChatMessage {
  if (typeof content === 'string') {
    return { role: 'assistant', content }
  }

  let textContent = ''
  const toolCalls: OpenAIToolCall[] = []
  let reasoningContent: string | undefined

  for (const block of content as Record<string, unknown>[]) {
    const blockType = block.type as string
    if (blockType === 'text') {
      textContent += block.text as string
    } else if (blockType === 'tool_use') {
      toolCalls.push({
        id: block.id as string,
        type: 'function',
        function: {
          name: block.name as string,
          arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input),
        },
      })
    } else if (blockType === 'thinking') {
      // Preserve thinking blocks as reasoning_content for DeepSeek v4 round-trip.
      // DeepSeek rejects requests that omit previously returned reasoning_content.
      const thinkingText = (block as Record<string, unknown>).thinking as string
      reasoningContent = reasoningContent !== undefined ? reasoningContent + thinkingText : thinkingText
    }
    // Drop cache_control, redacted_thinking, etc.
  }

  const result: OpenAIChatMessage = {
    role: 'assistant',
    content: textContent || null!,
    ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
    ...(reasoningContent !== undefined && { reasoning_content: reasoningContent }),
  }
  return result
}

/**
 * Convert Anthropic tool definitions to OpenAI function-calling format.
 * Filters out Anthropic-only tool types (advisor, computer, text_editor).
 * Delegates to toolSchemaConverter for the actual conversion logic.
 */
export function convertToolsToOpenAI(tools: AnthropicBetaToolUnion[]): OpenAITool[] {
  // Delegate to the standalone converter module
  return convertToolsToOpenAISchema(tools as Record<string, unknown>[])
}

function convertToolChoiceToOpenAI(toolChoice: unknown): OpenAIChatParams['tool_choice'] {
  if (typeof toolChoice === 'string') {
    switch (toolChoice) {
      case 'auto': return 'auto'
      case 'any': return 'required'
      case 'none': return 'none'
    }
  }
  if (typeof toolChoice === 'object' && toolChoice !== null) {
    const tc = toolChoice as Record<string, unknown>
    if (tc.type === 'tool' && typeof tc.name === 'string') {
      return { type: 'function', function: { name: tc.name } }
    }
  }
  return 'auto'
}

/**
 * OpenAI requires alternating user/assistant roles.
 * When we have consecutive same-role messages (e.g. multiple tool results),
 * we need to fix them. Multiple tool results are valid in OpenAI (they follow
 * an assistant message with multiple tool_calls), so we just keep them.
 * Other same-role conflicts are resolved by merging or inserting placeholders.
 */
function fixConsecutiveRoles(messages: OpenAIChatMessage[]): OpenAIChatMessage[] {
  if (messages.length <= 1) return messages

  const fixed: OpenAIChatMessage[] = [messages[0]!]

  for (let i = 1; i < messages.length; i++) {
    const prev = fixed[fixed.length - 1]!
    const curr = messages[i]!

    if (prev.role === curr.role) {
      if (curr.role === 'tool') {
        // Multiple consecutive tool results are valid in OpenAI when they
        // correspond to different tool_calls in the preceding assistant message.
        // Just keep them — no placeholder needed.
        fixed.push(curr)
      } else if (curr.role === 'assistant' && prev.role === 'assistant') {
        // Merge assistant messages: concatenate text content and tool_calls
        const prevText = typeof prev.content === 'string' ? prev.content : ''
        const currText = typeof curr.content === 'string' ? curr.content : ''
        const mergedContent = [prevText, currText].filter(c => c !== '').join('\n')
        const mergedToolCalls = [...(prev.tool_calls || []), ...(curr.tool_calls || [])]
        fixed[fixed.length - 1] = {
          role: 'assistant',
          content: mergedContent || null!,
          ...(mergedToolCalls.length > 0 && { tool_calls: mergedToolCalls }),
        }
      } else if (curr.role === 'user' && prev.role === 'user') {
        // Insert an assistant placeholder
        fixed.push({ role: 'assistant', content: ' ' })
        fixed.push(curr)
      } else {
        fixed.push(curr)
      }
    } else {
      fixed.push(curr)
    }
  }

  // Validate: tool messages must follow an assistant message with tool_calls
  for (let i = 0; i < fixed.length; i++) {
    if (fixed[i]!.role === 'tool') {
      // Find the preceding assistant message — if none exists or it has no
      // tool_calls, we need to inject a synthetic one
      let hasAssistantWithToolCalls = false
      for (let j = i - 1; j >= 0; j--) {
        if (fixed[j]!.role === 'assistant') {
          if (fixed[j]!.tool_calls && (fixed[j]!.tool_calls as unknown[]).length > 0) {
            hasAssistantWithToolCalls = true
          }
          break
        }
      }
      if (!hasAssistantWithToolCalls && i > 0) {
        // Insert a synthetic assistant message with a tool_call matching this tool's ID
        const toolCallId = (fixed[i] as any).tool_call_id || `synth_${i}`
        const syntheticAssistant: OpenAIChatMessage = {
          role: 'assistant',
          content: null!,
          tool_calls: [{
            id: toolCallId,
            type: 'function',
            function: { name: '_synthetic', arguments: '{}' },
          }],
        }
        fixed.splice(i, 0, syntheticAssistant)
        i++ // skip past the inserted message
      }
    }
  }

  return fixed
}

// ===== Conversion: OpenAI → Anthropic =====

/**
 * Convert an OpenAI Chat Completions response to an Anthropic Messages API response.
 */
export function convertOpenAIToAnthropic(
  response: OpenAIChatResponse,
  originalModel: string,
): Record<string, unknown> {
  const choice = response.choices[0]
  if (!choice) {
    throw new Error('OpenAI response has no choices')
  }

  const content: Record<string, unknown>[] = []

  // Text content
  if (choice.message.content) {
    content.push({
      type: 'text',
      text: choice.message.content,
    })
  }

  // Tool calls → tool_use blocks
  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      let input: Record<string, unknown>
      try {
        input = JSON.parse(tc.function.arguments)
      } catch {
        input = {}
        logForDebugging(`[formatConverter] Failed to parse tool call arguments: ${tc.function.arguments}`, { level: 'warn' })
      }
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input,
      })
    }
  }

  // Map finish_reason
  return {
    id: response.id,
    type: 'message',
    role: 'assistant',
    content,
    model: originalModel,
    stop_reason: (choice.finish_reason && OPENAI_STOP_REASON_MAP[choice.finish_reason]) ?? 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  }
}

/**
 * Create a synthetic Anthropic message from an OpenAI streaming response
 * (used when streaming is complete and we need a final message object).
 */
export function createSyntheticAnthropicMessage(
  model: string,
  content: Record<string, unknown>[],
  stopReason: string,
  inputTokens: number,
  outputTokens: number,
): Record<string, unknown> {
  return {
    id: `synth_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  }
}
