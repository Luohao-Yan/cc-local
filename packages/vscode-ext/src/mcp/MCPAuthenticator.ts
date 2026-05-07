/**
 * MCP OAuth Flow for CCLocal VS Code Extension
 * Handles OAuth authentication for MCP servers requiring it
 */

import * as vscode from 'vscode'
import * as http from 'http'
import * as url from 'url'
import * as crypto from 'crypto'
import type { MCPServerInfo, MCPAuthState } from './types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MCPPromptOAuthConfig {
  /** Authorization endpoint URL */
  authorizationUrl: string

  /** Token endpoint URL */
  tokenUrl: string

  /** Client ID */
  clientId: string

  /** Client secret (optional for public clients) */
  clientSecret?: string

  /** Redirect URI (defaults to local callback) */
  redirectUri?: string

  /** OAuth scopes */
  scope?: string[]

  /** Server-specific metadata */
  serverName: string
}

export interface MCPOAuthToken {
  /** Access token */
  accessToken: string

  /** Refresh token */
  refreshToken?: string

  /** Token type (usually 'Bearer') */
  tokenType: string

  /** Expiration time in seconds from now */
  expiresIn?: number

  /** When the token was obtained */
  obtainedAt: number

  /** Scopes granted */
  scope?: string[]
}

// ─── MCP Authenticator ────────────────────────────────────────────────────────

