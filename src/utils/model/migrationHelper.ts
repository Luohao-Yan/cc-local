/**
 * 迁移助手（Migration_Helper）
 *
 * 检测旧 `.env` 格式的 MODEL_* 环境变量，
 * 提供转换为 JSON ModelsConfig 的能力，
 * 并在需要时输出一次性迁移提示。
 */

import type { ModelsConfig } from './modelConfig.js'
import { getModelConfig } from './modelConfig.js'
import { writeToStderr } from '../process.js'

// ===== 常量 =====

/** 匹配旧格式 MODEL_*_NAME 环境变量的正则 */
const LEGACY_NAME_PATTERN = /^MODEL_([A-Z0-9_]+)_NAME$/

// ===== 模块级状态 =====

/** 迁移提示是否已显示（确保仅显示一次） */
let migrationHintShown = false

// ===== 公开 API =====

/**
 * 检测 process.env 中是否存在旧格式 MODEL_*_NAME 环境变量。
 * 扫描所有环境变量 key，匹配 /^MODEL_[A-Z0-9_]+_NAME$/ 模式。
 *
 * @returns 如果存在任何匹配的环境变量则返回 true
 */
export function hasLegacyModelEnvVars(): boolean {
  return Object.keys(process.env).some(key => LEGACY_NAME_PATTERN.test(key))
}

/**
 * 将 process.env 中的 MODEL_* 环境变量转换为 ModelsConfig 格式。
 *
 * 扫描规则：
 *   - MODEL_<ALIAS>_NAME → 模型名称（同时作为 Provider 名称和模型条目）
 *   - MODEL_<ALIAS>_BASE_URL → Provider 的 baseUrl
 *   - MODEL_<ALIAS>_API_KEY → Provider 的 apiKey
 *
 * 每个 alias 转换为一个 Provider key（小写），
 * 模型名称同时作为 Provider 显示名称和唯一的模型条目。
 *
 * @returns 转换后的 ModelsConfig 对象
 */
export function convertLegacyEnvToConfig(): ModelsConfig {
  const providers: ModelsConfig['providers'] = {}

  for (const key of Object.keys(process.env)) {
    const match = key.match(LEGACY_NAME_PATTERN)
    if (!match) {
      continue
    }

    // 提取别名部分（如 MODEL_OPENAI_NAME → OPENAI）
    const aliasUpper = match[1]!
    const aliasLower = aliasUpper.toLowerCase()

    // 读取对应的环境变量值
    const modelName = process.env[key] || aliasLower
    const baseUrl = process.env[`MODEL_${aliasUpper}_BASE_URL`] || ''
    const apiKey = process.env[`MODEL_${aliasUpper}_API_KEY`]

    // 跳过没有 baseUrl 的条目（无法使用）
    if (!baseUrl) {
      continue
    }

    // 构建 Provider 条目
    const provider: ModelsConfig['providers'][string] = {
      name: modelName,
      baseUrl,
      models: {
        [modelName]: {
          name: modelName,
          alias: [aliasLower],
        },
      },
    }

    // 仅在有 apiKey 时添加该字段
    if (apiKey) {
      provider.apiKey = apiKey
    }

    providers[aliasLower] = provider
  }

  return { providers }
}

/**
 * 检查是否需要显示迁移提示，满足以下条件时输出一次性提示到 stderr：
 *   1. 存在旧格式 MODEL_* 环境变量
 *   2. JSON 配置中没有任何 Provider
 *   3. 本次进程尚未显示过提示
 *
 * 使用模块级标记确保每次进程最多显示一次。
 */
export function showMigrationHintIfNeeded(): void {
  // 已经显示过，直接跳过
  if (migrationHintShown) {
    return
  }

  // 没有旧格式环境变量，无需提示
  if (!hasLegacyModelEnvVars()) {
    return
  }

  // JSON 配置已有 Provider，跳过提示
  const config = getModelConfig()
  if (Object.keys(config.providers).length > 0) {
    return
  }

  // 标记已显示
  migrationHintShown = true

  // 输出迁移提示到 stderr
  writeToStderr(
    '\n⚠️  检测到旧格式 MODEL_* 环境变量。该配置方式已废弃，请迁移到 JSON 配置。\n' +
      '   运行 /migrate-models 命令可自动完成迁移。\n' +
      '   详情请参阅项目文档。\n\n',
  )
}

/**
 * 重置迁移提示状态（用于测试）。
 */
export function resetMigrationHintState(): void {
  migrationHintShown = false
}
