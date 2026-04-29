/**
 * 单元测试：Config_Validator 校验模块
 *
 * 覆盖 validateModelConfig()、detectAliasConflicts()、detectPlaintextApiKeys() 的核心场景。
 */
import { describe, it, expect } from 'vitest'
import type { ModelsConfig } from '../modelConfig.js'
import {
  validateModelConfig,
  detectAliasConflicts,
  detectPlaintextApiKeys,
} from '../modelConfigValidator.js'

// ===== validateModelConfig 测试 =====

describe('validateModelConfig', () => {
  it('合法配置应返回空错误列表', () => {
    const config = {
      providers: {
        openai: {
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '{env:OPENAI_API_KEY}',
          models: {},
        },
      },
    }
    const errors = validateModelConfig(config)
    expect(errors).toEqual([])
  })

  it('本地模型无 apiKey 应通过校验', () => {
    const config = {
      providers: {
        ollama: {
          name: 'Ollama',
          baseUrl: 'http://localhost:11434/v1',
          models: {},
        },
      },
    }
    const errors = validateModelConfig(config)
    expect(errors).toEqual([])
  })

  it('非对象输入应返回错误', () => {
    expect(validateModelConfig(null)).toEqual([
      expect.objectContaining({ severity: 'error' }),
    ])
    expect(validateModelConfig('string')).toEqual([
      expect.objectContaining({ severity: 'error' }),
    ])
    expect(validateModelConfig([])).toEqual([
      expect.objectContaining({ severity: 'error' }),
    ])
  })

  it('缺少 providers 字段应返回错误', () => {
    const errors = validateModelConfig({})
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('providers')
    expect(errors[0]!.severity).toBe('error')
  })

  it('providers 不是对象应返回错误', () => {
    const errors = validateModelConfig({ providers: 'invalid' })
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('providers')
    expect(errors[0]!.severity).toBe('error')
  })

  it('providers 为数组应返回错误', () => {
    const errors = validateModelConfig({ providers: [] })
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('providers')
    expect(errors[0]!.severity).toBe('error')
  })

  it('Provider 缺少 baseUrl 应返回错误', () => {
    const config = {
      providers: {
        test: { name: 'Test', models: {} },
      },
    }
    const errors = validateModelConfig(config)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('providers.test.baseUrl')
    expect(errors[0]!.message).toContain('baseUrl')
    expect(errors[0]!.severity).toBe('error')
  })

  it('baseUrl 非字符串应返回错误', () => {
    const config = {
      providers: {
        test: { name: 'Test', baseUrl: 123, models: {} },
      },
    }
    const errors = validateModelConfig(config)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('providers.test.baseUrl')
    expect(errors[0]!.severity).toBe('error')
  })

  it('baseUrl 不以 http:// 或 https:// 开头应返回错误', () => {
    const config = {
      providers: {
        test: { name: 'Test', baseUrl: 'ftp://example.com', models: {} },
      },
    }
    const errors = validateModelConfig(config)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('providers.test.baseUrl')
    expect(errors[0]!.message).toContain('http://');
    expect(errors[0]!.message).toContain('https://');
    expect(errors[0]!.severity).toBe('error')
  })

  it('多个 Provider 各自有错误应全部报告', () => {
    const config = {
      providers: {
        a: { name: 'A', models: {} },
        b: { name: 'B', baseUrl: 'invalid-url', models: {} },
      },
    }
    const errors = validateModelConfig(config)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.path)).toContain('providers.a.baseUrl')
    expect(errors.map((e) => e.path)).toContain('providers.b.baseUrl')
  })

  it('Provider 值不是对象应返回错误', () => {
    const config = {
      providers: {
        test: 'not-an-object',
      },
    }
    const errors = validateModelConfig(config)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('providers.test')
    expect(errors[0]!.severity).toBe('error')
  })

  it('空 providers 对象应通过校验', () => {
    const config = { providers: {} }
    const errors = validateModelConfig(config)
    expect(errors).toEqual([])
  })
})

// ===== detectAliasConflicts 测试 =====

