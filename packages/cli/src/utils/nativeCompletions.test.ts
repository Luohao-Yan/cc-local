/**
 * Tests for Native Completions
 */

import { describe, expect, it } from 'vitest'
import { getNativeCommandCompletions, getModelCompletions, NATIVE_REST_COMMANDS, NATIVE_SLASH_COMMANDS } from './nativeCompletions.js'

describe('nativeCompletions', () => {
  describe('getNativeCommandCompletions', () => {
    it('returns all commands for empty input', () => {
      const result = getNativeCommandCompletions('')
      expect(result.completions.length).toBeGreaterThan(0)
      expect(result.type).toBe('command')
    })

    it('returns matching commands for partial input', () => {
      const result = getNativeCommandCompletions('mc')
      expect(result.completions).toContain('mcp')
      expect(result.type).toBe('command')
    })

    it('returns subcommands for known commands', () => {
      const result = getNativeCommandCompletions('mcp li')
      expect(result.completions).toContain('list')
      expect(result.type).toBe('subcommand')
    })

    it('returns slash commands for / input', () => {
      const result = getNativeCommandCompletions('/he')
      expect(result.completions).toContain('/help')
      expect(result.type).toBe('command')
    })

    it('returns all slash commands for /', () => {
      const result = getNativeCommandCompletions('/')
      expect(result.completions).toContain('/help')
      expect(result.completions).toContain('/exit')
    })

    it('returns empty for no match', () => {
      const result = getNativeCommandCompletions('xyzabc')
      expect(result.completions).toEqual([])
      expect(result.type).toBe('none')
    })
  })

  describe('getModelCompletions', () => {
    it('returns matching models', () => {
      const result = getModelCompletions('claude-3')
      expect(result.completions.length).toBeGreaterThan(0)
      expect(result.completions.every(m => m.startsWith('claude-3'))).toBe(true)
    })

    it('returns default model', () => {
      const result = getModelCompletions('def')
      expect(result.completions).toContain('default')
    })
  })

  describe('constants', () => {
    it('NATIVE_REST_COMMANDS contains expected commands', () => {
      expect(NATIVE_REST_COMMANDS).toContain('mcp')
      expect(NATIVE_REST_COMMANDS).toContain('sessions')
      expect(NATIVE_REST_COMMANDS).toContain('doctor')
    })

    it('NATIVE_SLASH_COMMANDS contains expected commands', () => {
      expect(NATIVE_SLASH_COMMANDS).toContain('/help')
      expect(NATIVE_SLASH_COMMANDS).toContain('/exit')
    })
  })
})
