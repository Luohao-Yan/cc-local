/**
 * OAuth 2.0 Client for CCLocal VS Code Extension
 * Implements OAuth 2.0 with PKCE extension for secure authorization
 */

import * as vscode from 'vscode'
import * as http from 'http'
import * as crypto from 'crypto'
import * as url from 'url'
import { SecureStorage } from './SecureStorage'

export interface OAuthConfig {
  clientId: string
  authorizationEndpoint: string
  tokenEndpoint: string
  redirectUri?: string
  scope: string[]
  usePKCE?: boolean
  port?: number
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  scope?: string[]
}

export interface OAuthState {
  codeVerifier: string
  codeChallenge: string
  state: string
  redirectUri: string
}

/**
 * OAuth 2.0 Client with PKCE support
 */
export class OAuthClient {
  private storage: SecureStorage
  private server: http.Server | null = null
  private pendingStates: Map<string, OAuthState> = new Map()

  constructor(
    private provider: string,
    private config: OAuthConfig,
    storage: SecureStorage
  ) {
    this.storage = storage
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    // Generate 32-64 random bytes, base64url encode
    const bytes = crypto.randomBytes(32)
    return bytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')

    return hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * Build authorization URL
   */
  buildAuthorizationUrl(redirectUri: string): { url: string; state: OAuthState } {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = this.config.usePKCE !== false
      ? this.generateCodeChallenge(codeVerifier)
      : ''

    const state = this.generateState()

    const oauthState: OAuthState = {
      codeVerifier,
      codeChallenge,
      state,
      redirectUri,
    }

    // Store state for verification
    this.pendingStates.set(state, oauthState)

    // Build URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scope.join(' '),
      state,
    })

    if (this.config.usePKCE !== false) {
      params.append('code_challenge', codeChallenge)
      params.append('code_challenge_method', 'S256')
    }

    const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`

    return { url: authUrl, state: oauthState }
  }

  /**
   * Start local server to receive OAuth callback
   */
  async startCallbackServer(): Promise<number> {
    const port = this.config.port || this.findAvailablePort()

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleCallback(req, res)
      })

      this.server.listen(port, '127.0.0.1', () => {
        resolve(port)
      })

      this.server.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Find available port
   */
  private findAvailablePort(): number {
    // Try common ports for OAuth callback
    return 8765 + Math.floor(Math.random() * 1000)
  }

  /**
   * Handle OAuth callback
   */
  private handleCallback(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    const parsedUrl = url.parse(req.url || '', true)

    if (parsedUrl.pathname === '/callback' || parsedUrl.pathname === '/') {
      const code = parsedUrl.query.code as string
      const state = parsedUrl.query.state as string
      const error = parsedUrl.query.error as string
      const errorDescription = parsedUrl.query.error_description as string

      if (error) {
        this.sendErrorResponse(res, error, errorDescription)
        return
      }

      if (!code || !state) {
        this.sendErrorResponse(res, 'invalid_request', 'Missing code or state')
        return
      }

      // Verify state
      const oauthState = this.pendingStates.get(state)
      if (!oauthState) {
        this.sendErrorResponse(res, 'invalid_state', 'Invalid or expired state')
        return
      }

      // Clean up state
      this.pendingStates.delete(state)

      // Exchange code for tokens
      this.exchangeCodeForTokens(code, oauthState)
        .then((tokens) => {
          this.sendSuccessResponse(res)
          this.stopCallbackServer()
        })
        .catch((err) => {
          this.sendErrorResponse(res, 'token_exchange_failed', err.message)
          this.stopCallbackServer()
        })
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    oauthState: OAuthState
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauthState.redirectUri,
      client_id: this.config.clientId,
    })

    if (this.config.usePKCE !== false) {
      params.append('code_verifier', oauthState.codeVerifier)
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      scope?: string
    }

    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope?.split(' '),
    }

    // Store tokens securely
    await this.storage.storeOAuthTokens(
      this.provider,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
      tokens.scope
    )

    return tokens
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<OAuthTokens> {
    const tokens = await this.storage.getOAuthTokens(this.provider)
    if (!tokens) {
      throw new Error('No tokens to refresh')
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: this.config.clientId,
    })

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      // Token refresh failed, need to re-authenticate
      await this.storage.delete(`oauth_${this.provider}`)
      throw new Error('Token refresh failed')
    }

    const data = await response.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      token_type: string
      scope?: string
    }

    const newTokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope?.split(' '),
    }

    await this.storage.storeOAuthTokens(
      this.provider,
      newTokens.accessToken,
      newTokens.refreshToken,
      newTokens.expiresIn,
      newTokens.scope
    )

    return newTokens
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(): Promise<string> {
    const isExpired = await this.storage.isTokenExpired(this.provider)

    if (isExpired) {
      const tokens = await this.refreshToken()
      return tokens.accessToken
    }

    const tokens = await this.storage.getOAuthTokens(this.provider)
    return tokens!.accessToken
  }

  /**
   * Start OAuth flow
   */
  async startFlow(): Promise<OAuthTokens> {
    // Start callback server
    const port = await this.startCallbackServer()
    const redirectUri = `http://127.0.0.1:${port}/callback`

    // Build authorization URL
    const { url: authUrl, state } = this.buildAuthorizationUrl(redirectUri)

    // Open browser
    await vscode.env.openExternal(vscode.Uri.parse(authUrl))

    // Wait for callback (with timeout)
    return this.waitForCallback(120000) // 2 minute timeout
  }

  /**
   * Wait for OAuth callback
   */
  private waitForCallback(timeoutMs: number): Promise<OAuthTokens> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopCallbackServer()
        reject(new Error('OAuth flow timed out'))
      }, timeoutMs)

      // Poll for tokens
      const checkTokens = async () => {
        const tokens = await this.storage.getOAuthTokens(this.provider)
        if (tokens) {
          clearTimeout(timeout)
          this.stopCallbackServer()
          resolve({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: Math.floor((tokens.expiresAt - Date.now()) / 1000),
            tokenType: 'Bearer',
            scope: tokens.scope,
          })
        } else {
          setTimeout(checkTokens, 500)
        }
      }

      checkTokens()
    })
  }

  /**
   * Stop callback server
   */
  stopCallbackServer(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  /**
   * Send success response
   */
  private sendSuccessResponse(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1e1e1e; color: #fff; }
          .container { text-align: center; }
          .icon { font-size: 48px; margin-bottom: 20px; }
          h1 { margin-bottom: 10px; }
          p { color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✓</div>
          <h1>Authentication Successful!</h1>
          <p>You can close this window now.</p>
        </div>
        <script>setTimeout(() => window.close(), 1000);</script>
      </body>
      </html>
    `)
  }

  /**
   * Send error response
   */
  private sendErrorResponse(
    res: http.ServerResponse,
    error: string,
    description?: string
  ): void {
    res.writeHead(400, { 'Content-Type': 'text/html' })
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1e1e1e; color: #fff; }
          .container { text-align: center; }
          .icon { font-size: 48px; margin-bottom: 20px; color: #f44; }
          h1 { margin-bottom: 10px; }
          p { color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✕</div>
          <h1>Authentication Failed</h1>
          <p>${error}${description ? `: ${description}` : ''}</p>
        </div>
      </body>
      </html>
    `)
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.storage.clearProvider(this.provider)
    this.pendingStates.clear()
    this.stopCallbackServer()
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.storage.getOAuthTokens(this.provider)
    return tokens !== undefined
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stopCallbackServer()
    this.pendingStates.clear()
  }
}
