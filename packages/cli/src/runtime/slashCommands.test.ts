/**
 * Tests for Slash Commands
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  NATIVE_SLASH_COMMANDS,
  findCommand,
  isSlashCommand,
  handleSlashCommand,
  type SlashCommandContext,
} from './slashCommands.js'

describe('slashCommands', () => {
  let mockCtx: SlashCommandContext

  beforeEach(() => {
    mockCtx = {
      adapter: {} as any,
      client: {
        getSession: vi.fn().mockResolvedValue({ id: 'test', name: 'Test' }),
        getSessionMessages: vi.fn().mockResolvedValue([]),
        updateSession: vi.fn().mockResolvedValue({}),
        forkSession: vi.fn().mockResolvedValue({ id: 'forked' }),
      } as any,
      sessionId: 'test-session',
      cwd: '/test',
      messages: [],
    }
  })

  describe('isSlashCommand', () => {
    it('returns true for slash commands', () => {
      expect(isSlashCommand('/help')).toBe(true)
      expect(isSlashCommand('/clear')).toBe(true)
      expect(isSlashCommand('/exit')).toBe(true)
    })

    it('returns false for regular messages', () => {
      expect(isSlashCommand('hello')).toBe(false)
      expect(isSlashCommand('What is 2+2?')).toBe(false)
    })
  })

  describe('findCommand', () => {
    it('finds command by name', () => {
      expect(findCommand('/help')?.name).toBe('help')
      expect(findCommand('/clear')?.name).toBe('clear')
      expect(findCommand('/exit')?.name).toBe('exit')
    })

    it('finds command by alias', () => {
      expect(findCommand('/?')?.name).toBe('help')
      expect(findCommand('/quit')?.name).toBe('exit')
    })

    it('returns undefined for unknown command', () => {
      expect(findCommand('/unknown')).toBeUndefined()
    })
  })

  describe('NATIVE_SLASH_COMMANDS', () => {
    it('contains expected commands', () => {
      const names = NATIVE_SLASH_COMMANDS.map((c) => c.name)
      expect(names).toContain('help')
      expect(names).toContain('clear')
      expect(names).toContain('rename')
      expect(names).toContain('resume')
      expect(names).toContain('branch')
      expect(names).toContain('model')
      expect(names).toContain('cwd')
      expect(names).toContain('exit')
    })

    it('all commands have required properties', () => {
      for (const cmd of NATIVE_SLASH_COMMANDS) {
        expect(cmd.name).toBeDefined()
        expect(cmd.description).toBeDefined()
        expect(cmd.action).toBeTypeOf('function')
      }
    })
  })

  describe('handleSlashCommand', () => {
    it('returns false for non-slash input', async () => {
      const result = await handleSlashCommand('hello', mockCtx)
      expect(result).toBe(false)
    })

    it('returns true for valid slash command', async () => {
      const result = await handleSlashCommand('/help', mockCtx)
      expect(result).toBe(true)
    })

    it('returns true for unknown slash command', async () => {
      const result = await handleSlashCommand('/unknown', mockCtx)
      expect(result).toBe(true)
    })

    it('clears messages on /clear', async () => {
      mockCtx!.messages!.push({ role: 'user', content: 'test' })
      await handleSlashCommand('/clear', mockCtx)
      expect(mockCtx!.messages!.length).toBe(0)
    })

    it('calls updateSession on /rename', async () => {
      await handleSlashCommand('/rename new name', mockCtx)
      expect(mockCtx.client!.updateSession).toHaveBeenCalledWith(
        'test-session',
        { name: 'new name' }
      )
    })
  })
})
