import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'openai' | 'custom'

/** API message format used by a provider */
export type APIFormat = 'anthropic' | 'openai'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Detect the effective API provider type from a base URL.
 * Used to determine API format when no explicit providerType is configured.
 */
export function detectProviderFromUrl(baseUrl: string): APIProvider {
  try {
    const url = new URL(baseUrl)
    const host = url.hostname.toLowerCase()
    const hostWithPort = url.host.toLowerCase() // includes port

    // Anthropic first-party (exact match or subdomain)
    if (host === 'api.anthropic.com' || host.endsWith('.anthropic.com')) return 'firstParty'
    // AWS Bedrock
    if (host.includes('bedrock') && host.endsWith('.amazonaws.com')) return 'bedrock'
    // Google Vertex AI
    if (host.endsWith('.aiplatform.googleapis.com')) return 'vertex'
    // Azure Foundry
    if (host.endsWith('.services.ai.azure.com')) return 'foundry'

    // OpenAI-compatible hosts
    if (host === 'api.openai.com' || host.endsWith('.openai.com')) return 'openai'
    if (host === 'api.deepseek.com' || host.endsWith('.deepseek.com')) return 'openai'
    if (host.endsWith('.volces.com')) return 'openai'

    // Local servers — must use hostWithPort since hostname strips the port
    if (hostWithPort === 'localhost:11434' || hostWithPort === '127.0.0.1:11434') return 'openai' // Ollama
    if (hostWithPort === 'localhost:1234' || hostWithPort === '127.0.0.1:1234') return 'openai' // LM Studio
    if (host === 'localhost' || host === '127.0.0.1') return 'openai' // other local with any port

    // Default: custom provider
    return 'custom'
  } catch {
    return 'custom'
  }
}

/**
 * Resolve the API format for a given provider type.
 * Anthropic-native providers use 'anthropic' format; OpenAI-compatible use 'openai'.
 */
export function getDefaultAPIFormat(provider: APIProvider): APIFormat {
  switch (provider) {
    case 'firstParty':
    case 'bedrock':
    case 'vertex':
    case 'foundry':
      return 'anthropic'
    case 'openai':
    case 'custom':
      return 'openai'
  }
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
