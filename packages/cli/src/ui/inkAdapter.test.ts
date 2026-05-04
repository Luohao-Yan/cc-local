import { describe, expect, it } from 'vitest'
import {
  getFirstCommand,
  shouldUseInkUi,
  stripPackageOnlyArgs,
} from './inkAdapter.js'

describe('Ink UI adapter', () => {
  it('keeps default user-facing paths on the Ink UI', () => {
    expect(shouldUseInkUi([])).toBe(true)
    expect(shouldUseInkUi(['--help'])).toBe(true)
    expect(shouldUseInkUi(['--version'])).toBe(true)
    expect(shouldUseInkUi(['hello'])).toBe(true)
    expect(shouldUseInkUi(['--print', 'say ok'])).toBe(true)
    expect(shouldUseInkUi(['--resume', 'session-1'])).toBe(true)
    expect(shouldUseInkUi(['--continue'])).toBe(true)
  })

  it('routes packages management commands to the packages CLI layer', () => {
    expect(shouldUseInkUi(['models', 'list'])).toBe(false)
    expect(shouldUseInkUi(['sessions', 'list'])).toBe(false)
    expect(shouldUseInkUi(['--server', 'http://127.0.0.1:5678', '--print', 'say ok'])).toBe(false)
  })

  it('routes Ink compatibility commands to the Ink UI/runtime', () => {
    expect(shouldUseInkUi(['agents'])).toBe(true)
    expect(shouldUseInkUi(['assistant'])).toBe(true)
    expect(shouldUseInkUi(['auth', 'status'])).toBe(true)
    expect(shouldUseInkUi(['doctor'])).toBe(true)
    expect(shouldUseInkUi(['mcp', 'list'])).toBe(true)
    expect(shouldUseInkUi(['plugin', 'list'])).toBe(true)
    expect(shouldUseInkUi(['plugins', 'list'])).toBe(true)
    expect(shouldUseInkUi(['ssh', 'example.com'])).toBe(true)
    expect(shouldUseInkUi(['update'])).toBe(true)
    expect(shouldUseInkUi(['upgrade'])).toBe(true)
  })

  it('lets explicit REST transport mode take ownership of Ink command names', () => {
    expect(shouldUseInkUi(['--server', 'http://127.0.0.1:5678', 'mcp', 'list'])).toBe(false)
    expect(shouldUseInkUi(['--token', 'secret', 'auth', 'status'])).toBe(false)
  })

  it('strips package-only transport flags before delegating to Ink UI', () => {
    expect(stripPackageOnlyArgs([
      '--server',
      'http://127.0.0.1:5678',
      '--token',
      'secret',
      '--server-embedded',
      '--ink',
      '--legacy',
      '--print',
      'hello',
    ])).toEqual(['--print', 'hello'])
  })

  it('detects the first command after package-only flags', () => {
    expect(getFirstCommand(['--server', 'http://127.0.0.1:5678', 'models', 'list'])).toBe('models')
    expect(getFirstCommand(['--help'])).toBeUndefined()
  })

  it('does not treat Ink value-flag values as package commands', () => {
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

  it('keeps Ink value-flag invocations on the Ink UI', () => {
    expect(shouldUseInkUi(['--add-dir', '/tmp/project'])).toBe(true)
    expect(shouldUseInkUi(['--fallback-model', 'claude-fallback', '--print', 'hi'])).toBe(true)
    expect(shouldUseInkUi(['--system-prompt-file', 'prompt.md'])).toBe(true)
    expect(shouldUseInkUi(['--append-system-prompt-file', 'append.md'])).toBe(true)
    expect(shouldUseInkUi(['--max-turns', '3', '--print', 'hi'])).toBe(true)
    expect(shouldUseInkUi(['--max-thinking-tokens', '1024', '--print', 'hi'])).toBe(true)
    expect(shouldUseInkUi(['--agent', 'reviewer'])).toBe(true)
    expect(shouldUseInkUi(['--agents', '{"reviewer":{}}'])).toBe(true)
    expect(shouldUseInkUi(['--plugin-dir', '.claude/plugins'])).toBe(true)
    expect(shouldUseInkUi(['--file', 'file_abc:doc.txt'])).toBe(true)
    expect(shouldUseInkUi(['--workload', 'cron'])).toBe(true)
  })
})
