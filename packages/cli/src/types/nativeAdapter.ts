/**
 * Native Adapter Types
 *
 * 定义 Native 后端适配器的类型接口
 */

import type { Message, StreamEvent, MessageOptions, Tool, PermissionPolicy } from '@cclocal/shared'

/**
 * Native 适配器配置
 */
export interface NativeAdapterConfig {
  /** 适配器模式 */
  mode: 'local' | 'rest' | 'rest-embedded'
  /** REST 服务器地址（mode=rest 时必需） */
  serverUrl?: string
  /** 认证 Token */
  authToken?: string
  /** 会话 ID */
  sessionId?: string
}

/**
 * Native 查询选项
 */
export interface NativeQueryOptions {
  /** 消息列表 */
  messages: Message[]
  /** 模型 */
  model?: string
  /** 最大轮次 */
  maxTurns?: number
  /** 会话 ID */
  sessionId?: string
  /** 工具列表 */
  tools?: Tool[]
  /** 权限策略 */
  permissionPolicy?: PermissionPolicy
  /** 权限检查回调 */
  onPermissionCheck?: (tool: string, input: unknown, reason?: string) => Promise<boolean>
  /** 流事件回调 */
  onStream?: (event: StreamEvent) => void
}

/**
 * Native 查询结果
 */
export interface NativeQueryResult {
  /** 最终消息 */
  message: Message
  /** 使用统计 */
  usage: {
    inputTokens: number
    outputTokens: number
  }
  /** 会话 ID */
  sessionId?: string
}

/**
 * Token 预算警告
 */
export interface TokenWarning {
  level: 'info' | 'warning' | 'critical'
  message: string
  action?: 'suggest_compact' | 'auto_compact' | 'stop'
}

/**
 * Token 预算统计
 */
export interface TokenBudgetStats {
  inputTokens: number
  outputTokens: number
  total: number
  budget: number
  remaining: number
}

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * 任务类型
 */
export type TaskType = 'query' | 'tool' | 'agent'

/**
 * 任务定义
 */
export interface Task {
  id: string
  sessionId: string
  type: TaskType
  status: TaskStatus
  progress: number
  message?: string
  result?: unknown
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
}

/**
 * Agent 步骤
 */
export interface AgentStep {
  id: string
  type: 'think' | 'action' | 'observe'
  content: string
  tool?: string
  input?: unknown
  result?: unknown
  timestamp: number
}

/**
 * Agent 结果
 */
export interface AgentResult {
  status: 'completed' | 'max_steps_reached' | 'failed' | 'cancelled'
  steps: AgentStep[]
  result?: unknown
}

/**
 * Native 适配器接口
 */
export interface INativeAdapter {
  /** 初始化适配器 */
  initialize(): Promise<void>
  /** 执行查询 */
  query(options: NativeQueryOptions): AsyncGenerator<StreamEvent, NativeQueryResult, unknown>
  /** 取消当前查询 */
  cancel(): void
  /** 权限检查 */
  checkPermission?(tool: string, input: unknown): Promise<boolean>
  /** 创建会话分叉 */
  forkSession?(sessionId: string, options?: { name?: string }): Promise<{ id: string }>
  /** 获取 Token 预算 */
  getTokenBudget?(sessionId: string): Promise<TokenBudgetStats>
  /** 获取任务列表 */
  getTasks?(sessionId?: string): Promise<Task[]>
  /** 取消任务 */
  cancelTask?(taskId: string): Promise<void>
  /** 销毁适配器 */
  dispose(): Promise<void>
}
