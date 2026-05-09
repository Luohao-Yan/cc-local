import { describe, expect, it } from 'vitest'
import { validateMessageSequence } from './validateMessages.js'
import type { Message } from '@cclocal/shared'

describe('validateMessageSequence', () => {
  it('accepts a valid alternating sequence', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'hello' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'assistant',
        content: [{ type: 'text', text: 'hi' }],
        timestamp: 2,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('accepts an empty message list', () => {
    const result = validateMessageSequence([])
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects sequence not starting with user', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: [{ type: 'text', text: 'hi' }],
        timestamp: 1,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('First message'))).toBe(true)
  })

  it('rejects consecutive user messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'hello' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'tu-1', content: 'result' }],
        timestamp: 2,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Consecutive'))).toBe(true)
  })

  it('rejects consecutive assistant messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'hello' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'assistant',
        content: [{ type: 'text', text: 'first' }],
        timestamp: 2,
      },
      {
        id: '3',
        role: 'assistant',
        content: [{ type: 'text', text: 'second' }],
        timestamp: 3,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Consecutive'))).toBe(true)
  })

  it('rejects tool_result in assistant message', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'run tool' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'bash', input: {}, id: 'tu-1' },
          { type: 'tool_result', tool_use_id: 'tu-1', content: 'result' },
        ],
        timestamp: 2,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('tool_result') && e.includes('non-user'))).toBe(true)
  })

  it('rejects tool_use in user message', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'tool_use', name: 'bash', input: {}, id: 'tu-1' }],
        timestamp: 1,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('tool_use') && e.includes('non-assistant'))).toBe(true)
  })

  it('rejects tool_result referencing missing tool_use_id', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'run tool' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'assistant',
        content: [{ type: 'text', text: 'thinking...' }],
        timestamp: 2,
      },
      {
        id: '3',
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'nonexistent', content: 'result' }],
        timestamp: 3,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('unknown tool_use_id'))).toBe(true)
  })

  it('rejects duplicate tool_use IDs', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'run tool' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'bash', input: {}, id: 'tu-1' },
        ],
        timestamp: 2,
      },
      {
        id: '3',
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'tu-1', content: 'result1' }],
        timestamp: 3,
      },
      {
        id: '4',
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'bash', input: {}, id: 'tu-1' },
        ],
        timestamp: 4,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Duplicate tool_use id'))).toBe(true)
  })

  it('reports tool_use without tool_result', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'run tool' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'bash', input: {}, id: 'tu-1' },
        ],
        timestamp: 2,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('no corresponding tool_result'))).toBe(true)
  })

  it('accepts a valid multi-turn tool use sequence', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: [{ type: 'text', text: 'run tool' }],
        timestamp: 1,
      },
      {
        id: '2',
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'bash', input: { command: 'ls' }, id: 'tu-1' },
        ],
        timestamp: 2,
      },
      {
        id: '3',
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'tu-1', content: 'file1.txt\nfile2.txt' }],
        timestamp: 3,
      },
      {
        id: '4',
        role: 'assistant',
        content: [{ type: 'text', text: 'Here are the files.' }],
        timestamp: 4,
      },
    ]
    const result = validateMessageSequence(messages)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
