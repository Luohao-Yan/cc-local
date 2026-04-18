/**
 * 认证管理器 - 本地部署简化版
 */

import { randomBytes } from 'crypto'

export class AuthManager {
  private tokens = new Set<string>()
  private readonly serverToken: string

  constructor() {
    // 生成服务端启动令牌
    this.serverToken = this.generateToken()
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

  verifyRequest(authHeader: string | null): boolean {
    if (!authHeader) return false

    // 支持 "Bearer <token>" 格式
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return false
    }

    return this.verifyToken(parts[1])
  }

  getServerToken(): string {
    return this.serverToken
  }
}
