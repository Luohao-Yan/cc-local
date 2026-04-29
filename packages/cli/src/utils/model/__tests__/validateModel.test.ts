/**
 * 单元测试：validateModel 错误信息增强
 *
 * 验证当模型来自 JSON 配置时，错误信息中包含 Provider 名称和操作提示。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 模拟依赖模块
vi.mock('../multiModel.js', () => ({
  resolveMultiModelConfig: vi.fn().mockReturnValue(null),
  getConfiguredModels: vi.fn().mockReturnValue([]),
}))

vi.mock('../modelAllowlist.js', () => ({
  isModelAllowed: vi.fn().mockReturnValue(true),
}))

vi.mock('../../sideQuery.js', () => ({
  sideQuery: vi.fn(),
}))

vi.mock('../aliases.js', () => ({
  MODEL_ALIASES: ['sonnet', 'opus', 'haiku'],
}))

vi.mock('../providers.js', () => ({
  getAPIProvider: vi.fn().mockReturnValue('thirdParty'),
}))

vi.mock('../modelStrings.js', () => ({
  getModelStrings: vi.fn().mockReturnValue({}),
}))

import { validateModel } from '../validateModel.js'
import { getConfiguredModels } from '../multiModel.js'
import { sideQuery } from '../../sideQuery.js'
import {
  NotFoundError,
  APIError,
  APIConnectionError,
  AuthenticationError,
} from '@anthropic-ai/sdk'

const mockGetConfiguredModels = vi.mocked(getConfiguredModels)
const mockSideQuery = vi.mocked(sideQuery)

describe('handleValidationError 错误信息增强', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // 辅助函数：配置 JSON 模型列表
  function setupConfiguredModels() {
    mockGetConfiguredModels.mockReturnValue([
      {
        providerKey: 'openai',
        providerName: 'OpenAI',
        modelKey: 'gpt-4o',
        modelName: 'GPT-4o',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        aliases: ['4o', 'gpt4o'],
      },
      {
        providerKey: 'ollama',
        providerName: 'Ollama 本地',
        modelKey: 'qwen3:32b',
        modelName: 'Qwen3 32B',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: null,
        aliases: ['qwen'],
      },
    ])
  }

  it('JSON 配置模型的 NotFoundError 应包含 Provider 信息和操作提示', async () => {
    setupConfiguredModels()
    const headers = new Headers()
    mockSideQuery.mockRejectedValue(
      new NotFoundError(404, { type: 'error', error: { type: 'not_found_error', message: 'model not found' } }, 'not found', headers),
    )

    const result = await validateModel('gpt-4o')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Provider: OpenAI')
    expect(result.error).toContain('/model remove')
    expect(result.error).toContain('/model add')
    expect(result.error).toContain('gpt-4o')
  })

  it('JSON 配置模型的 AuthenticationError 应包含 Provider 信息和操作提示', async () => {
    setupConfiguredModels()
    const headers = new Headers()
    mockSideQuery.mockRejectedValue(
      new AuthenticationError(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid key' } }, 'auth failed', headers),
    )

    const result = await validateModel('gpt-4o')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Provider: OpenAI')
    expect(result.error).toContain('/model remove')
    expect(result.error).toContain('/model add')
  })

  it('JSON 配置模型的 APIConnectionError 应包含 Provider 信息和操作提示', async () => {
    setupConfiguredModels()
    mockSideQuery.mockRejectedValue(
      new APIConnectionError({ cause: new Error('ECONNREFUSED') }),
    )

    const result = await validateModel('qwen3:32b')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Provider: Ollama 本地')
    expect(result.error).toContain('/model remove')
    expect(result.error).toContain('/model add')
  })

  it('通过别名匹配的模型也应包含 Provider 信息', async () => {
    setupConfiguredModels()
    const headers = new Headers()
    mockSideQuery.mockRejectedValue(
      new NotFoundError(404, { type: 'error', error: { type: 'not_found_error', message: 'not found' } }, 'not found', headers),
    )

    const result = await validateModel('qwen')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Provider: Ollama 本地')
  })

  it('非 JSON 配置模型的错误信息不应包含 Provider 提示', async () => {
    // 空配置列表 — 模型不在 JSON 配置中
    mockGetConfiguredModels.mockReturnValue([])
    const headers = new Headers()
    mockSideQuery.mockRejectedValue(
      new NotFoundError(404, { type: 'error', error: { type: 'not_found_error', message: 'not found' } }, 'not found', headers),
    )

    const result = await validateModel('some-unknown-model')
    expect(result.valid).toBe(false)
    expect(result.error).not.toContain('Provider:')
    expect(result.error).not.toContain('/model remove')
    expect(result.error).toContain("Model 'some-unknown-model' not found")
  })

  it('未知错误也应对 JSON 配置模型增强错误信息', async () => {
    setupConfiguredModels()
    mockSideQuery.mockRejectedValue(new Error('unexpected failure'))

    const result = await validateModel('gpt-4o')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Provider: OpenAI')
    expect(result.error).toContain('/model remove')
    expect(result.error).toContain('unexpected failure')
  })
})
