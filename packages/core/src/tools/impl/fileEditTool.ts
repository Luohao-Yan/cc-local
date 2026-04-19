/**
 * FileEdit 工具 - 编辑文件内容
 * 支持基于行号的文本替换
 */

import { readFile, writeFile } from 'fs/promises'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface FileEditInput {
  path: string
  old_string: string
  new_string: string
}

export const fileEditTool: Tool = {
  name: 'file_edit',
  description: 'Edit a file by replacing specific text. Use for precise modifications when you know the exact content to change.',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to the file',
      },
      old_string: {
        type: 'string',
        description: 'Exact text to replace (including whitespace)',
      },
      new_string: {
        type: 'string',
        description: 'New text to insert',
      },
    },
    required: ['path', 'old_string', 'new_string'],
  },

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const { path: filePath, old_string, new_string } = input as FileEditInput

    try {
      const content = await readFile(filePath, 'utf-8')

      // 检查 old_string 是否存在
      if (!content.includes(old_string)) {
        return {
          content: `Error: Could not find the text to replace in ${filePath}\n\nMake sure the old_string exactly matches the file content (including whitespace and newlines).`,
          is_error: true,
        }
      }

      // 处理多行替换的情况
      const occurrences = content.split(old_string).length - 1
      if (occurrences > 1) {
        return {
          content: `Error: Found ${occurrences} occurrences of the text. Please provide more context to make the match unique.`,
          is_error: true,
        }
      }

      // 执行替换
      const newContent = content.replace(old_string, new_string)
      await writeFile(filePath, newContent, 'utf-8')

      return {
        content: `Successfully edited ${filePath}`,
      }
    } catch (error) {
      return {
        content: `Error editing file: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
