/**
 * Proactive Mode - 自主代理模式实现
 *
 * 让 Claude 在用户长时间无输入时自主继续工作，
 * 自动注入 tick 消息保持模型循环运行。
 */

import { EventEmitter } from 'events'

// ── 类型定义 ────────────────────────────────────────────────────────────────

type ProactiveReason = 'command' | 'env' | 'auto' | 'resume'
type ProactiveState = 'inactive' | 'active' | 'paused'

interface ProactiveConfig {
  /** tick 间隔（毫秒），默认 30000ms (30秒) */
  tickIntervalMs: number
  /** 最大连续 tick 数，防止无限循环 */
  maxConsecutiveTicks: number
  /** 是否启用调试日志 */
  debug: boolean
}

// ── 默认配置 ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ProactiveConfig = {
  tickIntervalMs: 30_000, // 30 秒
  maxConsecutiveTicks: 100,
  debug: process.env.DEBUG_PROACTIVE === '1',
}

// ── 全局状态 ────────────────────────────────────────────────────────────────

let state: ProactiveState = 'inactive'
let contextBlocked: boolean = false
let tickTimer: ReturnType<typeof setTimeout> | null = null
let consecutiveTicks: number = 0
let lastTickAt: number | null = null
let activationReason: ProactiveReason | null = null
let activatedAt: number | null = null

const emitter = new EventEmitter()
const config: ProactiveConfig = { ...DEFAULT_CONFIG }

// ── 调试日志 ────────────────────────────────────────────────────────────────

function debug(...args: unknown[]): void {
  if (config.debug) {
    console.log('[proactive]', ...args)
  }
}

// ── 状态变更通知 ────────────────────────────────────────────────────────────

function notifyChange(): void {
  emitter.emit('change')
}

// ── 公开 API ────────────────────────────────────────────────────────────────

/**
 * 当前是否激活
 */
export function isProactiveActive(): boolean {
  return state === 'active'
}

/**
 * 当前是否暂停
 */
export function isProactivePaused(): boolean {
  return state === 'paused'
}

/**
 * 获取当前状态
 */
export function getProactiveState(): ProactiveState {
  return state
}

/**
 * 激活自主模式
 */
export function activateProactive(reason: ProactiveReason): void {
  if (state === 'active') {
    debug('already active, ignoring activation')
    return
  }

  const previousState = state
  state = 'active'
  activationReason = reason
  activatedAt = Date.now()
  consecutiveTicks = 0
  contextBlocked = false

  debug(`activated (reason: ${reason}, previous: ${previousState})`)
  notifyChange()
}

/**
 * 停止自主模式
 */
export function deactivateProactive(): void {
  if (state === 'inactive') {
    debug('already inactive, ignoring deactivation')
    return
  }

  state = 'inactive'
  activationReason = null
  activatedAt = null
  consecutiveTicks = 0
  lastTickAt = null
  contextBlocked = false

  // 清理定时器
  if (tickTimer !== null) {
    clearTimeout(tickTimer)
    tickTimer = null
  }

  debug('deactivated')
  notifyChange()
}

/**
 * 暂停自主模式（保持激活状态但停止注入 tick）
 */
export function pauseProactive(): void {
  if (state !== 'active') {
    debug('cannot pause: not active')
    return
  }

  state = 'paused'
  debug('paused')
  notifyChange()
}

/**
 * 恢复自主模式
 */
export function resumeProactive(): void {
  if (state !== 'paused') {
    debug('cannot resume: not paused')
    return
  }

  state = 'active'
  debug('resumed')
  notifyChange()
}

/**
 * 设置上下文阻塞（当阻塞时，暂停 tick 注入）
 */
export function setContextBlocked(blocked: boolean): void {
  if (contextBlocked === blocked) return

  contextBlocked = blocked
  debug(`contextBlocked = ${blocked}`)
  notifyChange()
}

/**
 * 订阅状态变更
 */
export function subscribeToProactiveChanges(
  onStoreChange: () => void,
): () => void {
  emitter.on('change', onStoreChange)
  return () => emitter.off('change', onStoreChange)
}

/**
 * 获取下次 tick 时间（如果激活且未暂停）
 */
export function getNextTickAt(): number | null {
  if (state !== 'active' || contextBlocked) {
    return null
  }
  return lastTickAt ? lastTickAt + config.tickIntervalMs : Date.now()
}

/**
 * 获取激活信息
 */
export function getActivationInfo(): {
  reason: ProactiveReason | null
  activatedAt: number | null
  consecutiveTicks: number
} {
  return {
    reason: activationReason,
    activatedAt,
    consecutiveTicks,
  }
}

/**
 * 重置连续 tick 计数（在用户交互后调用）
 */
export function resetConsecutiveTicks(): void {
  consecutiveTicks = 0
  debug('consecutive ticks reset')
}

/**
 * 记录一次 tick（由 print.ts 调用）
 */
export function recordTick(): void {
  consecutiveTicks++
  lastTickAt = Date.now()
  debug(`tick #${consecutiveTicks} recorded`)

  // 安全限制：超过最大连续 tick 数时自动暂停
  if (consecutiveTicks >= config.maxConsecutiveTicks) {
    debug('max consecutive ticks reached, pausing')
    pauseProactive()
  }
}

/**
 * 检查是否应该注入 tick
 */
export function shouldInjectTick(): boolean {
  return state === 'active' && !contextBlocked
}

/**
 * 配置 proactive 行为
 */
export function configureProactive(
  options: Partial<ProactiveConfig>,
): void {
  Object.assign(config, options)
  debug('config updated', config)
}

/**
 * 获取当前配置
 */
export function getProactiveConfig(): ProactiveConfig {
  return { ...config }
}

// ── 兼容旧 API（已废弃，保留向后兼容）────────────────────────────────────

// 这些别名保持向后兼容
export const isActive = isProactiveActive
export const isPaused = isProactivePaused
