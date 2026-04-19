/**
 * 认证管理器 - 本地部署简化版
 */

import { randomBytes } from 'crypto'

export interface AuthManagerOptions {
  apiKey?: string
  allowedOrigins?: string[]
  allowLoopbackOrigins?: boolean
}

export interface AuthResult {
  ok: boolean
  code?: 'missing_auth' | 'invalid_auth_format' | 'invalid_token'
  message?: string
  token?: string
}

export class AuthManager {
  private tokens = new Set<string>()
  private readonly serverToken: string
  private readonly allowedOrigins: string[]
  private readonly allowLoopbackOrigins: boolean
  private readonly configuredApiKey: boolean

  constructor(options: AuthManagerOptions = {}) {
    this.allowLoopbackOrigins = options.allowLoopbackOrigins ?? true
    this.allowedOrigins = options.allowedOrigins ?? this.parseAllowedOrigins(
      process.env.CCLOCAL_ALLOWED_ORIGINS
    )

    const configuredApiKey = options.apiKey ?? process.env.CCLOCAL_API_KEY
    this.serverToken = configuredApiKey || this.generateToken()
    this.configuredApiKey = Boolean(configuredApiKey)
    this.tokens.add(this.serverToken)
  }

  generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  createToken(): string {
    const token = this.generateToken()
    this.tokens.add(token)
    return token
  }

  revokeToken(token: string): void {
    this.tokens.delete(token)
  }

  verifyToken(token: string): boolean {
    return this.tokens.has(token)
  }

  authenticateRequest(headers: Headers): AuthResult {
    const bearerHeader = headers.get('Authorization')
    const apiKeyHeader = headers.get('X-API-Key')

    if (bearerHeader) {
      const parts = bearerHeader.trim().split(/\s+/)
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return {
          ok: false,
          code: 'invalid_auth_format',
          message: 'Authorization header must use the Bearer scheme',
        }
      }

      if (!this.verifyToken(parts[1])) {
        return {
          ok: false,
          code: 'invalid_token',
          message: 'Provided API token is invalid',
        }
      }

      return { ok: true, token: parts[1] }
    }

    if (apiKeyHeader) {
      if (!this.verifyToken(apiKeyHeader)) {
        return {
          ok: false,
          code: 'invalid_token',
          message: 'Provided API token is invalid',
        }
      }

      return { ok: true, token: apiKeyHeader }
    }

    return {
      ok: false,
      code: 'missing_auth',
      message: 'Missing API token. Use Authorization: Bearer <token> or X-API-Key.',
    }
  }

  verifyRequest(authHeader: string | null): boolean {
    if (!authHeader) return false
    return this.authenticateRequest(new Headers({ Authorization: authHeader })).ok
  }

  isOriginAllowed(origin: string | null): boolean {
    if (!origin) {
      return true
    }

    if (this.allowedOrigins.includes('*') || this.allowedOrigins.includes(origin)) {
      return true
    }

    if (!this.allowLoopbackOrigins) {
      return false
    }

    try {
      const url = new URL(origin)
      return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    } catch {
      return false
    }
  }

  getCorsHeaders(origin: string | null, requestHeaders?: string | null): Headers {
    const headers = new Headers({
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': requestHeaders || 'Content-Type, Authorization, X-API-Key',
    })

    if (origin && this.isOriginAllowed(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
    }

    return headers
  }

  getAuthSummary(): {
    configuredApiKey: boolean
    allowedOrigins: string[]
    allowLoopbackOrigins: boolean
  } {
    return {
      configuredApiKey: this.configuredApiKey,
      allowedOrigins: this.allowedOrigins,
      allowLoopbackOrigins: this.allowLoopbackOrigins,
    }
  }

  getServerToken(): string {
    return this.serverToken
  }

  private parseAllowedOrigins(raw?: string): string[] {
    if (!raw) {
      return []
    }

    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}
