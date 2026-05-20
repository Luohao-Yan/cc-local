/**
 * Token Budget Manager
 *
 * 管理 Token 预算，支持：
 * - Token 计数和追踪
 * - 预算警告
 * - 自动压缩建议
 */

import type { Message } from '@cclocal/shared'

export interface TokenBudget {
  maxInputTokens: number
  maxOutputTokens: number
  warningThreshold: number
  criticalThreshold: number
  autoCompactThreshold: number
}

export interface TokenWarning {
  level: 'info' | 'warning' | 'critical'
  message: string
  action?: 'suggest_compact' | 'auto_compact' | 'stop'
  tokens: number
  remaining: number
}

export interface TokenBudgetStats {
  inputTokens: number
  outputTokens: number
  total: number
  budget: number
  remaining: number
  warnings: TokenWarning[]
}

interface SessionBudget {
  inputTokens: number
  outputTokens: number
  messageCount: number
  lastUpdated: number
}

const DEFAULT_BUDGET: TokenBudget = {
  maxInputTokens: 180000,
  maxOutputTokens: 8192,
  warningThreshold: 150000,
  criticalThreshold: 175000,
  autoCompactThreshold: 190000,
}

/**
 * Token 预算管理器
 */
export class TokenBudgetManager {
  private sessions = new Map<string, SessionBudget>()
  private budget: TokenBudget

  constructor(budget: Partial<TokenBudget> = {}) {
    this.budget = { ...DEFAULT_BUDGET, ...budget }
  }

  /**
   * 获取或创建会话预算
   */
  private getOrCreate(sessionId: string): SessionBudget {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        inputTokens: 0,
        outputTokens: 0,
        messageCount: 0,
        lastUpdated: Date.now(),
      })
    }
    return this.sessions.get(sessionId)!
  }

  /**
   * 添加输入 Token 计数
   */
  addInputTokens(sessionId: string, count: number): TokenWarning[] {
    const budget = this.getOrCreate(sessionId)
    budget.inputTokens += count
    budget.lastUpdated = Date.now()
    return this.checkBudget(sessionId)
  }

  /**
   * 添加输出 Token 计数
   */
  addOutputTokens(sessionId: string, count: number): TokenWarning[] {
    const budget = this.getOrCreate(sessionId)
    budget.outputTokens += count
    budget.lastUpdated = Date.now()
    return this.checkBudget(sessionId)
  }

  /**
   * 添加消息（估算 Token）
   */
  addMessage(sessionId: string, message: Message): TokenWarning[] {
    const budget = this.getOrCreate(sessionId)
    const tokens = this.estimateTokens(message)

    if (message.role === 'user') {
      budget.inputTokens += tokens
    } else {
      budget.outputTokens += tokens
    }

    budget.messageCount++
    budget.lastUpdated = Date.now()

    return this.checkBudget(sessionId)
  }

  /**
   * 估算消息的 Token 数
   */
  private estimateTokens(message: Message): number {
    let total = 0

    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'text') {
          // 粗略估算：平均 4 字符 = 1 Token
          total += Math.ceil(block.text.length / 4)
        } else if ((block.type as string) === 'image') {
          // 图片估算：取决于大小
          total += 1000 // 默认估算
        } else if (block.type === 'tool_use' || block.type === 'tool_result') {
          total += this.estimateToolTokens(block)
        }
      }
    }

    return total
  }

  /**
   * 估算工具调用/结果的 Token 数
   */
  private estimateToolTokens(block: unknown): number {
    const str = JSON.stringify(block)
    return Math.ceil(str.length / 4)
  }

  /**
   * 检查预算状态
   */
  checkBudget(sessionId: string): TokenWarning[] {
    const budget = this.getOrCreate(sessionId)
    const total = budget.inputTokens + budget.outputTokens
    const remaining = this.budget.maxInputTokens + this.budget.maxOutputTokens - total
    const warnings: TokenWarning[] = []

    if (total >= this.budget.autoCompactThreshold) {
      warnings.push({
        level: 'critical',
        message: `Token budget critical: ${total} tokens used, auto-compact recommended`,
        action: 'auto_compact',
        tokens: total,
        remaining,
      })
    } else if (total >= this.budget.criticalThreshold) {
      warnings.push({
        level: 'critical',
        message: `Token budget critical: ${total} tokens used`,
        action: 'suggest_compact',
        tokens: total,
        remaining,
      })
    } else if (total >= this.budget.warningThreshold) {
      warnings.push({
        level: 'warning',
        message: `Token usage high: ${total} tokens used`,
        action: 'suggest_compact',
        tokens: total,
        remaining,
      })
    }

    return warnings
  }

  /**
   * 获取预算统计
   */
  getStats(sessionId: string): TokenBudgetStats {
    const budget = this.getOrCreate(sessionId)
    const total = budget.inputTokens + budget.outputTokens

    return {
      inputTokens: budget.inputTokens,
      outputTokens: budget.outputTokens,
      total,
      budget: this.budget.maxInputTokens + this.budget.maxOutputTokens,
      remaining: this.budget.maxInputTokens + this.budget.maxOutputTokens - total,
      warnings: this.checkBudget(sessionId),
    }
  }

  /**
   * 重置会话预算
   */
  reset(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  /**
   * 清理过期会话
   */
  cleanup(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now()
    for (const [sessionId, budget] of this.sessions) {
      if (now - budget.lastUpdated > maxAge) {
        this.sessions.delete(sessionId)
      }
    }
  }

  /**
   * 获取所有会话统计
   */
  getAllStats(): Map<string, TokenBudgetStats> {
    const stats = new Map<string, TokenBudgetStats>()
    for (const sessionId of this.sessions.keys()) {
      stats.set(sessionId, this.getStats(sessionId))
    }
    return stats
  }

  /**
   * 更新预算配置
   */
  updateBudget(newBudget: Partial<TokenBudget>): void {
    this.budget = { ...this.budget, ...newBudget }
  }

  /**
   * 获取当前预算配置
   */
  getBudget(): TokenBudget {
    return { ...this.budget }
  }
}

// 导出默认实例
export const tokenBudgetManager = new TokenBudgetManager()
