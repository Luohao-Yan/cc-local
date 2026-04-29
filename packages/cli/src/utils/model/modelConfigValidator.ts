/**
 * JSON 多模型配置校验器（Config_Validator）
 *
 * 负责校验 JSON 配置文件的结构和字段合法性，
 * 检测别名冲突，以及检测明文 API Key 安全风险。
 */

import type { ModelsConfig } from './modelConfig.js'

// ===== 类型定义 =====

/** 校验错误/警告信息 */
export interface ValidationError {
  /** JSON 路径，如 "providers.openai.baseUrl" */
  path: string
  /** 错误描述 */
  message: string
  /** 严重级别：error 为阻断性错误，warning 为非阻断性警告 */
  severity: 'error' | 'warning'
}

// ===== 内部常量 =====

/** URL 格式校验正则：必须以 http:// 或 https:// 开头 */
const VALID_URL_PREFIX = /^https?:\/\//

/** {env:VARIABLE_NAME} 格式正则 */
const ENV_REF_PATTERN = /^\{env:[A-Za-z_][A-Za-z0-9_]*\}$/

/** 明文 API Key 最小长度阈值 */
const PLAINTEXT_KEY_MIN_LENGTH = 20

// ===== 校验函数 =====

/**
 * 校验模型配置的 JSON 结构和字段合法性。
 *
 * 校验规则：
 * - providers 必须是对象类型
 * - 每个 Provider 必须包含 baseUrl 字段
 * - baseUrl 必须以 http:// 或 https:// 开头
 * - apiKey 为可选字段（本地模型无需提供）
 *
 * @param config - 待校验的配置对象（unknown 类型，支持任意输入）
 * @returns 校验错误和警告列表
 */
export function validateModelConfig(config: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  // 校验顶层是否为对象
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    errors.push({
      path: '',
      message: '配置必须是一个 JSON 对象',
      severity: 'error',
    })
    return errors
  }

  const configObj = config as Record<string, unknown>

  // 校验 providers 字段是否存在且为对象
  if (!('providers' in configObj)) {
    errors.push({
      path: 'providers',
      message: '缺少必填字段: providers',
      severity: 'error',
    })
    return errors
  }

  const providers = configObj.providers
  if (
    providers === null ||
    typeof providers !== 'object' ||
    Array.isArray(providers)
  ) {
    errors.push({
      path: 'providers',
      message: 'providers 必须是一个对象',
      severity: 'error',
    })
    return errors
  }

  const providersObj = providers as Record<string, unknown>

  // 逐个校验每个 Provider
  for (const [providerKey, providerValue] of Object.entries(providersObj)) {
    const providerPath = `providers.${providerKey}`

    // 校验 Provider 是否为对象
    if (
      providerValue === null ||
      typeof providerValue !== 'object' ||
      Array.isArray(providerValue)
    ) {
      errors.push({
        path: providerPath,
        message: `Provider "${providerKey}" 必须是一个对象`,
        severity: 'error',
      })
      continue
    }

    const provider = providerValue as Record<string, unknown>

    // 校验必填字段 baseUrl
    if (!('baseUrl' in provider) || provider.baseUrl === undefined) {
      errors.push({
        path: `${providerPath}.baseUrl`,
        message: `Provider "${providerKey}" 缺少必填字段: baseUrl`,
        severity: 'error',
      })
    } else if (typeof provider.baseUrl !== 'string') {
      errors.push({
        path: `${providerPath}.baseUrl`,
        message: `Provider "${providerKey}" 的 baseUrl 必须是字符串`,
        severity: 'error',
      })
    } else if (!VALID_URL_PREFIX.test(provider.baseUrl)) {
      // baseUrl 格式校验：必须以 http:// 或 https:// 开头
      errors.push({
        path: `${providerPath}.baseUrl`,
        message: `Provider "${providerKey}" 的 baseUrl 格式错误，需以 http:// 或 https:// 开头`,
        severity: 'error',
      })
    }
  }

  return errors
}

/**
 * 检测不同 Provider 下模型的别名冲突（不区分大小写）。
 *
 * 遍历所有 Provider 的所有模型别名，当不同 Provider 下的模型
 * 配置了相同的别名时，返回包含冲突别名和涉及 Provider 名称的警告。
 * 别名冲突仅输出警告，不阻断配置加载。
 *
 * @param config - 已解析的模型配置
 * @returns 别名冲突警告列表
 */
export function detectAliasConflicts(config: ModelsConfig): ValidationError[] {
  const warnings: ValidationError[] = []

  // 记录已见过的别名 → { providerKey, providerName, modelKey }
  // 使用小写别名作为 key，实现大小写不敏感匹配
  const aliasMap = new Map<
    string,
    { providerKey: string; providerName: string; modelKey: string }
  >()

  for (const [providerKey, provider] of Object.entries(config.providers)) {
    if (!provider.models) {
      continue
    }

    for (const [modelKey, model] of Object.entries(provider.models)) {
      if (!model.alias || !Array.isArray(model.alias)) {
        continue
      }

      for (const alias of model.alias) {
        if (typeof alias !== 'string') {
          continue
        }

        const aliasLower = alias.toLowerCase()
        const existing = aliasMap.get(aliasLower)

        if (existing && existing.providerKey !== providerKey) {
          // 检测到跨 Provider 的别名冲突
          warnings.push({
            path: `providers.${providerKey}.models.${modelKey}.alias`,
            message: `别名 "${alias}" 在 Provider "${existing.providerName}" 和 "${provider.name}" 中重复`,
            severity: 'warning',
          })
        } else if (!existing) {
          // 首次出现该别名，记录来源
          aliasMap.set(aliasLower, {
            providerKey,
            providerName: provider.name,
            modelKey,
          })
        }
      }
    }
  }

  return warnings
}

/**
 * 检测项目级配置中的明文 API Key 安全风险。
 *
 * 仅在 source 为 'project' 时检查。当 apiKey 字段值满足以下条件时触发警告：
 * - 长度超过 20 个字符
 * - 不匹配 {env:VARIABLE_NAME} 格式
 *
 * @param config - 已解析的模型配置
 * @param source - 配置来源：'global' 或 'project'
 * @returns 安全警告列表
 */
export function detectPlaintextApiKeys(
  config: ModelsConfig,
  source: 'global' | 'project',
): ValidationError[] {
  const warnings: ValidationError[] = []

  // 仅检查项目级配置
  if (source !== 'project') {
    return warnings
  }

  for (const [providerKey, provider] of Object.entries(config.providers)) {
    // apiKey 为可选字段，未设置时跳过
    if (
      !provider.apiKey ||
      typeof provider.apiKey !== 'string'
    ) {
      continue
    }

    const apiKey = provider.apiKey

    // 检查是否为疑似明文 API Key：长度超过阈值且非 {env:} 格式
    if (apiKey.length > PLAINTEXT_KEY_MIN_LENGTH && !ENV_REF_PATTERN.test(apiKey)) {
      warnings.push({
        path: `providers.${providerKey}.apiKey`,
        message: `安全警告: Provider "${provider.name}" 的 apiKey 疑似明文，建议使用 {env:VAR} 语法`,
        severity: 'warning',
      })
    }
  }

  return warnings
}
