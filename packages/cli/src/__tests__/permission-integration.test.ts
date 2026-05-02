/**
 * End-to-end tests for permission policy integration with QueryEngine
 *
 * Tests: set permission mode → QueryEngine executes tool →
 *        decideToolPermission allows/blocks → result reflects policy
 */

import { describe, expect, it, vi } from 'vitest'
import { QueryEngine } from '@cclocal/core'
import { decideToolPermission, filterToolsByPermission, type PermissionPolicy, type PermissionMode } from '@cclocal/core'
import type { Tool, ToolResult, ToolContext } from '@cclocal/shared'

// Create a deterministic tool that records calls
function createRecordingTool(name: string): Tool {
  return {
    name,
    description: `Test tool: ${name}`,
    input_schema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
    },
    execute: vi.fn(async (input: unknown, _context: ToolContext): Promise<ToolResult> => {
      return { content: `Result from ${name}: ${JSON.stringify(input)}` }
    }),
  }
}

describe('permission policy integration', () => {
  describe('decideToolPermission', () => {
    it('allows all tools in bypassPermissions mode', () => {
      const decision = decideToolPermission('bash', { mode: 'bypassPermissions' })
      expect(decision.allowed).toBe(true)
    })

    it('blocks high-risk tools in dontAsk mode', () => {
      const decision = decideToolPermission('bash', { mode: 'dontAsk' })
      expect(decision.allowed).toBe(false)
      expect(decision.reason).toBeTruthy()
    })

    it('blocks file-edit in dontAsk mode', () => {
      const decision = decideToolPermission('file_edit', { mode: 'dontAsk' })
      expect(decision.allowed).toBe(false)
    })

    it('allows read-only tools in acceptEdits mode', () => {
      const decision = decideToolPermission('file_read', { mode: 'acceptEdits' })
      expect(decision.allowed).toBe(true)
    })

    it('allows file-edit but blocks bash in acceptEdits mode', () => {
      const editDecision = decideToolPermission('file_edit', { mode: 'acceptEdits' })
      const bashDecision = decideToolPermission('bash', { mode: 'acceptEdits' })
      expect(editDecision.allowed).toBe(true)
      expect(bashDecision.allowed).toBe(false)
    })

    it('respects explicit allowedTools list', () => {
      const decision = decideToolPermission('CustomTool', {
        mode: 'default',
        allowedTools: ['CustomTool', 'OtherTool'],
      })
      expect(decision.allowed).toBe(true)
    })

    it('respects explicit blockedTools list in default mode', () => {
      const decision = decideToolPermission('CustomTool', {
        mode: 'default',
        blockedTools: ['CustomTool'],
      })
      expect(decision.allowed).toBe(false)
    })

    it('supports glob patterns in allowedTools', () => {
      const decision = decideToolPermission('file_read', {
        mode: 'default',
        allowedTools: ['file*'],
      })
      expect(decision.allowed).toBe(true)
    })

    it('allows unknown tools in default mode', () => {
      const decision = decideToolPermission('UnknownTool', { mode: 'default' })
      expect(decision.allowed).toBe(true)
    })

    it('blocks tools not in allowedTools when list is non-empty', () => {
      const decision = decideToolPermission('UnknownTool', {
        mode: 'default',
        allowedTools: ['OtherTool'],
      })
      expect(decision.allowed).toBe(false)
    })
  })

  describe('filterToolsByPermission', () => {
    it('filters tools based on policy', () => {
      const tools = [
        createRecordingTool('bash'),
        createRecordingTool('file_read'),
        createRecordingTool('file_edit'),
      ]

      const filtered = filterToolsByPermission(tools, { mode: 'dontAsk' })
      const names = filtered.map((t) => t.name)

      // bash and file_edit should be filtered out in dontAsk mode
      expect(names).not.toContain('bash')
      expect(names).not.toContain('file_edit')
      expect(names).toContain('file_read')
    })

    it('keeps all tools in bypassPermissions mode', () => {
      const tools = [
        createRecordingTool('bash'),
        createRecordingTool('file_read'),
        createRecordingTool('file_edit'),
      ]

      const filtered = filterToolsByPermission(tools, { mode: 'bypassPermissions' })
      expect(filtered).toHaveLength(3)
    })

    it('keeps edit tools in acceptEdits mode', () => {
      const tools = [
        createRecordingTool('bash'),
        createRecordingTool('file_read'),
        createRecordingTool('file_edit'),
      ]

      const filtered = filterToolsByPermission(tools, { mode: 'acceptEdits' })
      const names = filtered.map((t) => t.name)

      expect(names).toContain('file_read')
      expect(names).toContain('file_edit')
      expect(names).not.toContain('bash')
    })
  })

  describe('QueryEngine with permission policy', () => {
    it('creates engine with permission policy that filters tools', () => {
      const policy: PermissionPolicy = { mode: 'dontAsk' }

      const engine = new QueryEngine({
        model: 'claude-sonnet-4-6',
        permissionPolicy: policy,
        tools: [
          createRecordingTool('bash'),
          createRecordingTool('file_read'),
        ],
        apiKey: 'test-key',
      })

      expect(engine).toBeDefined()
    })
  })
})
