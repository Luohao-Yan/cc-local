/**
 * Grep 工具 - 文件内容搜索
 * 使用 ripgrep (rg) 命令
 */

import { spawn } from 'child_process'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface GrepInput {
  pattern: string
  path?: string
  glob?: string
  output_mode?: 'files_with_matches' | 'content' | 'count'
  '-i'?: boolean
  '-n'?: boolean
  head_limit?: number
}

export const grepTool: Tool = {
  name: 'grep',
  description: 'Search file contents using regex (ripgrep). Use for finding code patterns, text, or references.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regex pattern to search for',
      },
      path: {
        type: 'string',
        description: 'Directory or file to search (default: current directory)',
      },
      glob: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "*.js", "*.{ts,tsx}")',
      },
      output_mode: {
        type: 'string',
        enum: ['files_with_matches', 'content', 'count'],
        description: 'Output format',
      },
      '-i': {
        type: 'boolean',
        description: 'Case insensitive search',
      },
      '-n': {
        type: 'boolean',
        description: 'Show line numbers (default: true for content mode)',
      },
      head_limit: {
        type: 'number',
        description: 'Limit output lines',
      },
    },
    required: ['pattern'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const {
      pattern,
      path = context.cwd,
      glob,
      output_mode = 'files_with_matches',
      '-i': caseInsensitive,
      '-n': showLineNumbers = true,
      head_limit = 100,
    } = input as GrepInput

    return new Promise((resolve) => {
      const args: string[] = ['--hidden']

      // 排除目录
      args.push('--glob', '!node_modules')
      args.push('--glob', '!.git')
      args.push('--glob', '!dist')
      args.push('--glob', '!build')

      // 输出模式
      if (output_mode === 'files_with_matches') {
        args.push('-l')
      } else if (output_mode === 'count') {
        args.push('-c')
      } else if (output_mode === 'content' && showLineNumbers) {
        args.push('-n')
      }

      // 大小写敏感
      if (caseInsensitive) {
        args.push('-i')
      }

      // 文件过滤
      if (glob) {
        args.push('--glob', glob)
      }

      // 最大列宽限制
      args.push('--max-columns', '500')

      // 模式（处理以 - 开头的模式）
      if (pattern.startsWith('-')) {
        args.push('-e', pattern)
      } else {
        args.push(pattern)
      }

      // 搜索路径
      args.push(path)

      const child = spawn('rg', args, {
        cwd: context.cwd,
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
          content: `Search timed out. Partial results:\n${stdout.substring(0, 2000)}`,
          is_error: true,
        })
      }, 30000)

      child.on('close', (code) => {
        clearTimeout(timeoutId)

        // ripgrep 返回码 1 表示没有找到匹配
        if (code === 1 && !stdout) {
          resolve({
            content: 'No matches found',
          })
          return
        }

        // 限制输出行数
        const lines = stdout.trim().split('\n')
        let output = lines.slice(0, head_limit).join('\n')

        if (lines.length > head_limit) {
          output += `\n\n(Results truncated. Found ${lines.length} lines, showing first ${head_limit})`
        }

        resolve({
          content: output || 'No matches found',
          is_error: code !== 0 && code !== 1,
        })
      })

      child.on('error', (error) => {
        clearTimeout(timeoutId)
        // ripgrep 未安装
        if (error.message.includes('ENOENT')) {
          resolve({
            content: 'ripgrep (rg) not found. Please install it: https://github.com/BurntSushi/ripgrep#installation',
            is_error: true,
          })
        } else {
          resolve({
            content: `Search error: ${error.message}`,
            is_error: true,
          })
        }
      })
    })
  },
}
