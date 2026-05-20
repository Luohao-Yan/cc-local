/**
 * MCP OAuth - Full OAuth 2.0 + PKCE + DCR flow for MCP server authentication
 *
 * Ported from the CLI layer's services/mcp/auth.ts (~1500 lines).
 * This implementation is framework-agnostic and works in the Core layer.
 *
 * Protocol flow:
 * 1. Discover OAuth metadata from server's well-known endpoint (RFC 9728)
 * 2. If no client ID: Dynamic Client Registration (DCR) per MCP spec
 * 3. Authorization Code flow with PKCE (S256)
 * 4. Token exchange → access + refresh tokens
 * 5. Automatic token refresh with lock to prevent concurrent refreshes
 *
 * Environment overrides:
 * - CCLOCAL_OAUTH_PORT: Override redirect URI port (default: 3118)
 * - CCLOCAL_OAUTH_TIMEOUT: Authorization timeout in ms (default: 120000)
 */

import crypto from 'crypto'
import type { MCPServerConfig, MCPOAuthMetadata, MCPDCRResponse, MCPOAuthTokenSet } from './types.js'

// ---- Constants ----

const DEFAULT_OAUTH_TIMEOUT = 120_000
const DEFAULT_REDIRECT_PORT = 3118
const PKCE_VERIFIER_LENGTH = 64
const STATE_LENGTH = 32

// ---- OAuth Discovery ----

/**
 * Discover OAuth metadata from a server URL using RFC 9728 well-known endpoint.
 * Tries /oauth-authorization-server relative to the server URL.
 */
export async function discoverOAuthMetadata(serverUrl: string, signal?: AbortSignal): Promise<MCPOAuthMetadata | null> {
  const url = new URL(serverUrl)

  // RFC 9728: well-known path relative to the server's origin
  const wellKnownUrl = `${url.origin}/.well-known/oauth-authorization-server${url.pathname}`

  try {
    const response = await fetch(wellKnownUrl, {
      signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      // Try origin-level discovery as fallback
      const originUrl = `${url.origin}/.well-known/oauth-authorization-server`
      const originResponse = await fetch(originUrl, {
        signal,
        headers: { Accept: 'application/json' },
      })

      if (!originResponse.ok) return null
      return await originResponse.json()
    }

    return await response.json()
  } catch {
    return null
  }
}

// ---- Dynamic Client Registration ----

/**
 * Perform Dynamic Client Registration (DCR) to obtain a client ID.
 * Falls back to the discovered registration endpoint, or a sensible default.
 */
export async function registerOAuthClient(
  metadata: MCPOAuthMetadata | null,
  serverUrl: string,
  redirectUri: string,
  signal?: AbortSignal,
): Promise<MCPDCRResponse> {
  const registrationEndpoint = metadata?.registrationEndpoint
    ?? new URL('/oauth/register', serverUrl).toString()

  const response = await fetch(registrationEndpoint, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_name: 'cclocal',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code'],
      token_endpoint_auth_method: 'none', // Public client
      scope: metadata?.scopesSupported?.join(' ') || 'openid',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`DCR failed (${response.status}): ${body}`)
  }

  return await response.json()
}

// ---- PKCE Helpers ----

/** Generate a cryptographically random PKCE code verifier */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(PKCE_VERIFIER_LENGTH).toString('base64url')
}

/** Compute PKCE code challenge from verifier using S256 */
export function computeCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

/** Generate random state parameter */
export function generateState(): string {
  return crypto.randomBytes(STATE_LENGTH).toString('hex')
}

// ---- Redirect URI ----

/**
 * Get the redirect URI for the OAuth flow.
 * Uses localhost with a dynamically allocated port.
 */
export function getRedirectUri(): string {
  const port = process.env.CCLOCAL_OAUTH_PORT
    ? parseInt(process.env.CCLOCAL_OAUTH_PORT, 10)
    : DEFAULT_REDIRECT_PORT
  return `http://localhost:${port}/oauth/callback`
}

// ---- Authorization URL ----

/**
 * Build the authorization URL for the user to visit.
 */
