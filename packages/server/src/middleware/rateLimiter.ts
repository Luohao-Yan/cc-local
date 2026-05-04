/**
 * 速率限制中间件
 * 基于令牌桶算法，支持按令牌（用户）限制请求频率
 */

export interface RateLimiterOptions {
  /** 每分钟允许的请求数 */
  requestsPerMinute?: number
  /** 每秒允许的请求数 */
  requestsPerSecond?: number
  /** 清理间隔（毫秒），默认 60 秒 */
  cleanupInterval?: number
  /** 最大客户端数，超过此数后清理不活跃客户端 */
  maxClients?: number
  /** 客户端最大空闲时间（毫秒），默认 30 分钟 */
  clientMaxAge?: number
}

interface ClientState {
  /** 令牌桶 - 每分钟 */
  minuteBucket: {
    tokens: number
    lastRefill: number
  }
  /** 令牌桶 - 每秒 */
  secondBucket: {
    tokens: number
    lastRefill: number
  }
  lastRequest: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
  reason?: 'rate_limited' | 'rate_limited_per_second'
}

export class RateLimiter {
  private clients = new Map<string, ClientState>()
  private readonly requestsPerMinute: number
  private readonly requestsPerSecond: number
  private readonly clientMaxAge: number
  private readonly maxClients: number
  private cleanupTimer?: ReturnType<typeof setInterval>

  constructor(options: RateLimiterOptions = {}) {
    this.requestsPerMinute = options.requestsPerMinute ?? 60
    this.requestsPerSecond = options.requestsPerSecond ?? 10
    this.clientMaxAge = options.clientMaxAge ?? 30 * 60 * 1000 // 默认 30 分钟
    this.maxClients = options.maxClients ?? 10000

    // 定期清理不活跃客户端
    const cleanupInterval = options.cleanupInterval ?? 60 * 1000
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval)
  }

  /**
   * 检查是否允许请求
   */
  check(clientId: string): RateLimitResult {
    const now = Date.now()
    let client = this.clients.get(clientId)

    if (!client) {
      // 新客户端
      if (this.clients.size >= this.maxClients) {
        this.cleanup()
      }

      client = {
        minuteBucket: {
          tokens: this.requestsPerMinute,
          lastRefill: now,
        },
        secondBucket: {
          tokens: this.requestsPerSecond,
          lastRefill: now,
        },
        lastRequest: now,
      }
      this.clients.set(clientId, client)
    }

    // 补充令牌
    this.refillTokens(client, now)

    // 检查每秒限制
    if (client.secondBucket.tokens <= 0) {
      const retryAfter = Math.ceil(1000 / this.requestsPerSecond)
      return {
        allowed: false,
        retryAfter,
        reason: 'rate_limited_per_second',
      }
    }

    // 检查每分钟限制
    if (client.minuteBucket.tokens <= 0) {
      const retryAfter = Math.ceil(60000 / this.requestsPerMinute)
      return {
        allowed: false,
        retryAfter,
        reason: 'rate_limited',
      }
    }

    // 消耗令牌
    client.minuteBucket.tokens--
    client.secondBucket.tokens--
    client.lastRequest = now

    return { allowed: true }
  }

  /**
   * 重置客户端的限制
   */
  reset(clientId: string): void {
    this.clients.delete(clientId)
  }

  /**
   * 获取客户端状态
   */
  getClientState(clientId: string): {
    minuteTokensRemaining: number
    secondTokensRemaining: number
  } | undefined {
    const client = this.clients.get(clientId)
    if (!client) return undefined

    this.refillTokens(client, Date.now())

    return {
      minuteTokensRemaining: Math.floor(client.minuteBucket.tokens),
      secondTokensRemaining: Math.floor(client.secondBucket.tokens),
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalClients: number
    maxClients: number
    requestsPerMinute: number
    requestsPerSecond: number
  } {
    return {
      totalClients: this.clients.size,
      maxClients: this.maxClients,
      requestsPerMinute: this.requestsPerMinute,
      requestsPerSecond: this.requestsPerSecond,
    }
  }

  /**
   * 关闭速率限制器
   */
  close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.clients.clear()
  }

  /**
   * 补充令牌
   */
  private refillTokens(client: ClientState, now: number): void {
    // 每分钟令牌补充
    const minuteElapsed = now - client.minuteBucket.lastRefill
    const minuteTokensToAdd = (minuteElapsed / 60000) * this.requestsPerMinute
    client.minuteBucket.tokens = Math.min(
      this.requestsPerMinute,
      client.minuteBucket.tokens + minuteTokensToAdd
    )
    client.minuteBucket.lastRefill = now

    // 每秒令牌补充
    const secondElapsed = now - client.secondBucket.lastRefill
    const secondTokensToAdd = (secondElapsed / 1000) * this.requestsPerSecond
    client.secondBucket.tokens = Math.min(
      this.requestsPerSecond,
      client.secondBucket.tokens + secondTokensToAdd
    )
    client.secondBucket.lastRefill = now
  }

  /**
   * 清理不活跃客户端
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [clientId, client] of this.clients) {
      if (now - client.lastRequest > this.clientMaxAge) {
        toDelete.push(clientId)
      }
    }

    for (const clientId of toDelete) {
      this.clients.delete(clientId)
    }
  }
}
