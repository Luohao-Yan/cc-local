/**
 * Glob 工具 - 文件搜索
 *
 * 增强特性：
 * - type: 按语言类型过滤 (js, py, rust, etc.)
 * - mtime: 按修改时间排序
 * - ripgrep 后端 (优先使用 rg --files，回退到 JS glob)
 */

import { glob as globSync } from 'glob'
import { spawn } from 'child_process'
import { stat } from 'fs/promises'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

/** Language type → glob patterns */
const TYPE_GLOBS: Record<string, string[]> = {
  js: ['*.js', '*.jsx', '*.mjs', '*.cjs'],
  ts: ['*.ts', '*.tsx', '*.mts', '*.cts'],
  py: ['*.py', '*.pyi', '*.pyw'],
  rust: ['*.rs'],
  go: ['*.go'],
  java: ['*.java', '*.kt', '*.scala'],
  c: ['*.c', '*.h'],
  cpp: ['*.cpp', '*.cc', '*.cxx', '*.hpp', '*.hh', '*.hxx'],
  csharp: ['*.cs'],
  ruby: ['*.rb', '*.erb'],
  php: ['*.php'],
  swift: ['*.swift'],
  html: ['*.html', '*.htm'],
  css: ['*.css', '*.scss', '*.less', '*.sass'],
  json: ['*.json'],
  yaml: ['*.yaml', '*.yml'],
  markdown: ['*.md', '*.mdx'],
  sql: ['*.sql'],
  shell: ['*.sh', '*.bash', '*.zsh'],
}

export interface GlobInput {
  pattern: string
  path?: string
  /** Filter by language type */
  type?: string
  /** Sort by modification time (most recent first) */
  sort_by_mtime?: boolean
}

/**
 * Check if ripgrep is available
 */
async function hasRg(): Promise<boolean> {
  try {
    const result = await new Promise<number>((resolve) => {
      const child = spawn('rg', ['--version'], { stdio: 'pipe' })
      child.on('close', (code) => resolve(code ?? 1))
      child.on('error', () => resolve(1))
    })
    return result === 0
  } catch {
    return false
  }
}

/**
 * Use ripgrep --files for faster file listing
 */
async function rgFiles(cwd: string, pattern: string, typeGlobs?: string[]): Promise<string[]> {
  const args = ['--files', '--hidden', '--glob', '!node_modules', '--glob', '!.git', '--glob', '!dist', '--glob', '!build']

  if (typeGlobs) {
    for (const g of typeGlobs) {
      args.push('--glob', g)
    }
  }

  // If pattern is more specific than **/*, add as glob
  if (pattern !== '**/*') {
    args.push('--glob', pattern)
  }

  return new Promise((resolve) => {
    const child = spawn('rg', args, { cwd })
    let stdout = ''
    child.stdout?.on('data', (data) => { stdout += data.toString() })
    child.on('close', () => {
      resolve(stdout.trim().split('\n').filter(Boolean))
    })
    child.on('error', () => resolve([]))
  })
}

/**
 * Sort files by modification time (most recent first)
 */
async function sortByMtime(files: string[], cwd: string): Promise<string[]> {
  const withMtime = await Promise.all(
    files.map(async (f) => {
      try {
        const s = await stat(`${cwd}/${f}`)
        return { file: f, mtime: s.mtimeMs }
      } catch {
        return { file: f, mtime: 0 }
      }
    }),
  )
  withMtime.sort((a, b) => b.mtime - a.mtime)
  return withMtime.map((x) => x.file)
}

export const globTool: Tool = {
  name: 'glob',
  description: 'Find files by pattern. Supports type filtering (js, ts, py, rust, go, etc.) and modification time sorting.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files (e.g., "*.js", "**/*.ts", "src/**/*.tsx")',
      },
      path: {
        type: 'string',
        description: 'Directory to search in (default: current directory)',
      },
      type: {
        type: 'string',
        description: 'Filter by language type (js, ts, py, rust, go, java, c, cpp, csharp, ruby, php, swift, html, css, json, yaml, markdown, sql, shell)',
        enum: Object.keys(TYPE_GLOBS),
      },
      sort_by_mtime: {
        type: 'boolean',
        description: 'Sort results by modification time, most recent first (default: false)',
      },
    },
    required: ['pattern'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { pattern, path = context.cwd, type: langType, sort_by_mtime = false } = input as GlobInput

    try {
      const typeGlobs = langType ? TYPE_GLOBS[langType] : undefined
      let files: string[]

      // Try ripgrep backend first (faster for large codebases)
      const useRg = await hasRg()
      if (useRg) {
        files = await rgFiles(path, pattern, typeGlobs)
      } else {
        // Fallback to JS glob
        const globPatterns = typeGlobs
          ? typeGlobs.map((g) => pattern === '**/*' ? `**/${g}` : `${pattern.replace(/\/\*$/, '')}/${g}`)
          : [pattern]

        const allFiles = new Set<string>()
        for (const p of globPatterns) {
          const matches = await globSync(p, {
            cwd: path,
            absolute: false,
            dot: true,
            ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
          })
          for (const m of matches) allFiles.add(m)
        }
        files = Array.from(allFiles)
      }

      // Sort by modification time if requested
      if (sort_by_mtime) {
        files = await sortByMtime(files, path)
      }

      // Limit results
      const MAX_RESULTS = 100
      const truncated = files.length > MAX_RESULTS
      const results = files.slice(0, MAX_RESULTS)

      let output = results.join('\n')
      if (truncated) {
        output += `\n\n(Results truncated. Found ${files.length} files, showing first ${MAX_RESULTS})`
      } else if (results.length > 0) {
        output += `\n\nFound ${files.length} files`
      } else {
        output = 'No files found matching pattern'
      }

      return { content: output }
    } catch (error) {
      return {
        content: `Glob search failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
