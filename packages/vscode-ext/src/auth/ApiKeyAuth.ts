/**
 * API Key Authentication for CCLocal VS Code Extension
 * Handles API key based authentication for various providers
 */

import * as vscode from 'vscode'
import { SecureStorage } from './SecureStorage'

export interface ApiKeyConfig {
  provider: string
  envVarName?: string
  headerName?: string
  prefix?: string
}

export interface ApiKeyValidationResult {
  valid: boolean
  error?: string
  provider?: string
  scopes?: string[]
}

/**
 * API Key Authentication Manager
 */
export class ApiKeyAuth {
  private storage: SecureStorage

  constructor(
    private provider: string,
    private config: ApiKeyConfig,
    storage: SecureStorage
  ) {
    this.storage = storage
  }

  /**
   * Get API key from various sources
   * Priority: stored key > environment variable > user input
   */
  async getApiKey(): Promise<string | undefined> {
    // 1. Check stored API key
    const storedKey = await this.storage.getApiKey(this.provider)
    if (storedKey) {
      return storedKey
    }

    // 2. Check environment variable
    if (this.config.envVarName) {
      const envKey = process.env[this.config.envVarName]
      if (envKey) {
        return envKey
      }
    }

    // 3. Check standard environment variables based on provider
    const standardEnvVars = this.getStandardEnvVars()
    for (const envVar of standardEnvVars) {
      const envKey = process.env[envVar]
      if (envKey) {
        return envKey
      }
    }

    return undefined
  }

  /**
   * Store API key securely
   */
  async storeApiKey(apiKey: string): Promise<void> {
    await this.storage.storeApiKey(this.provider, apiKey)
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    // Different validation logic per provider
    switch (this.provider) {
      case 'anthropic':
        return this.validateAnthropicKey(apiKey)
      case 'openai':
        return this.validateOpenAIKey(apiKey)
      case 'bedrock':
        return this.validateBedrockKey(apiKey)
      case 'vertex':
        return this.validateVertexKey(apiKey)
      default:
        // Generic validation - check format
        return this.validateGenericKey(apiKey)
    }
  }

  /**
   * Validate Anthropic API key
   */
  private async validateAnthropicKey(apiKey: string): Promise<ApiKeyValidationResult> {
    // Check format (starts with sk-ant-)
    if (!apiKey.startsWith('sk-ant-')) {
      return {
        valid: false,
        error: 'Invalid Anthropic API key format. Key should start with sk-ant-',
      }
    }

    try {
      // Make test request to Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      })

      if (response.ok) {
        return { valid: true, provider: 'anthropic' }
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' }
      }

      return { valid: false, error: `API error: ${response.status}` }
    } catch (error) {
      return { valid: false, error: `Connection error: ${error}` }
    }
  }

  /**
   * Validate OpenAI API key
   */
  private async validateOpenAIKey(apiKey: string): Promise<ApiKeyValidationResult> {
    // Check format (starts with sk-)
    if (!apiKey.startsWith('sk-')) {
      return {
        valid: false,
        error: 'Invalid OpenAI API key format. Key should start with sk-',
      }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (response.ok) {
        return { valid: true, provider: 'openai' }
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' }
      }

      return { valid: false, error: `API error: ${response.status}` }
    } catch (error) {
      return { valid: false, error: `Connection error: ${error}` }
    }
  }

  /**
   * Validate AWS Bedrock credentials
   */
  private async validateBedrockKey(apiKey: string): Promise<ApiKeyValidationResult> {
    // Bedrock uses AWS credentials, not a simple API key
    // This would need AWS SDK integration
    return { valid: true, provider: 'bedrock' }
  }

  /**
   * Validate GCP Vertex AI credentials
   */
  private async validateVertexKey(apiKey: string): Promise<ApiKeyValidationResult> {
    // Vertex uses GCP credentials
    return { valid: true, provider: 'vertex' }
  }

  /**
   * Generic API key validation
   */
  private async validateGenericKey(apiKey: string): Promise<ApiKeyValidationResult> {
    // Basic validation - non-empty and reasonable length
    if (!apiKey || apiKey.length < 10) {
      return { valid: false, error: 'API key is too short' }
    }

    return { valid: true, provider: this.provider }
  }

  /**
   * Get standard environment variables for provider
   */
  private getStandardEnvVars(): string[] {
    const envVarMap: Record<string, string[]> = {
      anthropic: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
      openai: ['OPENAI_API_KEY'],
      bedrock: ['AWS_ACCESS_KEY_ID'],
      vertex: ['GOOGLE_APPLICATION_CREDENTIALS'],
    }

    return envVarMap[this.provider] || []
  }

  /**
   * Prompt user for API key
   */
  async promptForApiKey(): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      prompt: `Enter your ${this.provider} API key`,
      password: true,
      placeHolder: `Enter your ${this.provider} API key`,
      validateInput: async (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key cannot be empty'
        }
        return null
      },
    })

    return apiKey
  }

  /**
   * Delete stored API key
   */
  async deleteApiKey(): Promise<void> {
    await this.storage.delete(`apikey_${this.provider}`)
  }

  /**
   * Check if API key exists
   */
  async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey()
    return key !== undefined && key.length > 0
  }

  /**
   * Get authorization header value
   */
  async getAuthHeader(): Promise<string | undefined> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      return undefined
    }

    const prefix = this.config.prefix || 'Bearer '
    return `${prefix}${apiKey}`
  }

  /**
   * Dispose
   */
  dispose(): void {
    // Nothing to clean up
  }
}
