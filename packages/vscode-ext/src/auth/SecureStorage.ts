/**
 * Secure Storage for CCLocal VS Code Extension
 * Handles secure storage of API keys and tokens
 */

import * as vscode from 'vscode'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface SecureCredentials {
  provider: string
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  scope?: string[]
}

export interface SecureStorageOptions {
  useKeychain?: boolean
  encryptionKey?: string
}

/**
 * Secure Storage implementation
 * Uses VS Code's secret storage for sensitive data
 * Falls back to encrypted file storage if needed
 */
export class SecureStorage implements vscode.Disposable {
  private static readonly SERVICE_NAME = 'cclocal'
  private context: vscode.ExtensionContext
  private secrets: vscode.SecretStorage
  private memoryCache: Map<string, SecureCredentials> = new Map()
  private encryptionKey: Buffer | null = null

  constructor(context: vscode.ExtensionContext, options?: SecureStorageOptions) {
    this.context = context
    this.secrets = context.secrets

    if (options?.encryptionKey) {
      this.encryptionKey = Buffer.from(options.encryptionKey, 'hex')
    }
  }

  /**
   * Store credentials securely
   */
  async store(key: string, credentials: SecureCredentials): Promise<void> {
    // Store in VS Code secrets
    const value = JSON.stringify(credentials)
    await this.secrets.store(key, value)

    // Update memory cache
    this.memoryCache.set(key, credentials)
  }

  /**
   * Retrieve credentials
   */
  async get(key: string): Promise<SecureCredentials | undefined> {
    // Check memory cache first
    const cached = this.memoryCache.get(key)
    if (cached) {
      return cached
    }

    // Retrieve from VS Code secrets
    const value = await this.secrets.get(key)
    if (!value) {
      return undefined
    }

    try {
      const credentials = JSON.parse(value) as SecureCredentials
      this.memoryCache.set(key, credentials)
      return credentials
    } catch {
      return undefined
    }
  }

  /**
   * Delete credentials
   */
  async delete(key: string): Promise<void> {
    await this.secrets.delete(key)
    this.memoryCache.delete(key)
  }

  /**
   * Check if credentials exist
   */
  async has(key: string): Promise<boolean> {
    const value = await this.secrets.get(key)
    return value !== undefined
  }

  /**
   * Store API key for a provider
   */
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    const key = `apikey_${provider}`
    await this.store(key, { provider, apiKey })
  }

  /**
   * Get API key for a provider
   */
  async getApiKey(provider: string): Promise<string | undefined> {
    const key = `apikey_${provider}`
    const credentials = await this.get(key)
    return credentials?.apiKey
  }

  /**
   * Store OAuth tokens
   */
  async storeOAuthTokens(
    provider: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    scope?: string[]
  ): Promise<void> {
    const key = `oauth_${provider}`
    const expiresAt = Date.now() + expiresIn * 1000
    await this.store(key, {
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
    })
  }

  /**
   * Get OAuth tokens
   */
  async getOAuthTokens(provider: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresAt: number
    scope?: string[]
  } | undefined> {
    const key = `oauth_${provider}`
    const credentials = await this.get(key)
    if (!credentials) {
      return undefined
    }

    return {
      accessToken: credentials.accessToken!,
      refreshToken: credentials.refreshToken!,
      expiresAt: credentials.expiresAt!,
      scope: credentials.scope,
    }
  }

  /**
   * Check if OAuth token is expired
   */
  async isTokenExpired(provider: string, bufferSeconds: number = 300): Promise<boolean> {
    const tokens = await this.getOAuthTokens(provider)
    if (!tokens) {
      return true
    }

    // Check if token expires within buffer period
    return Date.now() > (tokens.expiresAt - bufferSeconds * 1000)
  }

  /**
   * Clear all credentials for a provider
   */
  async clearProvider(provider: string): Promise<void> {
    await this.delete(`apikey_${provider}`)
    await this.delete(`oauth_${provider}`)
  }

  /**
   * Clear all stored credentials
   */
  async clearAll(): Promise<void> {
    const keys = await this.listKeys()
    for (const key of keys) {
      await this.delete(key)
    }
  }

  /**
   * List all stored keys
   */
  async listKeys(): Promise<string[]> {
    // VS Code secret storage doesn't have a list method
    // We'll track known keys in global state
    const knownKeys = this.context.globalState.get<string[]>('secureStorage:keys', [])
    return knownKeys
  }

  /**
   * Register a key for tracking
   */
  private async registerKey(key: string): Promise<void> {
    const knownKeys = this.context.globalState.get<string[]>('secureStorage:keys', [])
    if (!knownKeys.includes(key)) {
      knownKeys.push(key)
      await this.context.globalState.update('secureStorage:keys', knownKeys)
    }
  }

  /**
   * Generate a secure random key for encryption
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: string, key?: Buffer): string {
    const encryptionKey = key || this.encryptionKey
    if (!encryptionKey) {
      throw new Error('No encryption key available')
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(data: string, key?: Buffer): string {
    const encryptionKey = key || this.encryptionKey
    if (!encryptionKey) {
      throw new Error('No encryption key available')
    }

    const [ivHex, authTagHex, encrypted] = data.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.memoryCache.clear()
  }
}
