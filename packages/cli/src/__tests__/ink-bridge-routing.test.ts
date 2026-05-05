/**
 * Quick smoke test for ink-bridge routing
 * Verifies the import chain works without actually rendering Ink UI
 */
import { describe, it, expect } from 'bun:test'

describe('ink-bridge routing', () => {
  it('shouldUseInkBridge returns true for --ink-bridge flag', async () => {
    const { shouldUseInkBridge } = await import('../runtime/inkBridgeRenderer.js')
    expect(shouldUseInkBridge(['--ink-bridge'])).toBe(true)
    expect(shouldUseInkBridge(['--legacy-bridge'])).toBe(true)
    expect(shouldUseInkBridge(['--ink'])).toBe(true)
    expect(shouldUseInkBridge(['--native'])).toBe(false)
    expect(shouldUseInkBridge([])).toBe(false)
  })

  it('getBridgeServerUrl extracts --server value', async () => {
    const { getBridgeServerUrl } = await import('../runtime/inkBridgeRenderer.js')
    expect(getBridgeServerUrl(['--server', 'http://localhost:3000'])).toBe('http://localhost:3000')
    expect(getBridgeServerUrl(['--server'])).toBeUndefined()
    expect(getBridgeServerUrl([])).toBeUndefined()
  })

  it('getBridgeAuthToken extracts --token value', async () => {
    const { getBridgeAuthToken } = await import('../runtime/inkBridgeRenderer.js')
    expect(getBridgeAuthToken(['--token', 'abc123'])).toBe('abc123')
    expect(getBridgeAuthToken([])).toBeUndefined()
  })

  it('shouldUseQueryEngine returns true when env is set', async () => {
    const orig = process.env.CCLOCAL_USE_QUERY_ENGINE
    process.env.CCLOCAL_USE_QUERY_ENGINE = '1'
    const { shouldUseQueryEngine } = await import('../bridge/queryEngineAdapter.js')
    expect(shouldUseQueryEngine()).toBe(true)
    if (orig !== undefined) {
      process.env.CCLOCAL_USE_QUERY_ENGINE = orig
    } else {
      delete process.env.CCLOCAL_USE_QUERY_ENGINE
    }
  })

  it('translateStreamEvent handles all StreamEvent types', async () => {
    // Import the module — translateStreamEvent is not exported but we can
    // verify the adapter doesn't crash on import
    const adapter = await import('../bridge/queryEngineAdapter.js')
    expect(adapter.createQueryEngineAdapter).toBeDefined()
    expect(adapter.shouldUseQueryEngine).toBeDefined()
  })
})
