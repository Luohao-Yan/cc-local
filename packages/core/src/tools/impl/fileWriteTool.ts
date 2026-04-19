/**
 * FileWrite 工具 - 写入文件内容
 */

import { writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface FileWriteInput {
  path: string
  content: string
}

export const fileWriteTool: Tool = {
  name: 'file_write',
  description: 'Create a new file or overwrite an existing file with the given content.',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to the file',
      },
      content: {
        type: 'string',
        description: 'Content to write to the file',
      },
    },
    required: ['path', 'content'],
  },

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const { path: filePath, content } = input as FileWriteInput

    try {
      // 确保目录存在
      const dir = dirname(filePath)
      await mkdir(dir, { recursive: true })

      await writeFile(filePath, content, 'utf-8')

      return {
        content: `File written successfully: ${filePath}`,
      }
    } catch (error) {
      return {
        content: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
