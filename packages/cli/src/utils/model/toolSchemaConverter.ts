/**
 * Tool Schema Converter: Anthropic tool definitions → OpenAI function-calling format
 *
 * Separated from formatConverter.ts for clarity and testability.
 * Handles the structural differences between Anthropic's tool schema
 * and OpenAI's function-calling schema.
 */

import type { OpenAITool } from './formatConverter.js'
import { logForDebugging } from '../debug.js'

// ===== Anthropic-only tool patterns =====

/** Tool name prefixes that are Anthropic-specific and should not be forwarded */
const ANTHROPIC_ONLY_PREFIXES = [
  'advisor_',     // advisor_20260301 etc.
  'computer_',    // computer_20250124 etc.
  'text_editor_', // text_editor_20250124 etc.
]

/** Tool types in the Anthropic SDK that are not custom (function) tools */
const ANTHROPIC_BETA_TOOL_TYPES = new Set([
  'computer_20250124',
  'text_editor_20250124',
  'bash_20250124',
  'advisor_20260301',
])

/**
 * Check if a tool is Anthropic-only and should be filtered out
 * when sending to OpenAI-compatible endpoints.
 */
export function isAnthropicOnlyTool(tool: Record<string, unknown>): boolean {
  // Check by type field (beta tools have their own type)
  if ('type' in tool && ANTHROPIC_BETA_TOOL_TYPES.has(tool.type as string)) {
    return true
  }

  // Check by name prefix (custom tools with Anthropic-only names)
  if ('name' in tool && typeof tool.name === 'string') {
    return ANTHROPIC_ONLY_PREFIXES.some(prefix => (tool.name as string).startsWith(prefix))
  }

  return false
}

/**
 * Convert Anthropic tool definitions to OpenAI function-calling format.
 *
 * Filters out Anthropic-only tools and converts the remaining custom tools
 * to OpenAI's function-calling format.
 */
export function convertToolsToOpenAI(tools: Record<string, unknown>[]): OpenAITool[] {
  return tools
    .filter(tool => !isAnthropicOnlyTool(tool))
    .map(tool => convertSingleTool(tool))
    .filter((t): t is OpenAITool => t !== null)
}

/**
 * Convert a single Anthropic tool to OpenAI format.
 * Returns null for tools that cannot be converted.
 * Applies JSON Schema sanitization for OpenAI-compatible providers.
 */
function convertSingleTool(tool: Record<string, unknown>): OpenAITool | null {
  try {
    // Only custom (function) tools are convertible
    if (tool.type !== 'custom') {
      return null
    }

    const rawSchema = tool.input_schema as Record<string, unknown> | undefined
    const sanitizedSchema = sanitizeJsonSchema(rawSchema || { type: 'object', properties: {} })

    return {
      type: 'function',
      function: {
        name: tool.name as string,
        description: tool.description as string | undefined,
        parameters: sanitizedSchema,
      },
    }
  } catch (error) {
    logForDebugging(
      `[toolSchemaConverter] Failed to convert tool: ${error}`,
      { level: 'warn' },
    )
    return null
  }
}

/**
 * Recursively sanitize a JSON Schema for OpenAI-compatible providers.
 *
 * Many OpenAI-compatible endpoints (Ollama, DeepSeek, vLLM, etc.) do not
 * support the `const` keyword in JSON Schema. Convert it to `enum` with a
 * single-element array, which is semantically equivalent.
 *
 * Also strips Anthropic-specific keywords that non-Anthropic endpoints
 * would reject: cache_control, defer_loading, eager_input_streaming, strict.
 */
function sanitizeJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return schema

  const result = { ...schema }

  // Strip Anthropic-specific keywords
  for (const key of ['cache_control', 'defer_loading', 'eager_input_streaming', 'strict']) {
    delete result[key]
  }

  // Convert `const` → `enum: [value]`
  if ('const' in result) {
    result.enum = [result.const]
    delete result.const
  }

  // Recursively process nested object schemas
  for (const key of ['properties', 'definitions', '$defs', 'patternProperties'] as const) {
    const nested = result[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const sanitized: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
        sanitized[k] = v && typeof v === 'object'
          ? sanitizeJsonSchema(v as Record<string, unknown>)
          : v
      }
      result[key] = sanitized
    }
  }

  // Recursively process single-schema keywords
  for (const key of ['items', 'additionalProperties', 'not', 'if', 'then', 'else', 'contains', 'propertyNames'] as const) {
    const nested = result[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      result[key] = sanitizeJsonSchema(nested as Record<string, unknown>)
    }
  }

  // Recursively process array-of-schemas keywords
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const nested = result[key]
    if (Array.isArray(nested)) {
      result[key] = nested.map(item =>
        item && typeof item === 'object'
          ? sanitizeJsonSchema(item as Record<string, unknown>)
          : item,
      )
    }
  }

  return result
}

/**
 * Convert OpenAI function-calling tool definitions back to Anthropic format.
 * Useful for testing and potential future use.
 */
export function convertToolsToAnthropic(tools: OpenAITool[]): Record<string, unknown>[] {
  return tools.map(tool => ({
    type: 'custom',
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters as Record<string, unknown>,
  }))
}
