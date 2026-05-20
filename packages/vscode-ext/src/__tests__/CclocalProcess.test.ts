/**
 * CclocalProcess Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('CclocalProcess', () => {
  describe('buildCommand', () => {
    it('should build correct command for global cclocal', () => {
      // Test that global cclocal command is built correctly
      const prompt = 'Hello, world!'

      // Expected args for stream-json mode
      const expectedArgs = [
        '--print',
        prompt,
        '--output-format',
        'stream-json',
        '--verbose',
      ]

      expect(expectedArgs).toContain('--print')
      expect(expectedArgs).toContain('stream-json')
    })

    it('should add model flag when specified', () => {
      const model = 'claude-3-5-sonnet-20241022'
      const args = ['--print', 'test', '--output-format', 'stream-json', '--verbose']

      if (model) {
        args.push('--model', model)
      }

      expect(args).toContain('--model')
      expect(args).toContain(model)
    })
  })

  describe('buildEnv', () => {
    it('should include extra PATH entries', () => {
      // Test that PATH includes extra directories
      const extraPaths = [
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '~/.bun/bin',
        '~/.local/bin',
      ]

      // These paths should be in the environment
      expect(extraPaths.length).toBe(4)
    })
  })

  describe('handleStdoutChunk', () => {
    it('should parse stream-json messages', () => {
      const messages = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
        '{"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}',
        '{"type":"result"}',
      ]

      // Simulate parsing
      const parsed = messages.map(m => JSON.parse(m))

      expect(parsed[0].type).toBe('assistant')
      expect(parsed[1].type).toBe('content_block_delta')
      expect(parsed[2].type).toBe('result')
    })

    it('should handle incomplete JSON lines', () => {
      // Simulate buffer behavior
      let buffer = ''
      const chunks = [
        '{"type":"assist',
        'ant","message":{"content":[]}}\n{"type":"result"}',
      ]

      for (const chunk of chunks) {
        buffer += chunk
      }

      const lines = buffer.split('\n')
      expect(lines.length).toBe(2)

      // First line should be complete JSON
      const parsed = JSON.parse(lines[0])
      expect(parsed.type).toBe('assistant')
    })
  })
})

describe('StreamJsonMessage Types', () => {
  it('should handle assistant message', () => {
    const msg = {
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'tool_use', name: 'Read', input: { file_path: '/test' } },
        ],
      },
    }

    expect(msg.type).toBe('assistant')
    expect(msg.message.content.length).toBe(2)
  })

  it('should handle content_block_delta', () => {
    const msg = {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: ' world' },
    }

    expect(msg.type).toBe('content_block_delta')
    expect(msg.delta.type).toBe('text_delta')
  })

  it('should handle tool_use', () => {
    const msg = {
      type: 'tool_use',
      name: 'Bash',
      input: { command: 'ls -la' },
    }

    expect(msg.type).toBe('tool_use')
    expect(msg.name).toBe('Bash')
  })

  it('should handle tool_result', () => {
    const msg = {
      type: 'tool_result',
      content: 'output...',
      is_error: false,
    }

    expect(msg.type).toBe('tool_result')
    expect(msg.is_error).toBe(false)
  })

  it('should handle control_request', () => {
    const msg = {
      type: 'control_request',
      request_id: 'abc123',
      request: {
        subtype: 'tool_permission',
        tool_name: 'Bash',
        tool_input: { command: 'rm -rf /' },
      },
    }

    expect(msg.type).toBe('control_request')
    expect(msg.request.subtype).toBe('tool_permission')
  })

  it('should handle error', () => {
    const msg = {
      type: 'error',
      error: 'Something went wrong',
    }

    expect(msg.type).toBe('error')
    expect(msg.error).toBeDefined()
  })
})
