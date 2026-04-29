/**
 * JSON 多模型配置管理器（Config_Manager）
 *
 * 负责读取、解析、合并、缓存、持久化 JSON 模型配置。
 * 支持全局配置（~/.claude/models.json）和项目级配置（.claude/models.json）。
 * 复用已有的文件锁、BOM 处理等成熟基础设施。
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { getClaudeConfigHomeDir } from '../envUtils.js'
import { getCwd } from '../cwd.js'
import { getErrnoCode } from '../errors.js'
import { stripBOM } from '../jsonRead.js'
import * as lockfile from '../lockfile.js'
import { logForDebugging } from '../debug.js'

// ===== 类型定义 =====

/** 单个模型配置 */
export interface ModelEntry {
  /** 模型显示名称 */
  name: string
  /** 可选别名数组 */
  alias?: string[]
  /** 允许未知额外字段，确保前向兼容 */
  [key: string]: unknown
}

/** 单个 Provider 配置 */
export interface ProviderEntry {
  /** Provider 显示名称 */
  name: string
  /** API 端点 URL */
  baseUrl: string
  /** API Key（可选，支持 {env:VAR} 语法） */
  apiKey?: string
  /** 可选自定义请求头 */
  headers?: Record<string, string>
  /** 该 Provider 下的模型列表，key 为模型 ID */
  models: Record<string, ModelEntry>
  /** 允许未知额外字段，确保前向兼容 */
  [key: string]: unknown
}

/** 顶层配置结构 */
export interface ModelsConfig {
  /** Provider 列表，key 为 Provider ID */
  providers: Record<string, ProviderEntry>
  /** 默认模型（别名或模型 ID） */
  defaultModel?: string
  /** 快速小模型（用于 buddy/observer） */
  smallFastModel?: string
  /** 可选设置字段（用于 disableInstallationChecks 等） */
  settings?: {
    disableInstallationChecks?: boolean
    [key: string]: unknown
  }
  /** 允许未知额外字段，确保前向兼容 */
  [key: string]: unknown
}

// ===== 环境变量引用解析 =====

/** {env:VARIABLE_NAME} 正则匹配模式 */
const ENV_REF_PATTERN = /^\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/

/**
 * 解析 {env:VARIABLE_NAME} 语法，返回实际值。
 * 如果不匹配 {env:} 格式，原样返回。
 * 如果环境变量不存在，抛出包含变量名的错误。
 */
export function resolveEnvReference(value: string): string {
  const match = value.match(ENV_REF_PATTERN)
  if (!match) {
    // 不匹配 {env:} 格式，原样返回（视为明文值）
    return value
  }

  const varName = match[1]
  const envValue = process.env[varName]
  if (envValue === undefined) {
    throw new Error(
      `环境变量 "${varName}" 未设置，请检查 {env:${varName}} 引用`,
    )
  }

  return envValue
}

// ===== 路径函数 =====

/**
 * 获取全局模型配置文件路径：~/.claude/models.json
 * 支持 CLAUDE_CONFIG_DIR 环境变量覆盖。
 */
export function getGlobalModelsConfigPath(): string {
  return join(getClaudeConfigHomeDir(), 'models.json')
}

/**
 * 获取项目级模型配置文件路径：<cwd>/.claude/models.json
 * 如果获取 cwd 失败，返回 null。
 */
export function getProjectModelsConfigPath(): string | null {
  try {
    return join(getCwd(), '.claude', 'models.json')
  } catch {
    return null
  }
}

// ===== 默认配置工厂 =====

/** 创建空的默认 ModelsConfig */
function createDefaultModelsConfig(): ModelsConfig {
  return {
    providers: {},
  }
}

// ===== 配置读取 =====

/**
 * 从文件读取并解析 JSON 配置。
 * 文件不存在时返回默认空配置，不报错。
 * 复用 stripBOM 处理 PowerShell 生成的 UTF-8 BOM。
 */
function readModelsConfigFromFile(filePath: string): ModelsConfig {
  try {
    // 用 Buffer 读取再手动转 UTF-8，彻底绕过 BOM 问题。
    // readFileSync encoding:'utf-8' 在某些 bun/Node 版本下可能不剥离 BOM 字节，
    // 而 Buffer 读取后 toString('utf-8') 会把 EF BB BF 转成 \uFEFF，stripBOM 能稳定处理。
    const buf = readFileSync(filePath)
    const content = buf.toString('utf-8')
    const parsed = JSON.parse(stripBOM(content))
    // 合并默认值，确保 providers 字段存在
    return {
      ...createDefaultModelsConfig(),
      ...parsed,
    }
  } catch (error) {
    const code = getErrnoCode(error)
    if (code === 'ENOENT') {
      // 文件不存在，返回默认空配置
      return createDefaultModelsConfig()
    }
    // 其他错误（权限不足、JSON 语法错误等），记录日志并返回默认配置
    logForDebugging(
      `读取模型配置文件失败 (${filePath}): ${error}`,
      { level: 'error' },
    )
    return createDefaultModelsConfig()
  }
}

