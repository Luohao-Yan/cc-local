import { Command } from 'commander'
import { describe, expect, it } from 'vitest'
import {
  commandUsesRestApi,
  getRawUserOptionValue,
  hasExplicitServerArg,
  shouldAutoStartEmbeddedServer,
} from './routeContext.js'

describe('route context', () => {
  it('reads raw option values without commander coercion', () => {
    expect(getRawUserOptionValue(['--print', 'hello'], '--print')).toBe('hello')
    expect(getRawUserOptionValue(['--print=hello'], '--print')).toBe('hello')
    expect(getRawUserOptionValue(['--print', '--json'], '--print')).toBeUndefined()
  })

  it('detects explicit server routing', () => {
    expect(hasExplicitServerArg(['--server', 'http://127.0.0.1:5678'])).toBe(true)
    expect(hasExplicitServerArg(['--server=http://127.0.0.1:5678'])).toBe(true)
    expect(hasExplicitServerArg(['models', 'list'])).toBe(false)
  })

  it('auto-starts embedded server only for local packages routes', () => {
    expect(shouldAutoStartEmbeddedServer(['models', 'list'])).toBe(true)
    expect(shouldAutoStartEmbeddedServer(['--server', 'http://127.0.0.1:5678', 'models', 'list'])).toBe(false)
    expect(shouldAutoStartEmbeddedServer(['--legacy', '--help'])).toBe(false)
  })

  it('detects REST-backed command trees', () => {
    const root = new Command('cclocal')
    const models = root.command('models')
    const list = models.command('list')
    const model = root.command('model')
    const current = model.command('current')
    const use = model.command('use')
    const auth = root.command('auth')
    const status = auth.command('status')

    expect(commandUsesRestApi(list)).toBe(true)
    expect(commandUsesRestApi(use)).toBe(true)
    expect(commandUsesRestApi(current)).toBe(false)
    expect(commandUsesRestApi(status)).toBe(false)
  })
})
