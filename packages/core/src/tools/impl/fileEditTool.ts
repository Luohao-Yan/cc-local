/**
 * FileEdit 工具 - 编辑文件内容
 *
 * 支持特性：
 * - 基于行号的精确文本替换
 * - replace_all: 替换所有匹配（不再要求唯一匹配）
 * - dry_run: 只返回预览不修改文件
 * - .orig 备份文件自动创建
 */

import { readFile, writeFile, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { containsPathTraversal, expandTilde, containsShellExpansion } from '@cclocal/shared'

export interface FileEditInput {
  path: string
  old_string: string
  new_string: string
  /** Replace all occurrences instead of requiring unique match */
  replace_all?: boolean
  /** Only preview the change without writing to disk */
  dry_run?: boolean
}

/** Create a .orig backup of the file */
async function createBackup(filePath: string): Promise<string | null> {
  const backupPath = filePath + '.orig'
  try {
    if (!existsSync(backupPath)) {
      await copyFile(filePath, backupPath)
      return backupPath
    }
    return null // Backup already exists
  } catch {
    return null
  }
}

/** Generate a unified diff preview */
function generateDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const lines: string[] = []

  lines.push(`--- a/${basename(filePath)}`)
  lines.push(`+++ b/${basename(filePath)}`)

  // Simple diff: find first and last different lines
  let firstDiff = 0
  let lastDiffOld = oldLines.length - 1
  let lastDiffNew = newLines.length - 1

  while (firstDiff < oldLines.length && firstDiff < newLines.length && oldLines[firstDiff] === newLines[firstDiff]) {
    firstDiff++
  }
  while (lastDiffOld > firstDiff && lastDiffNew > firstDiff && oldLines[lastDiffOld] === newLines[lastDiffNew]) {
    lastDiffOld--
    lastDiffNew--
  }

  const contextLines = 3
  const startOld = Math.max(0, firstDiff - contextLines)
  const startNew = Math.max(0, firstDiff - contextLines)
  const endOld = Math.min(oldLines.length - 1, lastDiffOld + contextLines)
  const endNew = Math.min(newLines.length - 1, lastDiffNew + contextLines)

  lines.push(`@@ -${startOld + 1},${endOld - startOld + 1} +${startNew + 1},${endNew - startNew + 1} @@`)

  for (let i = startOld; i < firstDiff; i++) {
    lines.push(` ${oldLines[i]}`)
  }
  for (let i = firstDiff; i <= lastDiffOld; i++) {
    lines.push(`-${oldLines[i]}`)
  }
  for (let i = firstDiff; i <= lastDiffNew; i++) {
    lines.push(`+${newLines[i]}`)
  }
  for (let i = lastDiffOld + 1; i <= endOld; i++) {
    if (i < oldLines.length) lines.push(` ${oldLines[i]}`)
  }

  return lines.join('\n')
}

export const fileEditTool: Tool = {
  name: 'file_edit',
  description: 'Edit a file by replacing specific text. Supports replace_all for bulk changes and dry_run for preview.',
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
      replace_all: {
        type: 'boolean',
        description: 'Replace all occurrences of old_string (default: false, requires unique match)',
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview the change without writing to disk (default: false)',
      },
    },
    required: ['path', 'old_string', 'new_string'],
  },

  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    const { path: filePath, old_string, new_string, replace_all = false, dry_run = false } = input as FileEditInput

    // Security: Reject empty old_string
    if (old_string === '') {
      return {
        content: 'Error: old_string must not be empty. Provide the exact text to replace.',
        is_error: true,
      }
    }

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

    try {
      const content = await readFile(expandedPath, 'utf-8')

      // Check if old_string exists
      if (!content.includes(old_string)) {
        return {
          content: `Error: Could not find the text to replace in ${expandedPath}\n\nMake sure the old_string exactly matches the file content (including whitespace and newlines).`,
          is_error: true,
        }
      }

      // Count occurrences
      const occurrences = content.split(old_string).length - 1

      // Handle multiple occurrences
      if (occurrences > 1 && !replace_all) {
        return {
          content: `Error: Found ${occurrences} occurrences of the text. Either provide more context to make the match unique, or set replace_all: true to replace all occurrences.`,
          is_error: true,
        }
      }

      // Perform replacement
      let newContent: string
      if (replace_all) {
        newContent = content.split(old_string).join(new_string)
      } else {
        newContent = content.replace(old_string, new_string)
      }

      // Dry run: just preview
      if (dry_run) {
        const diff = generateDiff(content, newContent, expandedPath)
        return {
          content: `[DRY RUN — no changes written]\n\n${diff}`,
        }
      }

      // Create backup before writing
      const backupPath = await createBackup(expandedPath)

      await writeFile(expandedPath, newContent, 'utf-8')

      const parts = [`Successfully edited ${expandedPath}`]
      if (occurrences > 1) {
        parts.push(`(${occurrences} replacements)`)
      }
      if (backupPath) {
        parts.push(`Backup: ${backupPath}`)
      }

      return {
        content: parts.join(' '),
      }
    } catch (error) {
      return {
        content: `Error editing file: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
