/**
 * FileRead 工具 - 读取文件内容
 */

import { readFile } from 'fs/promises'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface FileReadInput {
  path: string
  offset?: number
  limit?: number
}

export const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Read the contents of a file. Use for viewing code, config files, logs, etc.',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to the file',
      },
      offset: {
        type: 'number',
        description: 'Line number to start reading from (1-indexed)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of lines to read',
      },
    },
    required: ['path'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { path: filePath, offset = 1, limit } = input as FileReadInput

    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')

      // 应用 offset 和 limit
      const startLine = Math.max(0, offset - 1)
      const endLine = limit ? Math.min(lines.length, startLine + limit) : lines.length
      const selectedLines = lines.slice(startLine, endLine)

      let result = selectedLines.join('\n')

      // 添加行号信息
      if (offset > 1 || limit) {
        result = `[Lines ${startLine + 1}-${endLine} of ${lines.length}]\n${result}`
      }

      return {
        content: result,
      }
    } catch (error) {
      return {
        content: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
