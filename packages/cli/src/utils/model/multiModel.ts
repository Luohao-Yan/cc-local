/**
 * 多模型配置解析器（Model_Resolver）
 *
 * 从 JSON 配置中查找模型，设置运行时环境变量。
 * 替代旧的基于 .env 环境变量扫描的实现。
 *
 * 匹配优先级（不区分大小写）：
 *   1. 别名（alias 数组中的值）
 *   2. 模型 ID（Provider models 对象中的 key）
 *   3. 模型显示名称（ModelEntry.name）
 *
 * 导出的 resolveMultiModelConfig() 函数签名保持不变：
 *   (modelInput: string) => string | null
 */

import { getModelConfig, resolveEnvReference } from './modelConfig.js'
import { detectAliasConflicts } from './modelConfigValidator.js'
import { logForDebugging } from '../debug.js'

// ===== 类型定义 =====

/** 旧版 ModelConfig 接口，保留导出以确保向后兼容 */
export interface ModelConfig {
  alias: string
  name: string
  baseUrl: string
  apiKey: string
}

/** 解析后的模型信息 */
export interface ResolvedModel {
  /** Provider 在配置中的 key */
  providerKey: string
  /** Provider 显示名称 */
  providerName: string
  /** 模型在 Provider 中的 key */
  modelKey: string
  /** 模型显示名称 */
  modelName: string
  /** API 端点 */
  baseUrl: string
  /** 解析后的 API Key（null 表示本地模型） */
  apiKey: string | null
  /** 别名列表 */
  aliases: string[]
  /** 自定义请求头 */
  headers?: Record<string, string>
}

// ===== 内部状态 =====

/** 别名冲突检测是否已执行（仅在首次加载时检测一次） */
let aliasConflictsChecked = false

// ===== 内部辅助函数 =====

/**
 * 安全解析 Provider 的 apiKey。
 * 支持 {env:VAR} 语法，解析失败时记录日志并返回 null。
 * apiKey 未配置时返回 null（本地模型场景）。
 */
function resolveApiKey(
  providerKey: string,
  rawApiKey: string | undefined,
): string | null {
  if (!rawApiKey) {
    return null
  }
  try {
    return resolveEnvReference(rawApiKey)
  } catch (error) {
    logForDebugging(
      `Provider "${providerKey}" 的 apiKey 解析失败: ${error}`,
      { level: 'error' },
    )
    return null
  }
}

/**
 * 首次调用时检测别名冲突并输出警告日志。
 * 仅执行一次，后续调用直接跳过。
 */
function checkAliasConflictsOnce(): void {
  if (aliasConflictsChecked) {
    return
  }
  aliasConflictsChecked = true

  try {
    const config = getModelConfig()
    const warnings = detectAliasConflicts(config)
    for (const warning of warnings) {
      logForDebugging(`[模型配置警告] ${warning.message}`, { level: 'warn' })
    }
  } catch {
    // 别名冲突检测失败不阻断主流程
  }
}

// ===== 公开 API =====

/**
 * 获取所有已配置模型的扁平列表。
 * 遍历所有 Provider 和其下的模型，解析环境变量引用，
 * 返回 ResolvedModel 数组。
 */
export function getConfiguredModels(): ResolvedModel[] {
  // 首次调用时检测别名冲突
  checkAliasConflictsOnce()

  const config = getModelConfig()
  const models: ResolvedModel[] = []

  for (const [providerKey, provider] of Object.entries(config.providers)) {
    if (!provider.models) {
      continue
    }

    // 解析 Provider 级别的 apiKey 和 baseUrl
    const resolvedApiKey = resolveApiKey(providerKey, provider.apiKey)
    const baseUrl = provider.baseUrl

    for (const [modelKey, model] of Object.entries(provider.models)) {
      models.push({
        providerKey,
        providerName: provider.name,
        modelKey,
        modelName: model.name,
        baseUrl,
        apiKey: resolvedApiKey,
        aliases: Array.isArray(model.alias) ? model.alias : [],
        headers: provider.headers,
      })
    }
  }

  return models
}

/**
 * 旧版兼容函数：返回 ModelConfig[] 格式的模型列表。
 * 内部调用 getConfiguredModels()，将 ResolvedModel 转换为旧格式。
 * 确保过渡期不破坏现有代码（如 modelOptions.ts）。
 */
export function getModelConfigs(): ModelConfig[] {
  const resolvedModels = getConfiguredModels()
  return resolvedModels.map(m => ({
    alias: m.aliases[0] || m.modelKey,
    name: m.modelKey,
    baseUrl: m.baseUrl,
    apiKey: m.apiKey || 'local-no-key',
  }))
}

/**
 * 根据用户输入解析模型配置。
 *
 * 匹配顺序（不区分大小写）：
 *   1. 别名（alias 数组中的值）
 *   2. 模型 ID（Provider models 对象中的 key）
 *   3. 模型显示名称（ModelEntry.name）
 *
 * 匹配成功后自动调用 activateModel() 设置运行时环境变量。
 *
 * @param modelInput - 用户输入的模型名称或别名
 * @returns 匹配到的模型 key（用作实际模型标识），未匹配返回 null
 */
export function resolveMultiModelConfig(modelInput: string): string | null {
  const models = getConfiguredModels()
  if (models.length === 0) {
    return null
  }

  const input = modelInput.trim().toLowerCase()

  // 第一优先级：按别名匹配
  let matched = models.find(m =>
    m.aliases.some(alias => alias.toLowerCase() === input),
  )

  // 第二优先级：按模型 ID（key）匹配
  if (!matched) {
    matched = models.find(m => m.modelKey.toLowerCase() === input)
  }

  // 第三优先级：按模型显示名称匹配
  if (!matched) {
    matched = models.find(m => m.modelName.toLowerCase() === input)
  }

  if (matched) {
    activateModel(matched)
    return matched.modelKey
  }

  return null
}

/**
 * 激活模型：设置运行时环境变量。
 *
 * - 始终设置 ANTHROPIC_BASE_URL
 * - 有 apiKey 时设置 ANTHROPIC_API_KEY 为实际值
 * - 无 apiKey（本地模型）时设置 ANTHROPIC_API_KEY 为 'local-no-key'，
 *   避免 Anthropic SDK 因缺少 Key 而报错
 *
 * @param resolved - 已解析的模型信息
 */
export function activateModel(resolved: ResolvedModel): void {
  process.env.ANTHROPIC_BASE_URL = resolved.baseUrl

  if (resolved.apiKey !== null) {
    process.env.ANTHROPIC_API_KEY = resolved.apiKey
  } else {
    process.env.ANTHROPIC_API_KEY = 'local-no-key'
  }
}

/**
 * 重置内部状态（用于测试）。
 * 清除别名冲突检测标记，使下次调用重新检测。
 */
export function resetMultiModelState(): void {
  aliasConflictsChecked = false
}
