/**
 * Grep 工具 - 文件内容搜索
 * 使用 ripgrep (rg) 命令
 *
 * 增强特性：
 * - type: 按语言类型过滤 (js, py, rust, go, etc.)
 * - -A/-B/-C: 上下文行数
 * - multiline: 跨行正则匹配
 * - offset: 跳过前 N 行结果
 */

import { spawn } from 'child_process'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

/** Language type → ripgrep type mapping */
const TYPE_MAP: Record<string, string> = {
  js: 'js',
  javascript: 'js',
  ts: 'ts',
  typescript: 'ts',
  tsx: 'tsx',
  jsx: 'jsx',
  py: 'py',
  python: 'py',
  rs: 'rust',
  rust: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  cs: 'csharp',
  csharp: 'csharp',
  rb: 'ruby',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  shell: 'shell',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  md: 'markdown',
  markdown: 'markdown',
  lua: 'lua',
  dart: 'dart',
  elixir: 'elixir',
  erlang: 'erlang',
  haskell: 'haskell',
  kotlin: 'kotlin',
  scala: 'scala',
  vim: 'vim',
  nix: 'nix',
}

export interface GrepInput {
  pattern: string
  path?: string
  glob?: string
  type?: string
  output_mode?: 'files_with_matches' | 'content' | 'count'
  '-i'?: boolean
  '-n'?: boolean
  '-A'?: number
  '-B'?: number
  '-C'?: number
  multiline?: boolean
  head_limit?: number
  offset?: number
}

export const grepTool: Tool = {
  name: 'grep',
  description: 'Search file contents using regex (ripgrep). Supports type filtering, context lines, and multiline matching.',
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
      type: {
        type: 'string',
        description: 'Filter by language type (js, ts, py, rust, go, java, c, cpp, etc.)',
        enum: Object.keys(TYPE_MAP),
      },
      output_mode: {
        type: 'string',
        enum: ['files_with_matches', 'content', 'count'],
        description: 'Output format (default: files_with_matches)',
      },
      '-i': {
        type: 'boolean',
        description: 'Case insensitive search',
      },
      '-n': {
        type: 'boolean',
        description: 'Show line numbers (default: true for content mode)',
      },
      '-A': {
        type: 'number',
        description: 'Number of lines after each match',
      },
      '-B': {
        type: 'number',
        description: 'Number of lines before each match',
      },
      '-C': {
        type: 'number',
        description: 'Number of lines around each match',
      },
      multiline: {
        type: 'boolean',
        description: 'Enable multiline mode (. matches newlines, patterns can span lines)',
      },
      head_limit: {
        type: 'number',
        description: 'Limit output lines',
      },
      offset: {
        type: 'number',
        description: 'Skip first N results',
      },
    },
    required: ['pattern'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const {
      pattern,
      path = context.cwd,
      glob,
      type: langType,
      output_mode = 'files_with_matches',
      '-i': caseInsensitive,
      '-n': showLineNumbers = true,
      '-A': afterContext,
      '-B': beforeContext,
      '-C': aroundContext,
      multiline,
      head_limit = 100,
      offset = 0,
    } = input as GrepInput

    return new Promise((resolve) => {
      const args: string[] = ['--hidden']

      // Exclude directories
      args.push('--glob', '!node_modules')
      args.push('--glob', '!.git')
      args.push('--glob', '!dist')
      args.push('--glob', '!build')

      // Output mode
      if (output_mode === 'files_with_matches') {
        args.push('-l')
      } else if (output_mode === 'count') {
        args.push('-c')
      } else if (output_mode === 'content' && showLineNumbers) {
        args.push('-n')
      }

      // Case sensitivity
      if (caseInsensitive) {
        args.push('-i')
      }

      // Language type filter
      if (langType && TYPE_MAP[langType]) {
        args.push('--type', TYPE_MAP[langType])
      }

      // File glob filter
      if (glob) {
        args.push('--glob', glob)
      }

      // Context lines
      if (aroundContext) {
        args.push('-C', String(aroundContext))
      } else {
        if (beforeContext) args.push('-B', String(beforeContext))
        if (afterContext) args.push('-A', String(afterContext))
      }

      // Multiline mode
      if (multiline) {
        args.push('--multiline-dotall')
      }

      // Max column width
      args.push('--max-columns', '500')

      // Pattern (handle patterns starting with -)
      if (pattern.startsWith('-')) {
        args.push('-e', pattern)
      } else {
        args.push(pattern)
      }

      // Search path
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

      // Timeout
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        resolve({
          content: `Search timed out. Partial results:\n${stdout.substring(0, 2000)}`,
          is_error: true,
        })
      }, 30000)

      child.on('close', (code) => {
        clearTimeout(timeoutId)

        // ripgrep exit code 1 = no matches
        if (code === 1 && !stdout) {
          resolve({
            content: 'No matches found',
          })
          return
        }

        // Apply offset and head_limit
        const lines = stdout.trim().split('\n')
        const skipped = lines.slice(offset)
        let output = skipped.slice(0, head_limit).join('\n')

        if (skipped.length > head_limit) {
          output += `\n\n(Results truncated. ${skipped.length} total lines, showing ${offset + 1}-${offset + head_limit})`
        } else if (offset > 0) {
          output = `[Showing results ${offset + 1}-${offset + skipped.length} of ${lines.length} total]\n${output}`
        }

        resolve({
          content: output || 'No matches found',
          is_error: code !== 0 && code !== 1,
        })
      })

      child.on('error', (error) => {
        clearTimeout(timeoutId)
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
