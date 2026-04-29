import { describe, expect, it, vi } from 'vitest'
import {
  buildLegacyAppShellProps,
  buildLegacyLaunchContext,
  buildLegacyReplProps,
} from './launchContextBuilder.js'

describe('legacy launch context builder', () => {
  it('builds the App shell props contract expected by src/replLauncher.tsx', () => {
    const getFpsMetrics = vi.fn(() => ({ fps: 60 }))
    const stats = { turns: 3 }
    const initialState = { cwd: '/tmp/project' }

    const appProps = buildLegacyAppShellProps({
      getFpsMetrics,
      stats,
      initialState,
    })

    expect(appProps).toEqual({
      getFpsMetrics,
      stats,
      initialState,
    })
  })

  it('merges shared session config with resume-specific overrides', () => {
    const replProps = buildLegacyReplProps(
      {
        debug: true,
        commands: ['help', 'model'],
        initialTools: ['bash'],
        mcpClients: ['filesystem'],
        autoConnectIdeFlag: true,
        mainThreadAgentDefinition: { name: 'main' },
        disableSlashCommands: false,
        dynamicMcpConfig: { local: {} },
        strictMcpConfig: true,
        systemPrompt: 'system',
        appendSystemPrompt: 'appendix',
        taskListId: 'tasks-1',
        thinkingConfig: { type: 'adaptive' },
      },
      {
        initialMessages: ['restored-1', 'restored-2'],
        initialFileHistorySnapshots: ['snapshot-1'],
        initialContentReplacements: ['replacement-1'],
        initialAgentName: 'teammate',
        initialAgentColor: 'blue',
      },
    )

    expect(replProps.debug).toBe(true)
    expect(replProps.commands).toEqual(['help', 'model'])
    expect(replProps.initialMessages).toEqual(['restored-1', 'restored-2'])
    expect(replProps.initialFileHistorySnapshots).toEqual(['snapshot-1'])
    expect(replProps.initialContentReplacements).toEqual(['replacement-1'])
    expect(replProps.initialAgentName).toBe('teammate')
    expect(replProps.initialAgentColor).toBe('blue')
  })

  it('builds a full launch context for remote or direct-connect branches without mutating base config', () => {
    const getFpsMetrics = vi.fn(() => undefined)
    const replBase = {
      debug: false,
      commands: ['remote-help'],
      initialTools: [],
      mcpClients: [],
      autoConnectIdeFlag: false,
      mainThreadAgentDefinition: { name: 'remote-main' },
      disableSlashCommands: true,
      thinkingConfig: { type: 'disabled' },
    }

    const context = buildLegacyLaunchContext({
      getFpsMetrics,
      initialState: { remoteSessionUrl: 'https://remote.example' },
      replBase,
      replOverrides: {
        initialMessages: ['connected'],
        remoteSessionConfig: { id: 'remote-1' },
        directConnectConfig: { sessionId: 'dc-1' },
      },
    })

    expect(context.appProps.initialState).toEqual({
      remoteSessionUrl: 'https://remote.example',
    })
    expect(context.replProps.initialMessages).toEqual(['connected'])
    expect(context.replProps.remoteSessionConfig).toEqual({ id: 'remote-1' })
    expect(context.replProps.directConnectConfig).toEqual({ sessionId: 'dc-1' })
    expect(replBase).toEqual({
      debug: false,
      commands: ['remote-help'],
      initialTools: [],
      mcpClients: [],
      autoConnectIdeFlag: false,
      mainThreadAgentDefinition: { name: 'remote-main' },
      disableSlashCommands: true,
      thinkingConfig: { type: 'disabled' },
    })
  })
})