// ===== 配置合并 =====

/**
 * 合并全局配置和项目级配置。
 * 合并策略：Provider 级别覆盖，项目级同名 Provider 整体替换全局级。
 * defaultModel 和 smallFastModel 同理，项目级覆盖全局级。
 */
export function mergeModelsConfig(
  globalConfig: ModelsConfig,
  projectConfig: ModelsConfig,
): ModelsConfig {
  // 以全局配置为基础，项目级字段覆盖
  const merged: ModelsConfig = {
    ...globalConfig,
    ...projectConfig,
    // Provider 级别合并：同名整体替换，不同名保留
    providers: {
      ...globalConfig.providers,
      ...projectConfig.providers,
    },
  }

  // 如果项目级没有显式设置 defaultModel，保留全局级的
  if (projectConfig.defaultModel !== undefined) {
    merged.defaultModel = projectConfig.defaultModel
  } else if (globalConfig.defaultModel !== undefined) {
    merged.defaultModel = globalConfig.defaultModel
  }

  // 如果项目级没有显式设置 smallFastModel，保留全局级的
  if (projectConfig.smallFastModel !== undefined) {
    merged.smallFastModel = projectConfig.smallFastModel
  } else if (globalConfig.smallFastModel !== undefined) {
    merged.smallFastModel = globalConfig.smallFastModel
  }

  return merged
}

// ===== 内存缓存 =====

/** 内存缓存：合并后的配置 */
let cachedMergedConfig: ModelsConfig | null = null

/**
 * 获取合并后的模型配置（全局 + 项目级），带内存缓存。
 * 首次调用时读取文件并缓存，后续直接返回缓存。
 */
export function getModelConfig(): ModelsConfig {
  if (cachedMergedConfig !== null) {
    return cachedMergedConfig
  }

  // 读取全局配置
  const globalConfig = readModelsConfigFromFile(getGlobalModelsConfigPath())

  // 读取项目级配置
  const projectPath = getProjectModelsConfigPath()
  const projectConfig = projectPath
    ? readModelsConfigFromFile(projectPath)
    : createDefaultModelsConfig()

  // 合并配置
  cachedMergedConfig = mergeModelsConfig(globalConfig, projectConfig)
  return cachedMergedConfig
}

/**
 * 仅获取全局模型配置（不合并项目级）。
 */
export function getGlobalModelConfig(): ModelsConfig {
  return readModelsConfigFromFile(getGlobalModelsConfigPath())
}

// ===== 配置持久化 =====

/**
 * 保存全局模型配置（带文件锁）。
 * 复用 proper-lockfile 的锁机制，与 config.ts 中的 saveConfigWithLock 模式一致。
 * 序列化使用 2 空格缩进，UTF-8 编码。
 */
export function saveGlobalModelConfig(
  updater: (current: ModelsConfig) => ModelsConfig,
): void {
  const filePath = getGlobalModelsConfigPath()
  const dir = dirname(filePath)

  // 确保目录存在
  try {
    mkdirSync(dir, { recursive: true })
  } catch (mkdirErr) {
    const mkdirCode = getErrnoCode(mkdirErr)
    if (mkdirCode !== 'EEXIST') {
      throw mkdirErr
    }
  }

  let release: (() => void) | undefined
  try {
    // 获取文件锁
    const lockFilePath = `${filePath}.lock`
    release = lockfile.lockSync(filePath, {
      lockfilePath: lockFilePath,
      onCompromised: (err: Error) => {
        logForDebugging(`模型配置文件锁被破坏: ${err}`, { level: 'error' })
      },
    })

    // 重新读取当前配置（获取最新状态）
    const currentConfig = readModelsConfigFromFile(filePath)

    // 应用更新函数
    const updatedConfig = updater(currentConfig)

    // 如果没有变化（返回相同引用），跳过写入
    if (updatedConfig === currentConfig) {
      return
    }

    // 序列化并写入文件，2 空格缩进，UTF-8 编码
    writeFileSync(filePath, JSON.stringify(updatedConfig, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    })

    // 清除缓存，下次读取时重新加载
    cachedMergedConfig = null
  } finally {
    if (release) {
      release()
    }
  }
}

// ===== 缓存管理 =====

/**
 * 重置内存缓存（用于测试）。
 */
export function resetModelConfigCache(): void {
  cachedMergedConfig = null
}
