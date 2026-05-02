/**
 * 条件工具 — 需要特定运行环境才可使用
 *
 * 这些 stub 在核心注册表中占位，与旧版 tools.ts 的条件逻辑对齐。
 * 桥接路径下由旧版 UI 提供真实实现；原生路径下返回不可用提示。
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

/** 旧版条件判断逻辑移植 */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalized = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

function isWorktreeModeEnabled(): boolean {
  return true
}

function isLspToolEnabled(): boolean {
  return isEnvTruthy(process.env.ENABLE_LSP_TOOL)
}

function isPowerShellToolEnabled(): boolean {
  if (process.platform !== 'win32') return false
  return process.env.USER_TYPE === 'ant'
    ? !isEnvTruthy(process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL)
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL)
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

export const lspTool: Tool = {
  name: 'lsp',
  description:
    'Language Server Protocol operations: go-to-definition, find-references, hover, document symbols, etc.',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'The LSP operation to perform.',
      },
      file_path: {
        type: 'string',
        description: 'Path to the file.',
      },
      line: { type: 'number', description: 'Line number (0-indexed).' },
      character: { type: 'number', description: 'Character offset (0-indexed).' },
    },
    required: ['operation', 'file_path'],
  },
  execute: stubExecute('LSPTool'),
}

export const powerShellTool: Tool = {
  name: 'powershell',
  description: 'Execute PowerShell commands on Windows.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The PowerShell command to execute.',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds.',
      },
    },
    required: ['command'],
  },
  execute: stubExecute('PowerShellTool'),
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