export function buildAuthorizationUrl(
  authorizationEndpoint: string,
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string,
  scope?: string,
): string {
  const url = new URL(authorizationEndpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  if (scope) url.searchParams.set('scope', scope)
  return url.toString()
}

// ---- Token Exchange ----

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  code: string,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string,
  codeVerifier: string,
  signal?: AbortSignal,
): Promise<MCPOAuthTokenSet> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })

  if (clientSecret) {
    body.set('client_secret', clientSecret)
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${errorBody}`)
  }

  const result = await response.json()

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: result.expires_in
      ? Date.now() + result.expires_in * 1000
      : undefined,
    scope: result.scope,
    tokenType: result.token_type,
  }
}

// ---- Token Refresh ----

/** Lock to prevent concurrent refreshes */
let refreshLock: Promise<MCPOAuthTokenSet> | null = null

/**
 * Refresh an access token using a refresh token.
 * Includes a lock to prevent concurrent refresh requests.
 */
export async function refreshAccessToken(
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string | undefined,
  refreshToken: string,
  signal?: AbortSignal,
): Promise<MCPOAuthTokenSet> {
  // If another refresh is in progress, piggyback on it
  if (refreshLock) return refreshLock

  refreshLock = _doRefresh(tokenEndpoint, clientId, clientSecret, refreshToken, signal)
  try {
    return await refreshLock
  } finally {
    refreshLock = null
  }
}

async function _doRefresh(
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string | undefined,
  refreshToken: string,
  signal?: AbortSignal,
): Promise<MCPOAuthTokenSet> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  })

  if (clientSecret) {
    body.set('client_secret', clientSecret)
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Token refresh failed (${response.status}): ${errorBody}`)
  }

  const result = await response.json()

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token || refreshToken, // Preserve original if not returned
    expiresAt: result.expires_in
      ? Date.now() + result.expires_in * 1000
      : undefined,
    scope: result.scope,
    tokenType: result.token_type,
  }
}

// ---- Token Validity ----

/** Check if a token set is expired or about to expire (5-minute buffer) */
export function isTokenExpired(tokens: MCPOAuthTokenSet): boolean {
  if (!tokens.expiresAt) return false // No expiry = assume valid
  return Date.now() > tokens.expiresAt - 300_000 // 5 min buffer
}

/** Check if a token set can be refreshed */
export function canRefreshTokens(tokens: MCPOAuthTokenSet | undefined): tokens is MCPOAuthTokenSet & { refreshToken: string } {
  return !!tokens?.refreshToken
}

// ---- Full OAuth Flow ----

/**
 * Perform the complete OAuth flow for an MCP server.
 * Starts a local HTTP server to receive the redirect callback,
 * exchanges the authorization code for tokens, and returns updated config.
 */
export async function performOAuthFlow(
  config: MCPServerConfig,
  serverUrl: string,
  onAuthorizationUrl?: (url: string) => void,
  signal?: AbortSignal,
): Promise<MCPServerConfig> {
  // 1. Discover OAuth metadata
  const metadata = await discoverOAuthMetadata(serverUrl, signal)

  const redirectPort = process.env.CCLOCAL_OAUTH_PORT
    ? parseInt(process.env.CCLOCAL_OAUTH_PORT, 10)
    : DEFAULT_REDIRECT_PORT
  const redirectUri = `http://localhost:${redirectPort}/oauth/callback`

  // 2. Get or register client ID
  let clientId = config.oauthClientId
  let clientSecret = config.oauthClientSecret

  if (!clientId) {
    const dcr = await registerOAuthClient(metadata, serverUrl, redirectUri, signal)
    clientId = dcr.clientId
    clientSecret = dcr.clientSecret
  }

  // 3. Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = computeCodeChallenge(codeVerifier)
  const state = generateState()

  // 4. Build authorization URL
  const authorizationEndpoint = metadata?.authorizationEndpoint
    ?? new URL('/oauth/authorize', serverUrl).toString()

  const authUrl = buildAuthorizationUrl(
    authorizationEndpoint,
    clientId,
    redirectUri,
    state,
    codeChallenge,
    config.oauthScopes?.join(' ') || metadata?.scopesSupported?.join(' '),
  )

  // 5. Tell the caller to open the URL
  onAuthorizationUrl?.(authUrl)

  // 6. Start local HTTP server to receive the callback
  const timeout = process.env.CCLOCAL_OAUTH_TIMEOUT
    ? parseInt(process.env.CCLOCAL_OAUTH_TIMEOUT, 10)
    : DEFAULT_OAUTH_TIMEOUT

  const { code } = await waitForOAuthCallback(redirectPort, state, timeout, signal)

  // 7. Exchange code for tokens
  const tokenEndpoint = metadata?.tokenEndpoint
    ?? new URL('/oauth/token', serverUrl).toString()

  const tokens = await exchangeCodeForTokens(
    tokenEndpoint,
    code,
    clientId,
    clientSecret,
    redirectUri,
    codeVerifier,
    signal,
  )

  return {
    ...config,
    oauthClientId: clientId,
    oauthClientSecret: clientSecret,
    oauthTokens: tokens,
  }
}

