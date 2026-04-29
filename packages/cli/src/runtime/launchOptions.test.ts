import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, expect, it } from 'vitest'
import { buildEffectiveRootOptions, loadSettingsFromOptions } from './launchOptions.js'

describe('launch options', () => {
  it('builds effective root options from raw args, settings, and commander options', () => {
    const effective = buildEffectiveRootOptions(
      {
        settings: ['{"model":"from-settings","workspace":"/settings","name":"settings-name","fallbackModel":"fallback"}'],
        cwd: '/default',
        text: 'text prompt',
      },
      [
        '--cwd',
        '/raw',
        '--print',
        'raw prompt',
        '--session-id',
        'session-1',
        '--max-turns',
        '3',
        '--max-thinking-tokens=100',
      ]
    )

    expect(effective.model).toBe('from-settings')
    expect(effective.cwd).toBe('/raw')
    expect(effective.print).toBe('text prompt')
    expect(effective.sessionId).toBe('session-1')
    expect(effective.name).toBe('settings-name')
    expect(effective.maxTurns).toBe(3)
    expect(effective.maxThinkingTokens).toBe(100)
    expect(effective.fallbackModel).toBe('fallback')
  })

  it('lets explicit commander options override settings', () => {
    const effective = buildEffectiveRootOptions(
      {
        settings: ['{"model":"from-settings","authToken":"settings-token","systemPrompt":"settings-prompt"}'],
        model: 'explicit-model',
        authToken: 'explicit-token',
        systemPrompt: 'explicit-prompt',
      },
      []
    )

    expect(effective.model).toBe('explicit-model')
    expect(effective.authToken).toBe('explicit-token')
    expect(effective.systemPrompt).toBe('explicit-prompt')
  })

  it('loads settings from files and JSON strings in order', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cclocal-launch-options-'))
    const file = join(dir, 'settings.json')
    writeFileSync(file, '{"model":"file-model","workspace":"/file"}')

    try {
      expect(loadSettingsFromOptions({
        settings: [file, '{"workspace":"/inline","name":"inline"}'],
      })).toEqual({
        model: 'file-model',
        workspace: '/inline',
        name: 'inline',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