export class MCPAuthenticator implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private context: vscode.ExtensionContext
  private pendingFlows: Map<string, {
    resolve: (token: MCPOAuthToken) => void
    reject: (error: Error) => void
    state: string
    codeVerifier: string
  }>
  private callbackServer: http.Server | null

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.LogOutputChannel
  ) {
    this.context = context
    this.outputChannel = outputChannel
    this.pendingFlows = new Map()
    this.callbackServer = null
  }

  /**
   * Authenticate an MCP server using OAuth
   */
  async authenticate(
    server: MCPServerInfo,
    config: MCPPromptOAuthConfig
  ): Promise<MCPOAuthToken> {
    this.outputChannel.info(`Starting OAuth flow for MCP server: ${server.name}`)

    // Check for existing valid token
    const existingToken = await this.getStoredToken(server.name)
    if (existingToken && !this.isTokenExpired(existingToken)) {
      this.outputChannel.debug(`Using cached token for: ${server.name}`)
      return existingToken
    }

    // Try refresh if we have a refresh token
    if (existingToken?.refreshToken) {
      try {
        const refreshed = await this.refreshToken(config, existingToken.refreshToken)
        await this.storeToken(server.name, refreshed)
        return refreshed
      } catch (error) {
        this.outputChannel.debug(`Token refresh failed for ${server.name}: ${error}`)
      }
    }

    // Start new OAuth flow
    return this.startOAuthFlow(config)
  }

  /**
   * Clear authentication for a server
   */
  async clearAuth(serverName: string): Promise<void> {
    await this.context.secrets.delete(`mcp_token_${serverName}`)
    this.outputChannel.info(`Cleared auth for MCP server: ${serverName}`)
  }

  // ─── OAuth Flow ─────────────────────────────────────────────────────────────

  private async startOAuthFlow(config: MCPPromptOAuthConfig): Promise<MCPOAuthToken> {
    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    const state = crypto.randomBytes(16).toString('hex')

    // Build authorization URL
    const authUrl = new URL(config.authorizationUrl)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', config.clientId)
    authUrl.searchParams.set('redirect_uri', config.redirectUri || this.getLocalCallbackUrl())
    authUrl.searchParams.set('scope', (config.scope || []).join(' '))
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    // Start callback server
    const callbackPort = await this.startCallbackServer()

    // Create promise for the flow
    const flowPromise = new Promise<MCPOAuthToken>((resolve, reject) => {
      this.pendingFlows.set(config.serverName, {
        resolve,
        reject,
        state,
        codeVerifier,
      })
    })

    // Open browser for authorization
    const uri = vscode.Uri.parse(authUrl.toString())
    await vscode.env.openExternal(uri)

    this.outputChannel.debug(`Opened OAuth authorization URL for: ${config.serverName}`)

    try {
      const token = await flowPromise
      await this.storeToken(config.serverName, token)
      return token
    } catch (error) {
      this.outputChannel.error(`OAuth flow failed for ${config.serverName}: ${error}`)
      throw error
    } finally {
      this.pendingFlows.delete(config.serverName)
      this.stopCallbackServer()
    }
  }

  /**
   * Handle OAuth callback
   */
  private handleCallback(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = new url.URL(req.url || '/', 'http://localhost')

    if (parsedUrl.pathname === '/callback') {
      const code = parsedUrl.searchParams.get('code')
      const state = parsedUrl.searchParams.get('state')
      const error = parsedUrl.searchParams.get('error')

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<h1>Authentication Failed</h1><p>You can close this window.</p>')
        this.rejectAllFlows(new Error(`OAuth error: ${error}`))
        return
      }

      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<h1>Invalid Callback</h1><p>You can close this window.</p>')
        return
      }

      // Find matching pending flow
      for (const [serverName, flow] of this.pendingFlows) {
        if (flow.state === state) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(`
            <h1>Authentication Successful</h1>
            <p>You can close this window and return to VS Code.</p>
            <script>window.close()</script>
          `)
          // Resolve with the code - token exchange will be done by caller
          // For now, we'll create a simple token from the code
          flow.resolve({
            accessToken: code,
            tokenType: 'pending',
            obtainedAt: Date.now(),
          })
          return
        }
      }

      res.writeHead(400, { 'Content-Type': 'text/html' })
      res.end('<h1>No matching flow found</h1><p>You can close this window.</p>')
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  }

  /**
   * Exchange authorization code for token
   */
  async exchangeCode(
    config: MCPPromptOAuthConfig,
    code: string,
    codeVerifier: string
  ): Promise<MCPOAuthToken> {
    const tokenUrl = new URL(config.tokenUrl)

    const body = new URLSearchParams()
    body.set('grant_type', 'authorization_code')
    body.set('code', code)
    body.set('client_id', config.clientId)
    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret)
    }
    body.set('redirect_uri', config.redirectUri || this.getLocalCallbackUrl())
    body.set('code_verifier', codeVerifier)

    const response = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as Record<string, unknown>

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      tokenType: (data.token_type as string) || 'Bearer',
      expiresIn: data.expires_in as number | undefined,
      obtainedAt: Date.now(),
      scope: typeof data.scope === 'string' ? data.scope.split(' ') : undefined,
    }
  }

  /**
   * Refresh an expired token
   */
  private async refreshToken(
    config: MCPPromptOAuthConfig,
    refreshToken: string
  ): Promise<MCPOAuthToken> {
    const tokenUrl = new URL(config.tokenUrl)

    const body = new URLSearchParams()
    body.set('grant_type', 'refresh_token')
    body.set('refresh_token', refreshToken)
    body.set('client_id', config.clientId)
    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret)
    }

    const response = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const data = await response.json() as Record<string, unknown>

    return {
      accessToken: data.access_token as string,
      refreshToken: (data.refresh_token as string) || refreshToken,
      tokenType: (data.token_type as string) || 'Bearer',
      expiresIn: data.expires_in as number | undefined,
      obtainedAt: Date.now(),
      scope: typeof data.scope === 'string' ? data.scope.split(' ') : undefined,
    }
  }

  // ─── Callback Server ────────────────────────────────────────────────────────

  private async startCallbackServer(): Promise<number> {
    if (this.callbackServer) {
      return 0
    }

    return new Promise((resolve) => {
      this.callbackServer = http.createServer((req, res) => {
        this.handleCallback(req, res)
      })

      this.callbackServer.listen(0, '127.0.0.1', () => {
        const address = this.callbackServer?.address()
        const port = address && typeof address === 'object' ? address.port : 0
        this.outputChannel.debug(`OAuth callback server started on port ${port}`)
        resolve(port)
      })
    })
  }

  private stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close()
      this.callbackServer = null
      this.outputChannel.debug('OAuth callback server stopped')
    }
  }

  private getLocalCallbackUrl(): string {
    const address = this.callbackServer?.address()
    const port = address && typeof address === 'object' ? address.port : 8765
    return `http://127.0.0.1:${port}/callback`
  }

  // ─── Token Storage ──────────────────────────────────────────────────────────

  private async getStoredToken(serverName: string): Promise<MCPOAuthToken | undefined> {
    const stored = await this.context.secrets.get(`mcp_token_${serverName}`)
    if (!stored) return undefined

    try {
      return JSON.parse(stored) as MCPOAuthToken
    } catch {
      return undefined
    }
  }

  private async storeToken(serverName: string, token: MCPOAuthToken): Promise<void> {
    await this.context.secrets.store(
      `mcp_token_${serverName}`,
      JSON.stringify(token)
    )
  }

  private isTokenExpired(token: MCPOAuthToken): boolean {
    if (!token.expiresIn) return false
    // Consider expired if within 5 minutes of expiration
    const expiresAt = token.obtainedAt + (token.expiresIn - 300) * 1000
    return Date.now() > expiresAt
  }

  // ─── PKCE ───────────────────────────────────────────────────────────────────

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(verifier).digest()
    return hash.toString('base64url')
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private rejectAllFlows(error: Error): void {
    for (const [, flow] of this.pendingFlows) {
      flow.reject(error)
    }
    this.pendingFlows.clear()
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  dispose(): void {
    this.stopCallbackServer()
    this.rejectAllFlows(new Error('Authenticator disposed'))
    this.outputChannel.debug('MCPAuthenticator disposed')
  }
}
