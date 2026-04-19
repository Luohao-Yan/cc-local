/**
 * Glob 工具 - 文件搜索
 */

import { glob as globSync } from 'glob'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface GlobInput {
  pattern: string
  path?: string
}

export const globTool: Tool = {
  name: 'glob',
  description: 'Find files by pattern (e.g., "*.js", "**/*.ts", "src/**/*.tsx")',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files',
      },
      path: {
        type: 'string',
        description: 'Directory to search in (default: current directory)',
      },
    },
    required: ['pattern'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { pattern, path = context.cwd } = input as GlobInput

    try {
      const files = await globSync(pattern, {
        cwd: path,
        absolute: false,
        dot: true,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
      })

      // 限制结果数量
      const MAX_RESULTS = 100
      const truncated = files.length > MAX_RESULTS
      const results = files.slice(0, MAX_RESULTS)

      let output = results.join('\n')
      if (truncated) {
        output += `\n\n(Results truncated. Found ${files.length} files, showing first ${MAX_RESULTS})`
      } else {
        output += `\n\nFound ${files.length} files`
      }

      return {
        content: output,
      }
    } catch (error) {
      return {
        content: `Glob search failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
