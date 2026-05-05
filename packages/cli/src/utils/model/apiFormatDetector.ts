/**
 * API Format Auto-Detector
 *
 * Automatically detects the correct API format (anthropic vs openai) from a
 * base URL. Uses known hostname patterns to make a best-effort determination,
 * with a sensible default for unknown URLs.
 *
 * The detection is conservative: it defaults to 'anthropic' for unknown URLs
 * to maintain backward compatibility with existing configurations.
 */

import type { APIFormat } from './providers.js'

/** Known Anthropic-native host patterns */
const ANTHROPIC_HOSTS = [
  'api.anthropic.com',
  'api-staging.anthropic.com',
]

/** Known Anthropic-native host suffixes */
const ANTHROPIC_SUFFIXES = [
  '.amazonaws.com',       // AWS Bedrock
  '.aiplatform.googleapis.com', // Google Vertex AI
  '.services.ai.azure.com',     // Azure Foundry
]

/** Known OpenAI-compatible host patterns */
const OPENAI_HOSTS = [
  'api.openai.com',
  'api.deepseek.com',
  'api.siliconflow.cn',
  'api.groq.com',
  'api.mistral.ai',
  'api.x.ai',
  'api.together.ai',
  'api.fireworks.ai',
  'api.perplexity.ai',
  'api.cohere.ai',
  'api.anyscale.com',
]

/** Known OpenAI-compatible host suffixes */
const OPENAI_SUFFIXES = [
  '.volces.com',         // Doubao/Ark (ByteDance)
  '.dashscope.aliyuncs.com', // Alibaba Qwen
  '.bigmodel.cn',        // Zhipu AI
  '.moonshot.cn',        // Kimi/Moonshot
  '.minimaxi.chat',      // MiniMax
  '.stepfun.com',        // StepFun
  '.yi.com',             // 01.AI
  '.baichuan-ai.com',    // Baichuan
  '.mistral.ai',        // Mistral
  '.x.ai',              // xAI/Grok
]

/** Known local/OpenAI-compatible ports */
const LOCAL_PATTERNS = [
  'localhost:11434',     // Ollama
  '127.0.0.1:11434',    // Ollama
  'localhost:1234',     // LM Studio
  '127.0.0.1:1234',     // LM Studio
  'localhost:8080',     // Various
  'localhost:5000',     // Various
]

/**
 * Auto-detect the API format from a base URL.
 *
 * Detection strategy:
 * 1. Check exact hostname matches against known Anthropic-native hosts
 * 2. Check hostname suffixes against known Anthropic-native patterns
 * 3. Check exact hostname matches against known OpenAI-compatible hosts
 * 4. Check hostname suffixes against known OpenAI-compatible patterns
 * 5. Check for local development server patterns (Ollama, LM Studio, etc.)
 * 6. Check URL path hints (/v1 suggests OpenAI format)
 * 7. Default to 'anthropic' for backward compatibility
 */
export function detectAPIFormat(baseUrl: string): APIFormat {
  try {
    const url = new URL(baseUrl)
    const host = url.hostname.toLowerCase()
    const hostWithPort = `${host}:${url.port}`

    // 1. Known Anthropic-native hosts (exact match)
    if (ANTHROPIC_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) {
      return 'anthropic'
    }

    // 2. Known Anthropic-native suffixes (Bedrock, Vertex, Foundry)
    if (ANTHROPIC_SUFFIXES.some(s => host.endsWith(s))) {
      return 'anthropic'
    }

    // 3. Known OpenAI-compatible hosts (exact match)
    if (OPENAI_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) {
      return 'openai'
    }

    // 4. Known OpenAI-compatible suffixes (Doubao, Qwen, etc.)
    if (OPENAI_SUFFIXES.some(s => host.endsWith(s))) {
      return 'openai'
    }

    // 5. Local development servers (Ollama, LM Studio, etc.)
    if (LOCAL_PATTERNS.some(p => hostWithPort === p)) {
      return 'openai'
    }

    // 5b. Any localhost/127.0.0.1 with any port is likely OpenAI-compatible
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return 'openai'
    }

    // 6. URL path hint: /v1 or /v3 at the end suggests OpenAI format
    const path = url.pathname.replace(/\/+$/, '')
    if (/\/v\d+$/.test(path)) {
      return 'openai'
    }

    // 7. Default: anthropic for backward compatibility
    return 'anthropic'
  } catch {
    // Invalid URL — default to anthropic
    return 'anthropic'
  }
}

/**
 * Get a human-readable description for a detected API format.
 */
export function getFormatDescription(format: APIFormat): string {
  switch (format) {
    case 'anthropic':
      return 'Anthropic Messages API (/v1/messages)'
    case 'openai':
      return 'OpenAI Chat Completions API (/v1/chat/completions)'
  }
}

/**
 * Get a short label for display in tables.
 */
export function getFormatLabel(format: APIFormat): string {
  switch (format) {
    case 'anthropic':
      return 'anthropic'
    case 'openai':
      return 'openai'
  }
}