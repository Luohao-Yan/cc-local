/**
 * Tests for packages-native mode routing
 *
 * These tests verify the routing logic that decides between:
 * 1. Ink UI mode (delegateToInkUi)
 * 2. Packages-native REST API mode (CCLocalClient)
 * 3. Packages-native local engine mode (QueryEngine)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// We test the nativeRouting.ts module, not the mocked modules
// Import at the top but don't mock here - the module will be tested in isolation
import {
  NATIVE_REST_COMMANDS,
  getFirstCommand,
} from './nativeRouting.js'

// For tests that need mocking, we'll use vi.doMock with scoping
// Note: shouldUseNativeMode and getNativeModeType depend on external modules
// so we test those in separate test files with proper isolation

describe('packages-native routing - pure functions', () => {
  describe('NATIVE_REST_COMMANDS', () => {
    it('contains expected REST-backed commands', () => {
      expect(NATIVE_REST_COMMANDS.has('mcp')).toBe(true)
      expect(NATIVE_REST_COMMANDS.has('models')).toBe(true)
      expect(NATIVE_REST_COMMANDS.has('sessions')).toBe(true)
      expect(NATIVE_REST_COMMANDS.has('doctor')).toBe(true)
      expect(NATIVE_REST_COMMANDS.has('context')).toBe(true)
      expect(NATIVE_REST_COMMANDS.has('config')).toBe(true)
    })

    it('does not contain unknown commands', () => {
      expect(NATIVE_REST_COMMANDS.has('unknown')).toBe(false)
      expect(NATIVE_REST_COMMANDS.has('random')).toBe(false)
    })
  })

  describe('getFirstCommand', () => {
    it('returns first non-flag argument', () => {
      expect(getFirstCommand(['mcp', 'list'])).toBe('mcp')
      expect(getFirstCommand(['--flag', 'value', 'command'])).toBe('value')
    })

    it('returns undefined for only flags', () => {
      expect(getFirstCommand(['--flag', '--other'])).toBeUndefined()
    })

    it('returns undefined for empty array', () => {
      expect(getFirstCommand([])).toBeUndefined()
    })

    it('handles single command', () => {
      expect(getFirstCommand(['mcp'])).toBe('mcp')
    })

    it('handles flags with equals', () => {
      expect(getFirstCommand(['--server=http://localhost', 'mcp'])).toBe('mcp')
    })
  })
})
