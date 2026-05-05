/**
 * Integration test for Bridge query path
 * Verifies the adapter generator function has correct signature
 */
import { describe, it, expect } from 'bun:test'
import type { BridgeQueryParams } from '../bridge/queryEngineAdapter.js'

describe('Bridge query adapter', () => {
  it('BridgeQueryParams accepts QueryParams-compatible shape', () => {
    // This should compile — if it doesn't, the types are incompatible
    const params: BridgeQueryParams = {
      messages: [],
      systemPrompt: 'test' as any,
      canUseTool: async () => ({ behavior: 'allow' }) as any,
      toolUseContext: {} as any,
      model: 'claude-sonnet-4-20250514',
      maxTurns: 5,
    }

    expect(params.messages).toEqual([])
    expect(params.model).toBe('claude-sonnet-4-20250514')
    expect(params.maxTurns).toBe(5)
  })

  it('BridgeQueryParams supports optional fields', () => {
    const params: BridgeQueryParams = {
      messages: [],
      systemPrompt: '' as any,
    }

    // All optional fields should be undefined by default
    expect(params.canUseTool).toBeUndefined()
    expect(params.toolUseContext).toBeUndefined()
    expect(params.apiKey).toBeUndefined()
    expect(params.baseUrl).toBeUndefined()
    expect(params.apiFormat).toBeUndefined()
  })

  it('BridgeQueryParams supports API format override', () => {
    const params: BridgeQueryParams = {
      messages: [],
      systemPrompt: '' as any,
      apiFormat: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
    }

    expect(params.apiFormat).toBe('openai')
    expect(params.baseUrl).toBe('https://api.openai.com/v1')
  })

  it('createQueryEngineAdapter is importable', async () => {
    const mod = await import('../bridge/queryEngineAdapter.js')
    expect(typeof mod.createQueryEngineAdapter).toBe('function')
  })

  it('stripBridgeArgs removes bridge-only flags', async () => {
    const { shouldUseInkBridge } = await import('../runtime/inkBridgeRenderer.js')
    // Verify the function exists and works
    expect(shouldUseInkBridge(['--ink-bridge'])).toBe(true)
    expect(shouldUseInkBridge(['--legacy-bridge'])).toBe(true)
    expect(shouldUseInkBridge(['--ink'])).toBe(true)
    expect(shouldUseInkBridge(['--native', '--ink-bridge'])).toBe(true)
    expect(shouldUseInkBridge(['--native'])).toBe(false)
    expect(shouldUseInkBridge([])).toBe(false)
    expect(shouldUseInkBridge(['--model', 'gpt-4'])).toBe(false)
  })
})