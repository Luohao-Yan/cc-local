/**
 * Third-Party Model Capabilities Detection
 *
 * Provides default capability flags for known non-Anthropic model families.
 * For Anthropic models, capabilities are determined by the existing
 * modelSupports* functions in betas.ts and the original modelCapabilities.ts.
 *
 * This module only covers OpenAI-compatible third-party models.
 */

import type { ModelCapabilities } from './modelConfig.js'

/**
 * Detect model capabilities from the model name for known third-party families.
 * Returns partial capabilities — only the fields that can be auto-detected.
 * Returns empty object for unknown models, so callers fall through to defaults.
 */
export function detectThirdPartyCapabilities(
  modelName: string,
  apiFormat: 'anthropic' | 'openai',
): Partial<ModelCapabilities> {
  if (apiFormat === 'anthropic') {
    // For Anthropic-native endpoints, use existing modelSupports* functions
    return {}
  }

  const lower = modelName.toLowerCase()

  // DeepSeek reasoning models: support thinking via reasoning_content
  if (lower.includes('deepseek-r')) {
    return {
      thinking: true,
      structuredOutputs: false,
      interleavedThinking: false,
      effort: false,
    }
  }

  // DeepSeek chat models
  if (lower.includes('deepseek-chat') || lower.includes('deepseek-v3')) {
    return {
      thinking: false,
      structuredOutputs: false,
      interleavedThinking: false,
      effort: false,
    }
  }

  // GPT-4o and similar OpenAI models
  if (lower.match(/gpt-4/) || lower.includes('gpt-4o')) {
    return {
      thinking: false,
      structuredOutputs: true,
      interleavedThinking: false,
      effort: false,
    }
  }

  // GPT-3.5
  if (lower.includes('gpt-3.5')) {
    return {
      thinking: false,
      structuredOutputs: false,
      interleavedThinking: false,
      effort: false,
    }
  }

  // Qwen models
  if (lower.includes('qwen')) {
    return {
      thinking: false,
      structuredOutputs: false,
      interleavedThinking: false,
      effort: false,
    }
  }

  // Default for unknown OpenAI-compatible models:
  // Disable all Anthropic-specific features
  return {
    thinking: false,
    structuredOutputs: false,
    interleavedThinking: false,
    effort: false,
  }
}

/**
 * Get effective capabilities for a model by merging:
 * 1. Auto-detected defaults from model name
 * 2. User-configured overrides from models.json
 */
export function getEffectiveThirdPartyCapabilities(
  modelName: string,
  apiFormat: 'anthropic' | 'openai',
  userOverrides?: ModelCapabilities,
): ModelCapabilities {
  const detected = detectThirdPartyCapabilities(modelName, apiFormat)
  return {
    thinking: userOverrides?.thinking ?? detected.thinking ?? false,
    structuredOutputs: userOverrides?.structuredOutputs ?? detected.structuredOutputs ?? false,
    interleavedThinking: userOverrides?.interleavedThinking ?? detected.interleavedThinking ?? false,
    effort: userOverrides?.effort ?? detected.effort ?? false,
    contextWindow: userOverrides?.contextWindow ?? detected.contextWindow,
    maxOutputTokens: userOverrides?.maxOutputTokens ?? detected.maxOutputTokens,
  }
}
