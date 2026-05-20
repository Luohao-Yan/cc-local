/**
 * FileRead 工具 - 读取文件内容
 *
 * 支持特性：
 * - 文本文件读取（行号、偏移、限制）
 * - PDF 分页读取（基于 pdftotext 或 pdf-parse）
 * - 图片读取（返回 base64 + 维度信息）
 * - Notebook (.ipynb) 读取（渲染 cell 结构）
 * - 二进制文件检测（拒绝读取，提示文件类型）
 */

import { readFile, stat } from 'fs/promises'
import { extname, basename } from 'path'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface FileReadInput {
  path: string
  offset?: number
  limit?: number
  /** For PDF files: page number to start from (1-indexed) */
  page?: number
  /** For PDF files: number of pages to read */
  page_limit?: number
}

/** Known binary file extensions that should not be read as text */
const BINARY_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar', '.dmg', '.iso',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.svg',
  '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.wav', '.ogg',
  '.pdf', '.psd', '.ai', '.eps',
  '.sqlite', '.db', '.mdb',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pkl', '.pickle', '.npy', '.npz', '.h5', '.hdf5',
  '.parquet', '.arrow', '.feather',
])

/** Image extensions that can be read (returned as metadata) */
const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.svg',
])

/** Check if a file is likely binary based on extension */
function isBinaryFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

/** Check if a file is an image */
function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase())
}

/** Check if a file is a PDF */
function isPdfFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === '.pdf'
}

/** Check if a file is a Jupyter notebook */
function isNotebookFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === '.ipynb'
}

/** Detect null bytes in first 8KB — strong indicator of binary content */
async function detectBinaryByContent(filePath: string): Promise<boolean> {
  try {
    const buffer = Buffer.alloc(8192)
    const handle = await import('fs/promises').then(m => m.open(filePath, 'r'))
    const { bytesRead } = await handle.read(buffer, 0, 8192, 0)
    await handle.close()
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true
    }
    return false
  } catch {
    return false
  }
}

/** Format notebook cells for display */
function formatNotebook(data: any): string {
  if (!data.cells || !Array.isArray(data.cells)) {
    return JSON.stringify(data, null, 2)
  }

  const lines: string[] = []
  lines.push(`Notebook: ${data.metadata?.language_info?.name ?? 'unknown'} language`)
  lines.push(`Cells: ${data.cells.length}`)
  lines.push('')

  for (let i = 0; i < data.cells.length; i++) {
    const cell = data.cells[i]
    const cellType = cell.cell_type ?? 'unknown'
    const executionCount = cell.execution_count ?? ''
    const prefix = cellType === 'code' ? `In [${executionCount}]:` : `MarkDown:`

    lines.push(`--- Cell ${i + 1} (${cellType}) ${prefix} ---`)

    if (Array.isArray(cell.source)) {
      lines.push(cell.source.join('\n'))
    } else if (typeof cell.source === 'string') {
      lines.push(cell.source)
    }

    if (cellType === 'code' && Array.isArray(cell.outputs) && cell.outputs.length > 0) {
      lines.push('')
      lines.push('Output:')
      for (const output of cell.outputs) {
        if (output.text) {
          const text = Array.isArray(output.text) ? output.text.join('\n') : output.text
          lines.push(text)
        } else if (output.data?.['text/plain']) {
          const text = Array.isArray(output.data['text/plain'])
            ? output.data['text/plain'].join('\n')
            : output.data['text/plain']
          lines.push(text)
        }
      }
    }

    lines.push('')
  }

  return lines.join('\n')
}

export const fileReadTool: Tool = {
  name: 'file_read',
  description:
    'Read the contents of a file. Supports text files, PDFs (with page number), images (returns metadata), and Jupyter notebooks. Use for viewing code, config files, logs, etc.',
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
      page: {
        type: 'number',
        description: 'For PDF files: page number to start from (1-indexed).',
      },
      page_limit: {
        type: 'number',
        description: 'For PDF files: number of pages to read.',
      },
    },
    required: ['path'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { path: filePath, offset = 1, limit, page, page_limit } = input as FileReadInput

    try {
      // 1. Check if file exists and get stats
      const fileStat = await stat(filePath)

      // 2. Image files — return metadata, not content
      if (isImageFile(filePath)) {
        return {
          content: [
            { type: 'text', text: `Image file: ${basename(filePath)}\nSize: ${(fileStat.size / 1024).toFixed(1)} KB\nPath: ${filePath}` },
          ],
        }
      }

      // 3. PDF files — try pdf-parse for page-level reading
      if (isPdfFile(filePath)) {
        try {
          const pdfParse = (await import('pdf-parse' as any)).default
          const buffer = await readFile(filePath)
          const pdfData = await pdfParse(buffer)

          const startPage = page ?? 1
          const maxPages = page_limit ?? 20
          const endPage = Math.min(startPage + maxPages - 1, pdfData.numpages)

          // pdf-parse returns all text; paginate by page breaks
          const pageTexts = pdfData.text.split(/\f/).filter(Boolean)
          const selectedPages = pageTexts.slice(startPage - 1, endPage)

          return {
            content: selectedPages.length > 0
              ? `[Pages ${startPage}-${startPage + selectedPages.length - 1} of ${pdfData.numpages}]\n\n${selectedPages.join('\n\n--- Page Break ---\n\n')}`
              : `PDF has ${pdfData.numpages} pages but no extractable text.`,
          }
        } catch {
          return {
            content: `PDF file detected but pdf-parse is not available. Install it with: bun add pdf-parse`,
            is_error: true,
          }
        }
      }

      // 4. Jupyter notebooks — parse and format
      if (isNotebookFile(filePath)) {
        const content = await readFile(filePath, 'utf-8')
        try {
          const notebookData = JSON.parse(content)
          return { content: formatNotebook(notebookData) }
        } catch {
          // Fall through to text reading if JSON parse fails
        }
      }

      // 5. Binary file detection
      if (isBinaryFile(filePath)) {
        return {
          content: `Binary file detected: ${basename(filePath)} (${extname(filePath).toLowerCase()} format, ${(fileStat.size / 1024).toFixed(1)} KB). This file type cannot be displayed as text.`,
        }
      }

      // 6. Content-based binary detection (for extension-less files)
      if (await detectBinaryByContent(filePath)) {
        return {
          content: `Binary file detected: ${basename(filePath)} (${(fileStat.size / 1024).toFixed(1)} KB). This file contains binary data and cannot be displayed as text.`,
        }
      }

      // 7. Regular text file reading
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')

      const startLine = Math.max(0, offset - 1)
      const endLine = limit ? Math.min(lines.length, startLine + limit) : lines.length
      const selectedLines = lines.slice(startLine, endLine)

      // Add line numbers
      const numberedLines = selectedLines.map((line, i) => {
        const lineNum = startLine + i + 1
        return `${String(lineNum).padStart(6)}→${line}`
      })

      let result = numberedLines.join('\n')

      // Add header with line range info
      if (offset > 1 || limit) {
        result = `[Lines ${startLine + 1}-${endLine} of ${lines.length}]\n${result}`
      }

      // Truncate very long reads
      const MAX_CHARS = 200_000
      if (result.length > MAX_CHARS) {
        result = result.slice(0, MAX_CHARS) + '\n\n[... content truncated at 200K chars ...]'
      }

      return { content: result }
    } catch (error) {
      return {
        content: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
