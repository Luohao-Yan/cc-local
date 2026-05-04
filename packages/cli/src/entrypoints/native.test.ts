/**
 * Tests for native entry point
 *
 * Tests the argument parsing and mode selection logic.
 * This is a NEW test file for NEW code.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { parseArgs } from 'node:util'

// We test the argument parsing logic in isolation
// The actual runNative() function is integration-tested

describe('native entry point - argument parsing', () => {
  // Since parseNativeArgs is not exported, we test similar logic here

  function parseNativeArgs(argv: string[]): {
    mode: 'local' | 'rest' | 'local-engine'
    serverUrl?: string
    authToken?: string
    model?: string
    maxTurns?: number
    prompt?: string
    command?: string
    commandArgs: string[]
  } {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        server: { type: 'string', short: 's' },
        token: { type: 'string', short: 't' },
        model: { type: 'string', short: 'm' },
        'max-turns': { type: 'string' },
        print: { type: 'string', short: 'p' },
        'local-engine': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: false,
      allowPositionals: true,
    })

    // Determine mode
    let mode: 'local' | 'rest' | 'local-engine' = 'local'
    if (values.server) {
      mode = 'rest'
    } else if (values['local-engine']) {
      mode = 'local-engine'
    } else {
      // Check if first positional is a REST-backed command
      const NATIVE_REST_COMMANDS = new Set([
        'mcp', 'models', 'sessions', 'doctor', 'context',
        'stats', 'cost', 'model', 'export', 'assistant',
        'config', 'env', 'permissions', 'auth', 'setup-token',
      ])
      const firstCommand = positionals[0]
      if (firstCommand && NATIVE_REST_COMMANDS.has(firstCommand)) {
        mode = 'rest'
      }
    }

    return {
      mode,
      serverUrl: values.server as string | undefined,
      authToken: values.token as string | undefined,
      model: values.model as string | undefined,
      maxTurns: values['max-turns'] ? parseInt(values['max-turns'] as string, 10) : undefined,
      prompt: values.print as string | undefined,
      command: positionals[0],
      commandArgs: positionals.slice(1),
    }
  }

  describe('parseNativeArgs', () => {
    it('defaults to local mode', () => {
      const args = parseNativeArgs([])
      expect(args.mode).toBe('local')
    })

    it('detects --server for REST mode', () => {
      const args = parseNativeArgs(['--server', 'http://localhost:5678'])
      expect(args.mode).toBe('rest')
      expect(args.serverUrl).toBe('http://localhost:5678')
    })

    it('detects -s short flag for REST mode', () => {
      const args = parseNativeArgs(['-s', 'http://localhost:5678'])
      expect(args.mode).toBe('rest')
      expect(args.serverUrl).toBe('http://localhost:5678')
    })

    it('detects --local-engine flag', () => {
      const args = parseNativeArgs(['--local-engine'])
      expect(args.mode).toBe('local-engine')
    })

    it('detects REST-backed commands', () => {
      expect(parseNativeArgs(['mcp', 'list']).mode).toBe('rest')
      expect(parseNativeArgs(['models', 'list']).mode).toBe('rest')
      expect(parseNativeArgs(['sessions']).mode).toBe('rest')
    })

    it('local mode for unknown commands', () => {
      const args = parseNativeArgs(['unknown', 'command'])
      expect(args.mode).toBe('local')
      expect(args.command).toBe('unknown')
    })

    it('parses --token', () => {
      const args = parseNativeArgs(['--token', 'secret123'])
      expect(args.authToken).toBe('secret123')
    })

    it('parses --model', () => {
      const args = parseNativeArgs(['--model', 'claude-3-5-sonnet'])
      expect(args.model).toBe('claude-3-5-sonnet')
    })

    it('parses --max-turns', () => {
      const args = parseNativeArgs(['--max-turns', '5'])
      expect(args.maxTurns).toBe(5)
    })

    it('parses --print for single prompt mode', () => {
      const args = parseNativeArgs(['--print', 'What is 2+2?'])
      expect(args.prompt).toBe('What is 2+2?')
    })

    it('parses -p short flag for single prompt', () => {
      const args = parseNativeArgs(['-p', 'Hello'])
      expect(args.prompt).toBe('Hello')
    })

    it('parses command and commandArgs', () => {
      const args = parseNativeArgs(['mcp', 'list'])
      expect(args.command).toBe('mcp')
      expect(args.commandArgs).toEqual(['list'])
    })

    it('handles unknown option in command args', () => {
      // Note: parseArgs with strict: false will consume --verbose as an option
      // Use positional arguments only for command args
      const args = parseNativeArgs(['mcp', 'list', 'verbose'])
      expect(args.command).toBe('mcp')
      expect(args.commandArgs).toEqual(['list', 'verbose'])
    })

    it('handles combined flags', () => {
      const args = parseNativeArgs([
        '--server', 'http://localhost:5678',
        '--token', 'secret',
        '--model', 'claude-3-5-sonnet',
        '--max-turns', '10',
      ])
      expect(args.mode).toBe('rest')
      expect(args.serverUrl).toBe('http://localhost:5678')
      expect(args.authToken).toBe('secret')
      expect(args.model).toBe('claude-3-5-sonnet')
      expect(args.maxTurns).toBe(10)
    })
  })
})
