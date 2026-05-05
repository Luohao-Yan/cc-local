/**
 * OpenAI Thinking/Reasoning Utilities
 *
 * Shared between core (OpenAICompatibleClient) and CLI (openaiClient.ts)
 * so that thinking detection, URL normalization, and client caching are
 * defined exactly once.
 */

// ===== Thinking parameter injection =====

/**
 * Detect whether thinking/reasoning parameters should be injected
 * into the request for a given model.
 *
 * Checks (in order):
 * 1. Explicit disable via OPENAI_ENABLE_THINKING=0|false|no|off
 * 2. Explicit enable via OPENAI_ENABLE_THINKING=1|true|yes|on
 * 3. Auto-detect from model name (DeepSeek family)
 */
export function isOpenAIThinkingEnabled(model: string): boolean {
  const env = process.env.OPENAI_ENABLE_THINKING
  if (env && /^(0|false|no|off)$/i.test(env)) return false
  if (env && /^(1|true|yes|on)$/i.test(env)) return true
  return /deepseek/i.test(model)
}

// ===== URL normalization =====

/**
 * Normalize a base URL for the OpenAI SDK.
 *
 * The SDK appends /chat/completions automatically, so we need to ensure
 * the base URL ends at the right path level:
 * - If URL already ends with /chat/completions → strip it back to base
 * - Otherwise → keep as-is (SDK knows how to append)
 */
export function normalizeBaseUrl(baseUrl: string): string {
  let url = baseUrl.replace(/\/+$/, '')
  if (url.endsWith('/chat/completions')) {
    url = url.replace(/\/chat\/completions$/, '')
  }
  return url
}
