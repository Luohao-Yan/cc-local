import { describe, expect, it, vi } from 'vitest'
import {
  buildLegacyNormalSessionLaunchContext,
  buildLegacyResumeSessionLaunchContext,
} from './sessionLaunchAdapters.js'

describe('legacy session launch adapters', () => {
  const replBase = {
    debug: false,
    commands: ['help', 'model'],
    initialTools: ['bash'],
    mcpClients: ['mcp-local'],
    autoConnectIdeFlag: true,
    mainThreadAgentDefinition: { name: 'main' },
    disableSlashCommands: false,
    dynamicMcpConfig: { local: {} },
    strictMcpConfig: false,
    systemPrompt: 'system',
    appendSystemPrompt: 'append',
    taskListId: 'tasks',
    thinkingConfig: { type: 'adaptive' },
  }

  it('builds a normal session context with hook messages already available', () => {
    const context = buildLegacyNormalSessionLaunchContext({
      getFpsMetrics: vi.fn(() => undefined),
      stats: { turns: 0 },
      initialState: { cwd: '/tmp/project' },
      replBase,
      hookMessages: ['hook-a', 'hook-b'],
      hooksPromise: Promise.resolve(['late-hook']),
    })

    expect(context.appProps.initialState).toEqual({ cwd: '/tmp/project' })
    expect(context.replProps.initialMessages).toEqual(['hook-a', 'hook-b'])
    expect(context.replProps.pendingHookMessages).toBeUndefined()
  })

  it('preserves a pending hook promise when normal session hook messages are not ready', async () => {
    const hooksPromise = Promise.resolve(['late-hook'])
    const context = buildLegacyNormalSessionLaunchContext({
      getFpsMetrics: vi.fn(() => undefined),
      initialState: { cwd: '/tmp/project' },
      replBase,
      hookMessages: [],
      hooksPromise,
    })

    expect(context.replProps.initialMessages).toBeUndefined()
    expect(context.replProps.pendingHookMessages).toBe(hooksPromise)
    await expect(context.replProps.pendingHookMessages).resolves.toEqual(['late-hook'])
  })

  it('prepends a deep-link banner before normal session hook messages', () => {
    const context = buildLegacyNormalSessionLaunchContext({
      getFpsMetrics: vi.fn(() => undefined),
      initialState: { cwd: '/tmp/project' },
      replBase,
      hookMessages: ['hook-a'],
      deepLinkBanner: 'banner',
    })

    expect(context.replProps.initialMessages).toEqual(['banner', 'hook-a'])
  })

  it('builds a resume or continue session context from restored conversation data', () => {
    const context = buildLegacyResumeSessionLaunchContext({
      getFpsMetrics: vi.fn(() => undefined),
      stats: { resumes: 1 },
      replBase,
      fallbackMainThreadAgentDefinition: { name: 'fallback-main' },
      resumeData: {
        initialState: { sessionId: 'session-1' },
        messages: ['user', 'assistant'],
        fileHistorySnapshots: ['snapshot'],
        contentReplacements: ['replacement'],
        agentName: 'worker',
        agentColor: 'blue',
        restoredAgentDef: { name: 'restored-main' },
      },
    })

    expect(context.appProps.initialState).toEqual({ sessionId: 'session-1' })
    expect(context.replProps.mainThreadAgentDefinition).toEqual({ name: 'restored-main' })
    expect(context.replProps.initialMessages).toEqual(['user', 'assistant'])
    expect(context.replProps.initialFileHistorySnapshots).toEqual(['snapshot'])
    expect(context.replProps.initialContentReplacements).toEqual(['replacement'])
    expect(context.replProps.initialAgentName).toBe('worker')
    expect(context.replProps.initialAgentColor).toBe('blue')
  })

  it('falls back to the current main-thread agent definition for teleport-style resume data', () => {
    const context = buildLegacyResumeSessionLaunchContext({
      getFpsMetrics: vi.fn(() => undefined),
      replBase,
      fallbackMainThreadAgentDefinition: { name: 'current-main' },
      resumeData: {
        initialState: { sessionId: 'teleport-session' },
        messages: ['teleport-message'],
      },
    })

    expect(context.replProps.mainThreadAgentDefinition).toEqual({ name: 'current-main' })
    expect(context.replProps.initialMessages).toEqual(['teleport-message'])
  })
})
