/**
 * Tests for native REPL renderer modules
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('native renderer', () => {
  beforeEach(() => {
    vi.stubEnv('FORCE_COLOR', '0')
  })

  it('renderMarkdown returns a string for simple text', async () => {
    const { renderMarkdown } = await import('./renderer.js')
    const result = renderMarkdown('Hello **world**')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('renderCodeBlock returns a string with borders', async () => {
    const { renderCodeBlock } = await import('./renderer.js')
    const result = renderCodeBlock('const x = 1', 'typescript')
    expect(typeof result).toBe('string')
    expect(result).toContain('const x = 1')
  })

  it('renderDiff returns a string for different content', async () => {
    const { renderDiff } = await import('./renderer.js')
    const result = renderDiff('old line\n', 'new line\n', 'test.ts')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('renderDiff shows "No changes" for identical content', async () => {
    const { renderDiff } = await import('./renderer.js')
    const result = renderDiff('same\n', 'same\n', 'test.ts')
    expect(result).toContain('No changes')
  })

  it('renderStatusLine returns a string with model name', async () => {
    const { renderStatusLine } = await import('./renderer.js')
    const result = renderStatusLine({ model: 'test-model', mode: 'default' })
    expect(result).toContain('test-model')
  })

  it('renderStatusLine shows AUTO tag in auto mode', async () => {
    const { renderStatusLine } = await import('./renderer.js')
    const result = renderStatusLine({ model: 'm', mode: 'auto' })
    expect(result).toContain('AUTO')
  })

  it('renderPrompt returns a string with mode indicator', async () => {
    const { renderPrompt } = await import('./renderer.js')
    const result = renderPrompt('default')
    expect(typeof result).toBe('string')
  })

  it('spinnerFrame returns a string', async () => {
    const { spinnerFrame } = await import('./renderer.js')
    expect(typeof spinnerFrame(0)).toBe('string')
    expect(typeof spinnerFrame(5)).toBe('string')
  })
})

describe('native toolRenderer', () => {
  it('renderToolUse returns a string for bash', async () => {
    const { renderToolUse } = await import('./toolRenderer.js')
    const result = renderToolUse('bash', { command: 'echo hello' }, false)
    expect(typeof result).toBe('string')
  })

  it('renderToolUse shows command in verbose mode', async () => {
    const { renderToolUse } = await import('./toolRenderer.js')
    const result = renderToolUse('bash', { command: 'echo hello' }, true)
    expect(typeof result).toBe('string')
  })

  it('renderToolResult returns a string', async () => {
    const { renderToolResult } = await import('./toolRenderer.js')
    const result = renderToolResult('bash', 'output text')
    expect(typeof result).toBe('string')
  })

  it('renderToolResult handles errors', async () => {
    const { renderToolResult } = await import('./toolRenderer.js')
    const result = renderToolResult('bash', 'error text', true)
    expect(result).toContain('error text')
  })
})

describe('native modeManager', () => {
  it('initializes with default mode', async () => {
    const { createModeManager } = await import('./modeManager.js')
    const mgr = createModeManager()
    expect(mgr.getState().mode).toBe('default')
  })

  it('setMode changes the mode', async () => {
    const { createModeManager } = await import('./modeManager.js')
    const mgr = createModeManager()
    mgr.setMode('auto')
    expect(mgr.getState().mode).toBe('auto')
  })

  it('tracks tokens and cost', async () => {
    const { createModeManager } = await import('./modeManager.js')
    const mgr = createModeManager()
    mgr.addTokens(1000)
    mgr.addCost(0.05)
    expect(mgr.getState().tokensUsed).toBe(1000)
    expect(mgr.getState().costUsd).toBeCloseTo(0.05)
  })

  it('incrementTurn increases turn count', async () => {
    const { createModeManager } = await import('./modeManager.js')
    const mgr = createModeManager()
    expect(mgr.getState().turnCount).toBe(0)
    mgr.incrementTurn()
    expect(mgr.getState().turnCount).toBe(1)
  })

  it('toPermissionMode maps auto to auto', async () => {
    const { createModeManager } = await import('./modeManager.js')
    const mgr = createModeManager()
    mgr.setMode('auto')
    expect(mgr.toPermissionMode()).toBe('auto')
  })

  it('toPermissionMode maps plan to plan', async () => {
    const { createModeManager } = await import('./modeManager.js')
    const mgr = createModeManager()
    mgr.setMode('plan')
    expect(mgr.toPermissionMode()).toBe('plan')
  })
})

describe('native completer', () => {
  it('completes slash commands', async () => {
    const { createCompleter } = await import('./completer.js')
    const { CommandRegistry } = await import('@cclocal/core')
    const reg = new CommandRegistry()
    reg.registerDefaults()
    const completer = createCompleter(reg)
    const [hits] = completer('/he')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]).toContain('/help')
  })

  it('returns empty for non-slash input', async () => {
    const { createCompleter } = await import('./completer.js')
    const { commandRegistry } = await import('@cclocal/core')
    const completer = createCompleter(commandRegistry)
    const [hits] = completer('hello')
    expect(hits).toEqual([])
  })
})
