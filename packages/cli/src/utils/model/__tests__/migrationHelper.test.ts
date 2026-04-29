/**
 * 单元测试：迁移逻辑（Migration_Helper）
 *
 * 覆盖 hasLegacyModelEnvVars()、convertLegacyEnvToConfig()、showMigrationHintIfNeeded() 的核心场景。
 * 验证需求 5.1, 5.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  hasLegacyModelEnvVars,
  convertLegacyEnvToConfig,
  showMigrationHintIfNeeded,
  resetMigrationHintState,
} from '../migrationHelper.js'

// ===== Mock 依赖 =====

/** Mock getModelConfig，控制 JSON 配置返回值 */
vi.mock('../modelConfig.js', () => ({
  getModelConfig: vi.fn(() => ({ providers: {} })),
}))

/** Mock writeToStderr，捕获迁移提示输出 */
vi.mock('../../process.js', () => ({
  writeToStderr: vi.fn(),
}))

import { getModelConfig } from '../modelConfig.js'
import { writeToStderr } from '../../process.js'

// ===== 环境变量备份与恢复 =====

/** 保存原始环境变量，测试结束后恢复 */
let savedEnv: NodeJS.ProcessEnv

beforeEach(() => {
  savedEnv = { ...process.env }
  // 清除所有 MODEL_* 环境变量，确保测试隔离
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('MODEL_')) {
      delete process.env[key]
    }
  }
  // 重置迁移提示状态
  resetMigrationHintState()
  // 重置 mock 调用记录
  vi.clearAllMocks()
})

afterEach(() => {
  // 恢复原始环境变量
  process.env = savedEnv
})

// ===== hasLegacyModelEnvVars 测试 =====

describe('hasLegacyModelEnvVars', () => {
  it('存在 MODEL_*_NAME 环境变量时应返回 true', () => {
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'
    expect(hasLegacyModelEnvVars()).toBe(true)
  })

  it('不存在 MODEL_*_NAME 环境变量时应返回 false', () => {
    // beforeEach 已清除所有 MODEL_* 变量
    expect(hasLegacyModelEnvVars()).toBe(false)
  })

  it('存在多个 MODEL_*_NAME 环境变量时应返回 true', () => {
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'
    process.env.MODEL_OLLAMA_NAME = 'qwen3:32b'
    expect(hasLegacyModelEnvVars()).toBe(true)
  })

  it('仅存在 MODEL_*_BASE_URL 而无 MODEL_*_NAME 时应返回 false', () => {
    process.env.MODEL_OPENAI_BASE_URL = 'https://api.openai.com/v1'
    expect(hasLegacyModelEnvVars()).toBe(false)
  })
})

// ===== convertLegacyEnvToConfig 测试 =====

describe('convertLegacyEnvToConfig', () => {
  it('将 MODEL_OPENAI_NAME/BASE_URL/API_KEY 转换为正确的 ModelsConfig', () => {
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'
    process.env.MODEL_OPENAI_BASE_URL = 'https://api.openai.com/v1'
    process.env.MODEL_OPENAI_API_KEY = 'sk-test-key'

    const config = convertLegacyEnvToConfig()

    // 验证 Provider key 为小写别名
    expect(config.providers).toHaveProperty('openai')
    const provider = config.providers.openai!

    // 验证 Provider 字段
    expect(provider.name).toBe('gpt-4o')
    expect(provider.baseUrl).toBe('https://api.openai.com/v1')
    expect(provider.apiKey).toBe('sk-test-key')

    // 验证模型条目
    expect(provider.models).toHaveProperty('gpt-4o')
    expect(provider.models['gpt-4o']!.name).toBe('gpt-4o')
    expect(provider.models['gpt-4o']!.alias).toEqual(['openai'])
  })

  it('跳过没有 BASE_URL 的条目', () => {
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'
    // 不设置 MODEL_OPENAI_BASE_URL

    const config = convertLegacyEnvToConfig()

    // 没有 baseUrl 的条目应被跳过
    expect(Object.keys(config.providers)).toHaveLength(0)
  })

  it('处理没有 API_KEY 的条目（本地模型）', () => {
    process.env.MODEL_OLLAMA_NAME = 'qwen3:32b'
    process.env.MODEL_OLLAMA_BASE_URL = 'http://localhost:11434/v1'
    // 不设置 MODEL_OLLAMA_API_KEY

    const config = convertLegacyEnvToConfig()

    expect(config.providers).toHaveProperty('ollama')
    const provider = config.providers.ollama!

    // 验证基本字段
    expect(provider.name).toBe('qwen3:32b')
    expect(provider.baseUrl).toBe('http://localhost:11434/v1')

    // 无 apiKey 时不应包含该字段
    expect(provider.apiKey).toBeUndefined()

    // 验证模型条目
    expect(provider.models['qwen3:32b']!.alias).toEqual(['ollama'])
  })

  it('转换多个 Provider', () => {
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'
    process.env.MODEL_OPENAI_BASE_URL = 'https://api.openai.com/v1'
    process.env.MODEL_OPENAI_API_KEY = 'sk-openai'
    process.env.MODEL_OLLAMA_NAME = 'qwen3:32b'
    process.env.MODEL_OLLAMA_BASE_URL = 'http://localhost:11434/v1'

    const config = convertLegacyEnvToConfig()

    expect(Object.keys(config.providers)).toHaveLength(2)
    expect(config.providers).toHaveProperty('openai')
    expect(config.providers).toHaveProperty('ollama')
  })

  it('无 MODEL_*_NAME 环境变量时返回空 providers', () => {
    const config = convertLegacyEnvToConfig()
    expect(config.providers).toEqual({})
  })
})

// ===== showMigrationHintIfNeeded 测试 =====

describe('showMigrationHintIfNeeded', () => {
  it('存在旧格式变量且 JSON 配置无 Provider 时应显示提示', () => {
    // 设置旧格式环境变量
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'

    // Mock getModelConfig 返回空 providers
    vi.mocked(getModelConfig).mockReturnValue({ providers: {} })

    showMigrationHintIfNeeded()

    // 应调用 writeToStderr 输出迁移提示
    expect(writeToStderr).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeToStderr).mock.calls[0]![0]).toContain('迁移')
  })

  it('JSON 配置已有 Provider 时应跳过提示', () => {
    // 设置旧格式环境变量
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'

    // Mock getModelConfig 返回有 Provider 的配置
    vi.mocked(getModelConfig).mockReturnValue({
      providers: {
        openai: {
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          models: {},
        },
      },
    })

    showMigrationHintIfNeeded()

    // 不应输出任何提示
    expect(writeToStderr).not.toHaveBeenCalled()
  })

  it('每个进程仅显示一次提示', () => {
    process.env.MODEL_OPENAI_NAME = 'gpt-4o'
    vi.mocked(getModelConfig).mockReturnValue({ providers: {} })

    // 第一次调用应显示提示
    showMigrationHintIfNeeded()
    expect(writeToStderr).toHaveBeenCalledTimes(1)

    // 第二次调用应跳过
    showMigrationHintIfNeeded()
    expect(writeToStderr).toHaveBeenCalledTimes(1)
  })

  it('无旧格式环境变量时应跳过提示', () => {
    // 不设置任何 MODEL_* 环境变量
    vi.mocked(getModelConfig).mockReturnValue({ providers: {} })

    showMigrationHintIfNeeded()

    // 不应输出任何提示
    expect(writeToStderr).not.toHaveBeenCalled()
  })
})