describe('detectAliasConflicts', () => {
  it('无别名冲突应返回空列表', () => {
    const config: ModelsConfig = {
      providers: {
        openai: {
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          models: {
            'gpt-4o': { name: 'GPT-4o', alias: ['4o'] },
          },
        },
        ollama: {
          name: 'Ollama',
          baseUrl: 'http://localhost:11434/v1',
          models: {
            'qwen3:32b': { name: 'Qwen3', alias: ['qwen'] },
          },
        },
      },
    }
    const warnings = detectAliasConflicts(config)
    expect(warnings).toEqual([])
  })

  it('跨 Provider 的相同别名应返回警告', () => {
    const config: ModelsConfig = {
      providers: {
        openai: {
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          models: {
            'gpt-4o': { name: 'GPT-4o', alias: ['fast'] },
          },
        },
        ollama: {
          name: 'Ollama',
          baseUrl: 'http://localhost:11434/v1',
          models: {
            'qwen3:32b': { name: 'Qwen3', alias: ['fast'] },
          },
        },
      },
    }
    const warnings = detectAliasConflicts(config)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.severity).toBe('warning')
    expect(warnings[0]!.message).toContain('fast')
    expect(warnings[0]!.message).toContain('OpenAI')
    expect(warnings[0]!.message).toContain('Ollama')
  })

  it('大小写不敏感的别名冲突应被检测', () => {
    const config: ModelsConfig = {
      providers: {
        a: {
          name: 'Provider A',
          baseUrl: 'https://a.com',
          models: {
            m1: { name: 'Model 1', alias: ['MyAlias'] },
          },
        },
        b: {
          name: 'Provider B',
          baseUrl: 'https://b.com',
          models: {
            m2: { name: 'Model 2', alias: ['myalias'] },
          },
        },
      },
    }
    const warnings = detectAliasConflicts(config)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.severity).toBe('warning')
  })

  it('同一 Provider 内的重复别名不应触发跨 Provider 冲突', () => {
    const config: ModelsConfig = {
      providers: {
        openai: {
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          models: {
            m1: { name: 'Model 1', alias: ['fast'] },
            m2: { name: 'Model 2', alias: ['fast'] },
          },
        },
      },
    }
    // 同一 Provider 内的重复不算跨 Provider 冲突
    const warnings = detectAliasConflicts(config)
    expect(warnings).toEqual([])
  })

  it('无模型的 Provider 应安全跳过', () => {
    const config: ModelsConfig = {
      providers: {
        empty: {
          name: 'Empty',
          baseUrl: 'https://empty.com',
          models: {},
        },
      },
    }
    const warnings = detectAliasConflicts(config)
    expect(warnings).toEqual([])
  })
})

// ===== detectPlaintextApiKeys 测试 =====

describe('detectPlaintextApiKeys', () => {
  it('全局配置不应触发明文 Key 警告', () => {
    const config: ModelsConfig = {
      providers: {
        test: {
          name: 'Test',
          baseUrl: 'https://test.com',
          apiKey: 'sk-this-is-a-very-long-plaintext-api-key-value',
          models: {},
        },
      },
    }
    const warnings = detectPlaintextApiKeys(config, 'global')
    expect(warnings).toEqual([])
  })

  it('项目级配置中长度超过 20 的明文 Key 应触发警告', () => {
    const config: ModelsConfig = {
      providers: {
        test: {
          name: 'Test Provider',
          baseUrl: 'https://test.com',
          apiKey: 'sk-this-is-a-very-long-plaintext-api-key-value',
          models: {},
        },
      },
    }
    const warnings = detectPlaintextApiKeys(config, 'project')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.severity).toBe('warning')
    expect(warnings[0]!.path).toBe('providers.test.apiKey')
    expect(warnings[0]!.message).toContain('Test Provider')
  })

  it('{env:VAR} 格式的 apiKey 不应触发警告', () => {
    const config: ModelsConfig = {
      providers: {
        test: {
          name: 'Test',
          baseUrl: 'https://test.com',
          apiKey: '{env:MY_VERY_LONG_API_KEY_NAME}',
          models: {},
        },
      },
    }
    const warnings = detectPlaintextApiKeys(config, 'project')
    expect(warnings).toEqual([])
  })

  it('长度不超过 20 的 apiKey 不应触发警告', () => {
    const config: ModelsConfig = {
      providers: {
        test: {
          name: 'Test',
          baseUrl: 'https://test.com',
          apiKey: 'short-key',
          models: {},
        },
      },
    }
    const warnings = detectPlaintextApiKeys(config, 'project')
    expect(warnings).toEqual([])
  })

  it('无 apiKey 的 Provider 不应触发警告', () => {
    const config: ModelsConfig = {
      providers: {
        ollama: {
          name: 'Ollama',
          baseUrl: 'http://localhost:11434/v1',
          models: {},
        },
      },
    }
    const warnings = detectPlaintextApiKeys(config, 'project')
    expect(warnings).toEqual([])
  })
})
