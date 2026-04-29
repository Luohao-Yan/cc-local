import { describe, expect, it } from 'vitest'
import {
  getFirstCommand,
  shouldUseLegacyUi,
  stripPackageOnlyArgs,
} from './legacyAdapter.js'

describe('legacy UI adapter', () => {
  it('keeps default user-facing paths on the legacy Claude Code UI', () => {
    expect(shouldUseLegacyUi([])).toBe(true)
    expect(shouldUseLegacyUi(['--help'])).toBe(true)
    expect(shouldUseLegacyUi(['--version'])).toBe(true)
    expect(shouldUseLegacyUi(['hello'])).toBe(true)
    expect(shouldUseLegacyUi(['--print', 'say ok'])).toBe(true)
    expect(shouldUseLegacyUi(['--resume', 'session-1'])).toBe(true)
    expect(shouldUseLegacyUi(['--continue'])).toBe(true)
  })

  it('routes packages management commands to the packages CLI layer', () => {
    expect(shouldUseLegacyUi(['models', 'list'])).toBe(false)
    expect(shouldUseLegacyUi(['sessions', 'list'])).toBe(false)
    expect(shouldUseLegacyUi(['--server', 'http://127.0.0.1:5678', '--print', 'say ok'])).toBe(false)
  })

  it('routes legacy compatibility commands to the legacy UI/runtime', () => {
    expect(shouldUseLegacyUi(['agents'])).toBe(true)
    expect(shouldUseLegacyUi(['assistant'])).toBe(true)
    expect(shouldUseLegacyUi(['auth', 'status'])).toBe(true)
    expect(shouldUseLegacyUi(['doctor'])).toBe(true)
    expect(shouldUseLegacyUi(['mcp', 'list'])).toBe(true)
    expect(shouldUseLegacyUi(['plugin', 'list'])).toBe(true)
    expect(shouldUseLegacyUi(['plugins', 'list'])).toBe(true)
    expect(shouldUseLegacyUi(['ssh', 'example.com'])).toBe(true)
    expect(shouldUseLegacyUi(['update'])).toBe(true)
    expect(shouldUseLegacyUi(['upgrade'])).toBe(true)
  })

  it('lets explicit REST transport mode take ownership of legacy command names', () => {
    expect(shouldUseLegacyUi(['--server', 'http://127.0.0.1:5678', 'mcp', 'list'])).toBe(false)
    expect(shouldUseLegacyUi(['--token', 'secret', 'auth', 'status'])).toBe(false)
  })

  it('strips package-only transport flags before delegating to legacy UI', () => {
    expect(stripPackageOnlyArgs([
      '--server',
      'http://127.0.0.1:5678',
      '--token',
      'secret',
      '--server-embedded',
      '--legacy',
      '--print',
      'hello',
    ])).toEqual(['--print', 'hello'])
  })

  it('detects the first command after package-only flags', () => {
    expect(getFirstCommand(['--server', 'http://127.0.0.1:5678', 'models', 'list'])).toBe('models')
    expect(getFirstCommand(['--help'])).toBeUndefined()
  })

  it('does not treat legacy value-flag values as package commands', () => {
    expect(getFirstCommand(['--add-dir', '/tmp/project'])).toBeUndefined()
    expect(getFirstCommand(['--fallback-model', 'claude-fallback', '--print', 'hi'])).toBeUndefined()
    expect(getFirstCommand(['--system-prompt-file', 'prompt.md'])).toBeUndefined()
    expect(getFirstCommand(['--append-system-prompt-file', 'append.md'])).toBeUndefined()
    expect(getFirstCommand(['--max-turns', '3', '--print', 'hi'])).toBeUndefined()
    expect(getFirstCommand(['--max-thinking-tokens', '1024', '--print', 'hi'])).toBeUndefined()
    expect(getFirstCommand(['--agent', 'reviewer'])).toBeUndefined()
    expect(getFirstCommand(['--agents', '{"reviewer":{}}'])).toBeUndefined()
    expect(getFirstCommand(['--plugin-dir', '.claude/plugins'])).toBeUndefined()
    expect(getFirstCommand(['--file', 'file_abc:doc.txt'])).toBeUndefined()
    expect(getFirstCommand(['--workload', 'cron'])).toBeUndefined()
  })

  it('keeps legacy value-flag invocations on the legacy UI', () => {
    expect(shouldUseLegacyUi(['--add-dir', '/tmp/project'])).toBe(true)
    expect(shouldUseLegacyUi(['--fallback-model', 'claude-fallback', '--print', 'hi'])).toBe(true)
    expect(shouldUseLegacyUi(['--system-prompt-file', 'prompt.md'])).toBe(true)
    expect(shouldUseLegacyUi(['--append-system-prompt-file', 'append.md'])).toBe(true)
    expect(shouldUseLegacyUi(['--max-turns', '3', '--print', 'hi'])).toBe(true)
    expect(shouldUseLegacyUi(['--max-thinking-tokens', '1024', '--print', 'hi'])).toBe(true)
    expect(shouldUseLegacyUi(['--agent', 'reviewer'])).toBe(true)
    expect(shouldUseLegacyUi(['--agents', '{"reviewer":{}}'])).toBe(true)
    expect(shouldUseLegacyUi(['--plugin-dir', '.claude/plugins'])).toBe(true)
    expect(shouldUseLegacyUi(['--file', 'file_abc:doc.txt'])).toBe(true)
    expect(shouldUseLegacyUi(['--workload', 'cron'])).toBe(true)
  })
})
