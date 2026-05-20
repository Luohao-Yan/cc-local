/**
 * Authentication Manager for CCLocal VS Code Extension
 * Central manager for all authentication providers
 */

import * as vscode from 'vscode'
import { SecureStorage } from './SecureStorage'
import { OAuthClient } from './OAuthClient'
import { ApiKeyAuth } from './ApiKeyAuth'
import { AnthropicAuth } from './providers/AnthropicAuth'
import { BedrockAuth } from './providers/BedrockAuth'
import { VertexAuth } from './providers/VertexAuth'
import { CustomProviderAuth } from './providers/CustomProviderAuth'

export type AuthMethod =
  | 'claudeai'    // Claude.ai OAuth
  | 'console'     // API Key (Console)
  | 'bedrock'     // AWS Bedrock
  | 'vertex'      // GCP Vertex AI
  | 'foundry'     // Azure Foundry
  | 'custom'      // Third-party API (OpenAI compatible)

export type AuthStatus =
  | 'unauthenticated'
  | 'authenticated'
  | 'expired'
  | 'error'

export interface AuthState {
  method: AuthMethod | null
  status: AuthStatus
  provider?: string
  userId?: string
  email?: string
  organization?: string
  expiresAt?: number
  error?: string
}

export interface AuthConfig {
  forceLoginMethod?: AuthMethod
  forceLoginOrgUUID?: string
  disableLoginPrompt?: boolean
}

// ─── Provider Configurations ────────────────────────────────────────────────────

const PROVIDER_CONFIGS = {
  claudeai: {
    name: 'Claude.ai',
    description: 'Claude Pro/Max subscription',
    icon: '🤖',
    requiresOAuth: true,
  },
  console: {
    name: 'API Key',
    description: 'Anthropic Console API Key',
    icon: '🔑',
    requiresOAuth: false,
  },
  bedrock: {
    name: 'AWS Bedrock',
    description: 'Amazon Bedrock',
    icon: '☁️',
    requiresOAuth: false,
  },
  vertex: {
    name: 'Google Vertex AI',
    description: 'Google Cloud Vertex AI',
    icon: '🔷',
    requiresOAuth: false,
  },
  foundry: {
    name: 'Azure Foundry',
    description: 'Azure AI Foundry',
    icon: '🪟',
    requiresOAuth: false,
  },
  custom: {
    name: 'Custom Provider',
    description: 'Third-party API (OpenAI compatible)',
    icon: '🔌',
    requiresOAuth: false,
  },
}

// ─── Auth Manager ────────────────────────────────────────────────────────────────

export class AuthManager implements vscode.Disposable {
  private storage: SecureStorage
  private state: AuthState = {
    method: null,
    status: 'unauthenticated',
  }
  private providers: Map<AuthMethod, ApiKeyAuth | OAuthClient> = new Map()

  private onDidChangeStateEmitter = new vscode.EventEmitter<AuthState>()
  public readonly onDidChangeState = this.onDidChangeStateEmitter.event

  constructor(
    private context: vscode.ExtensionContext,
    private config: AuthConfig
  ) {
    this.storage = new SecureStorage(context)
    this.initializeProviders()
  }

  // ─── Initialization ──────────────────────────────────────────────────────────

  private initializeProviders(): void {
    // Initialize Anthropic OAuth
    this.providers.set('claudeai', new AnthropicAuth(this.storage))

    // Initialize API Key providers
    this.providers.set('console', new ApiKeyAuth('anthropic', {
      provider: 'anthropic',
      envVarName: 'ANTHROPIC_API_KEY',
    }, this.storage))

    this.providers.set('bedrock', new BedrockAuth(this.storage))
    this.providers.set('vertex', new VertexAuth(this.storage))
    this.providers.set('custom', new CustomProviderAuth(this.storage))
  }

  /**
   * Check current authentication status
   */
  async checkAuthStatus(): Promise<AuthState> {
    // Check each provider in order
    const methods: AuthMethod[] = ['claudeai', 'console', 'bedrock', 'vertex', 'custom']

    for (const method of methods) {
      const provider = this.providers.get(method)
      if (!provider) continue

      const isAuthenticated = await this.checkProviderAuth(method, provider)

      if (isAuthenticated) {
        this.state = {
          method,
          status: 'authenticated',
          provider: PROVIDER_CONFIGS[method]?.name,
        }
        this.onDidChangeStateEmitter.fire(this.state)
        return this.state
      }
    }

    // Not authenticated with any provider
    this.state = {
      method: null,
      status: 'unauthenticated',
    }
    this.onDidChangeStateEmitter.fire(this.state)
    return this.state
  }

  /**
   * Check if a specific provider is authenticated
   */
  private async checkProviderAuth(
    method: AuthMethod,
    provider: ApiKeyAuth | OAuthClient
  ): Promise<boolean> {
    if (provider instanceof OAuthClient) {
      return provider.isAuthenticated()
    } else {
      return provider.hasApiKey()
    }
  }

