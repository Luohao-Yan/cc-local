/**
 * Bash 工具 - 执行 shell 命令（简化版）
 */

import { spawn } from 'child_process'
import { promisify } from 'util'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface BashInput {
  command: string
  timeout?: number
  cwd?: string
}

export const bashTool: Tool = {
  name: 'bash',
  description: 'Execute shell commands. Use for file operations, git commands, running scripts, etc.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the command',
      },
    },
    required: ['command'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { command, timeout = 30000, cwd } = input as BashInput

    // 安全检查：阻止危险命令
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      />\s*\/dev\/null.*\//,
      /:\(\)\{\s*:\|\:\&\}/, // fork bomb
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          content: 'Error: Potentially dangerous command blocked',
          is_error: true,
        }
      }
    }

    return new Promise((resolve) => {
      const workDir = cwd || context.cwd
      const child = spawn('bash', ['-c', command], {
        cwd: workDir,
        signal: context.abortSignal,
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // 超时处理
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        resolve({
          content: `Command timed out after ${timeout}ms\nPartial output:\n${stdout}`,
          is_error: true,
        })
      }, timeout)

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        const output = stdout + (stderr ? `\nStderr:\n${stderr}` : '')
        resolve({
          content: output || '(no output)',
          is_error: code !== 0,
        })
      })

      child.on('error', (error) => {
        clearTimeout(timeoutId)
        resolve({
          content: `Error: ${error.message}`,
          is_error: true,
        })
      })
    })
  },
}
