/**
 * Tests for CommandRegistry in @cclocal/core
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { CommandRegistry, commandRegistry, type Command, type LocalCommand, type PromptCommand } from '@cclocal/core'

describe('CommandRegistry', () => {
  let registry: CommandRegistry

  beforeEach(() => {
    registry = new CommandRegistry()
  })

  describe('register / get', () => {
    it('registers and retrieves a local command', () => {
      const cmd: LocalCommand = {
        type: 'local',
        name: 'greet',
        description: 'Say hello',
        async execute(args) { return { text: `Hello, ${args}!` } },
      }
      registry.register(cmd)
      expect(registry.get('greet')).toBe(cmd)
    })

    it('registers and retrieves a prompt command', () => {
      const cmd: PromptCommand = {
        type: 'prompt',
        name: 'summarize',
        description: 'Summarize context',
        async getPrompt(_args) {
          return { content: [{ type: 'text', text: 'Summarize the conversation.' }] }
        },
      }
      registry.register(cmd)
      expect(registry.get('summarize')).toBe(cmd)
    })

    it('registers aliases that map to the same command', () => {
      const cmd: LocalCommand = {
        type: 'local',
        name: 'clear',
        aliases: ['reset', 'new'],
        description: 'Clear session',
        async execute() { return {} },
      }
      registry.register(cmd)
      expect(registry.get('clear')).toBe(cmd)
      expect(registry.get('reset')).toBe(cmd)
      expect(registry.get('new')).toBe(cmd)
    })

    it('throws on duplicate registration', () => {
      const cmd: LocalCommand = {
        type: 'local',
        name: 'dup',
        description: 'Duplicate',
        async execute() { return {} },
      }
      registry.register(cmd)
      expect(() => registry.register(cmd)).toThrow('already registered')
    })
  })

  describe('unregister', () => {
    it('removes a command and its aliases', () => {
      const cmd: LocalCommand = {
        type: 'local',
        name: 'test',
        aliases: ['t'],
        description: 'Test',
        async execute() { return {} },
      }
      registry.register(cmd)
      registry.unregister('test')
      expect(registry.get('test')).toBeUndefined()
      expect(registry.get('t')).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('returns unique commands (no duplicates from aliases)', () => {
      registry.register({
        type: 'local',
        name: 'a',
        aliases: ['alias-a'],
        description: 'A',
        async execute() { return {} },
      })
      registry.register({
        type: 'local',
        name: 'b',
        description: 'B',
        async execute() { return {} },
      })
      const all = registry.getAll()
      expect(all).toHaveLength(2)
      expect(all.map((c) => c.name).sort()).toEqual(['a', 'b'])
    })
  })

  describe('registerDefaults', () => {
    it('registers built-in commands', () => {
      registry.registerDefaults()
      expect(registry.get('help')).toBeDefined()
      expect(registry.get('clear')).toBeDefined()
      expect(registry.get('exit')).toBeDefined()
      expect(registry.get('model')).toBeDefined()
      expect(registry.get('permissions')).toBeDefined()
      expect(registry.get('tools')).toBeDefined()
      expect(registry.get('compact')).toBeDefined()
      expect(registry.get('doctor')).toBeDefined()
    })

    it('help alias "?" works', () => {
      registry.registerDefaults()
      expect(registry.get('?')).toBeDefined()
    })

    it('clear aliases "reset" and "new" work', () => {
      registry.registerDefaults()
      expect(registry.get('reset')).toBeDefined()
      expect(registry.get('new')).toBeDefined()
    })
  })

  describe('has', () => {
    it('returns true for registered commands', () => {
      registry.register({
        type: 'local',
        name: 'exists',
        description: 'Exists',
        async execute() { return {} },
      })
      expect(registry.has('exists')).toBe(true)
      expect(registry.has('nope')).toBe(false)
    })
  })

  describe('singleton', () => {
    it('exports a usable singleton', () => {
      expect(commandRegistry).toBeDefined()
      expect(commandRegistry).toBeInstanceOf(CommandRegistry)
    })
  })
})