  // ─── Login Methods ────────────────────────────────────────────────────────────

  /**
   * Login with specified method
   */
  async login(method: AuthMethod): Promise<boolean> {
    try {
      this.state = { method, status: 'connecting' as AuthStatus }
      this.onDidChangeStateEmitter.fire(this.state)

      switch (method) {
        case 'claudeai':
          return await this.loginClaudeAI()
        case 'console':
          return await this.loginConsole()
        case 'bedrock':
          return await this.loginBedrock()
        case 'vertex':
          return await this.loginVertex()
        case 'custom':
          return await this.loginCustom()
        default:
          throw new Error(`Unknown auth method: ${method}`)
      }
    } catch (error) {
      this.state = {
        method,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
      this.onDidChangeStateEmitter.fire(this.state)
      return false
    }
  }

  /**
   * Login with Claude.ai OAuth
   */
  private async loginClaudeAI(): Promise<boolean> {
    const provider = this.providers.get('claudeai') as OAuthClient
    await provider.startFlow()
    return this.checkAuthStatus().then(s => s.status === 'authenticated')
  }

  /**
   * Login with API Key
   */
  private async loginConsole(): Promise<boolean> {
    const provider = this.providers.get('console') as ApiKeyAuth
    const apiKey = await provider.promptForApiKey()
    if (!apiKey) return false

    const validation = await provider.validateApiKey(apiKey)
    if (!validation.valid) {
      vscode.window.showErrorMessage(`Invalid API key: ${validation.error}`)
      return false
    }

    await provider.storeApiKey(apiKey)
    return this.checkAuthStatus().then(s => s.status === 'authenticated')
  }

  /**
   * Login with AWS Bedrock
   */
  private async loginBedrock(): Promise<boolean> {
    // Show Bedrock configuration
    const bedrockAuth = this.providers.get('bedrock') as unknown as BedrockAuth
    const configured = await bedrockAuth.configure()
    if (configured) {
      return this.checkAuthStatus().then(s => s.status === 'authenticated')
    }
    return false
  }

  /**
   * Login with GCP Vertex AI
   */
  private async loginVertex(): Promise<boolean> {
    const vertexAuth = this.providers.get('vertex') as unknown as VertexAuth
    const configured = await vertexAuth.configure()
    if (configured) {
      return this.checkAuthStatus().then(s => s.status === 'authenticated')
    }
    return false
  }

  /**
   * Login with Custom Provider
   */
  private async loginCustom(): Promise<boolean> {
    const customAuth = this.providers.get('custom') as CustomProviderAuth
    const configured = await customAuth.configure()
    if (configured) {
      return this.checkAuthStatus().then(s => s.status === 'authenticated')
    }
    return false
  }

  // ─── Logout ────────────────────────────────────────────────────────────────────

  /**
   * Logout from current provider
   */
  async logout(): Promise<void> {
    if (this.state.method) {
      const provider = this.providers.get(this.state.method)
      if (provider) {
        if (provider instanceof OAuthClient) {
          await provider.logout()
        } else {
          await provider.deleteApiKey()
        }
      }
    }

    this.state = { method: null, status: 'unauthenticated' }
    this.onDidChangeStateEmitter.fire(this.state)
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────────

  /**
   * Show login method picker
   */
  async showLoginPicker(): Promise<AuthMethod | undefined> {
    const items = Object.entries(PROVIDER_CONFIGS).map(([key, config]) => ({
      label: `${config.icon} ${config.name}`,
      description: config.description,
      method: key as AuthMethod,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select authentication method',
    })

    return selected?.method
  }

  /**
   * Get provider display info
   */
  getProviderInfo(method: AuthMethod) {
    return PROVIDER_CONFIGS[method]
  }

  /**
   * Get current state
   */
  getState(): AuthState {
    return { ...this.state }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.state.status === 'authenticated'
  }

  // ─── Token Management ──────────────────────────────────────────────────────────

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(): Promise<string | undefined> {
    if (!this.state.method) return undefined

    const provider = this.providers.get(this.state.method)
    if (!provider) return undefined

    if (provider instanceof OAuthClient) {
      return provider.getAccessToken()
    } else {
      return provider.getApiKey()
    }
  }

  /**
   * Refresh authentication
   */
  async refreshAuth(): Promise<boolean> {
    if (!this.state.method) return false

    const provider = this.providers.get(this.state.method)
    if (!provider) return false

    if (provider instanceof OAuthClient) {
      try {
        await provider.refreshToken()
        return true
      } catch {
        return false
      }
    }

    return true
  }

  // ─── Dispose ───────────────────────────────────────────────────────────────────

  dispose(): void {
    this.providers.forEach(provider => provider.dispose())
    this.providers.clear()
    this.storage.dispose()
    this.onDidChangeStateEmitter.dispose()
  }
}
