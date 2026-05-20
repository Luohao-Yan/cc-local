/**
 * 条件工具 — 需要特定运行环境才可使用
 *
 * These tools are now implemented in dedicated files:
 * - enterWorktreeTool / exitWorktreeTool — worktree operations (still stub for native mode)
 * - lspTool — LSP client integration (see lspTool.ts)
 * - powerShellTool — Windows PowerShell (see powerShellTool.ts)
 *
 * This file re-exports them and provides the conditional registration logic.
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { lspTool } from './lspTool.js'
import { powerShellTool } from './powerShellTool.js'

// ---- Worktree Tools (still stubs — full git worktree integration requires deeper engine changes) ----

/** Check if worktree mode is available */
function isWorktreeModeEnabled(): boolean {
  return true // always register the tools, even if they stub
}

function stubExecute(name: string): (input: unknown, context: ToolContext) => Promise<ToolResult> {
  return async () => ({
    content: `${name} is not available in packages-native mode. Use the legacy bridge path (cclocal-next, default) for full functionality.`,
    is_error: true,
  })
}

export const enterWorktreeTool: Tool = {
  name: 'enter_worktree',
  description:
    'Enter a git worktree for isolated development. Creates a new worktree and switches the session cwd.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description:
          'Optional name for the worktree. A random name is generated if not provided.',
      },
    },
  },
  execute: stubExecute('EnterWorktreeTool'),
}

export const exitWorktreeTool: Tool = {
  name: 'exit_worktree',
  description:
    'Exit the current git worktree. Can keep or remove the worktree branch and directory.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['keep', 'remove'],
        description: '"keep" leaves the worktree; "remove" deletes it.',
      },
      discard_changes: {
        type: 'boolean',
        description: 'Set true when action is "remove" and there are uncommitted changes.',
      },
    },
    required: ['action'],
  },
  execute: stubExecute('ExitWorktreeTool'),
}

// Re-export the real implementations
export { lspTool, powerShellTool }

/** Check if LSP tool should be enabled */
function isLspToolEnabled(): boolean {
  // LSP tool is always available now (no feature flag needed)
  return true
}

/** Check if PowerShell tool should be enabled */
function isPowerShellToolEnabled(): boolean {
  if (process.platform !== 'win32') return false
  return true // always enabled on Windows now
}

/** 返回满足当前运行条件的条件工具列表 */
export function getConditionalTools(): Tool[] {
  const tools: Tool[] = []

  if (isWorktreeModeEnabled()) {
    tools.push(enterWorktreeTool, exitWorktreeTool)
  }

  if (isLspToolEnabled()) {
    tools.push(lspTool)
  }

  if (isPowerShellToolEnabled()) {
    tools.push(powerShellTool)
  }

  return tools
}