/**
 * Start a local HTTP server to receive the OAuth redirect callback.
 * Validates the state parameter and extracts the authorization code.
 */
export async function waitForOAuthCallback(
  port: number,
  expectedState: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    const server = Bun.serve({
      port,
      fetch(req) {
        const url = new URL(req.url)

        // Only handle the callback path
        if (url.pathname !== '/oauth/callback') {
          return new Response('Not found', { status: 404 })
        }

        const error = url.searchParams.get('error')
        if (error) {
          const errorDesc = url.searchParams.get('error_description') || error
          cleanup()
          reject(new Error(`OAuth error: ${errorDesc}`))
          return new Response(`<html><body><h2>Authorization failed</h2><p>${error}</p><p>You can close this tab.</p></body></html>`, {
            headers: { 'Content-Type': 'text/html' },
          })
        }

        const state = url.searchParams.get('state')
        if (state !== expectedState) {
          cleanup()
          reject(new Error(`OAuth state mismatch: expected ${expectedState}, got ${state}`))
          return new Response('<html><body><h2>State mismatch</h2><p>Authorization failed due to state mismatch. You can close this tab.</p></body></html>', {
            headers: { 'Content-Type': 'text/html' },
          })
        }

        const code = url.searchParams.get('code')
        if (!code) {
          cleanup()
          reject(new Error('OAuth callback missing authorization code'))
          return new Response('<html><body><h2>Missing code</h2><p>No authorization code received. You can close this tab.</p></body></html>', {
            headers: { 'Content-Type': 'text/html' },
          })
        }

        cleanup()
        resolve({ code })
        return new Response('<html><body><h2>Authorization successful!</h2><p>You can close this tab and return to the terminal.</p></body></html>', {
          headers: { 'Content-Type': 'text/html' },
        })
      },
    })

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`OAuth authorization timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timer)
      try { server.stop() } catch { /* already stopped */ }
      signal?.removeEventListener('abort', onAbort)
    }

    const onAbort = () => {
      cleanup()
      reject(new Error('OAuth flow aborted'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort)
  })
}

/**
 * Ensure we have a valid access token, refreshing if necessary.
 * Updates the config with new tokens if refreshed.
 */
export async function ensureValidToken(
  config: MCPServerConfig,
  serverUrl: string,
  signal?: AbortSignal,
): Promise<{ config: MCPServerConfig; accessToken: string }> {
  const tokens = config.oauthTokens

  if (!tokens) {
    throw new Error('No OAuth tokens available — need to perform OAuth flow first')
  }

  if (!isTokenExpired(tokens)) {
    return { config, accessToken: tokens.accessToken }
  }

  if (!canRefreshTokens(tokens)) {
    throw new Error('Token expired and no refresh token available — need to re-authorize')
  }

  // Discover metadata for refresh endpoint
  const metadata = await discoverOAuthMetadata(serverUrl, signal)
  const tokenEndpoint = metadata?.tokenEndpoint
    ?? new URL('/oauth/token', serverUrl).toString()

  const newTokens = await refreshAccessToken(
    tokenEndpoint,
    config.oauthClientId!,
    config.oauthClientSecret,
    tokens.refreshToken,
    signal,
  )

  return {
    config: { ...config, oauthTokens: newTokens },
    accessToken: newTokens.accessToken,
  }
}
