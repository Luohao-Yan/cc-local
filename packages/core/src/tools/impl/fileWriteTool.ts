/**
 * FileWrite 工具 - 写入文件内容
 *
 * 支持特性：
 * - 创建新文件或覆盖已有文件
 * - append 模式：追加内容到文件末尾
 * - 文件大小限制：防止意外写入超大文件
 * - 备份：覆盖已有文件时自动创建 .orig 备份
 */

import { writeFile, appendFile, mkdir, copyFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname, basename } from 'path'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { containsPathTraversal, expandTilde, containsShellExpansion } from '@cclocal/shared'

/** Maximum file size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024

export interface FileWriteInput {
  path: string
  content: string
  /** Append to file instead of overwriting (default: false) */
  append?: boolean
}

/** Create a .orig backup of the file if it exists */
async function createBackup(filePath: string): Promise<string | null> {
  if (!existsSync(filePath)) return null
  const backupPath = filePath + '.orig'
  try {
    if (!existsSync(backupPath)) {
      await copyFile(filePath, backupPath)
      return backupPath
    }
    return null
  } catch {
    return null
  }
}

export const fileWriteTool: Tool = {
  name: 'file_write',
  description: 'Create a new file, overwrite an existing file, or append to a file. Automatically creates parent directories and backs up existing files.',
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
      append: {
        type: 'boolean',
        description: 'Append to the end of the file instead of overwriting (default: false)',
      },
    },
    required: ['path', 'content'],
  },

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const { path: filePath, content, append = false } = input as FileWriteInput

    // Security: Expand tilde and validate path
    const expandedPath = expandTilde(filePath)
    if (containsPathTraversal(expandedPath)) {
      return {
        content: 'Error: Path contains directory traversal patterns (..). Provide an absolute path without ".." segments.',
        is_error: true,
      }
    }
    if (containsShellExpansion(expandedPath)) {
      return {
        content: 'Error: Path contains shell expansion syntax ($, %, or = prefix). Provide a literal path.',
        is_error: true,
      }
    }

    // File size limit check
    if (content.length > MAX_FILE_SIZE) {
      return {
        content: `Error: Content exceeds maximum file size of ${MAX_FILE_SIZE / 1024 / 1024} MB. Your content is ${(content.length / 1024 / 1024).toFixed(1)} MB.`,
        is_error: true,
      }
    }

    try {
      // Create parent directories
      const dir = dirname(expandedPath)
      await mkdir(dir, { recursive: true })

      // Create backup if overwriting an existing file (not in append mode)
      let backupPath: string | null = null
      if (!append && existsSync(expandedPath)) {
        backupPath = await createBackup(expandedPath)
      }

      if (append) {
        await appendFile(expandedPath, content, 'utf-8')
      } else {
        await writeFile(expandedPath, content, 'utf-8')
      }

      const parts = [`${append ? 'Appended to' : 'Wrote'} ${expandedPath}`]
      const contentLines = content.split('\n').length
      parts.push(`(${contentLines} lines, ${(content.length / 1024).toFixed(1)} KB)`)
      if (backupPath) {
        parts.push(`Backup: ${backupPath}`)
      }

      return {
        content: parts.join(' '),
      }
    } catch (error) {
      return {
        content: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
