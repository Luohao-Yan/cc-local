import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface NotebookEditInput {
  notebook_path: string
  cell_number: number
  new_source: string
  cell_type?: 'code' | 'markdown' | 'raw'
}

function sourceToArray(source: string): string[] {
  const lines = source.split('\n')
  return lines.map((line, index) => index === lines.length - 1 ? line : `${line}\n`)
}

export const notebookEditTool: Tool = {
  name: 'NotebookEdit',
  description: 'Edit a cell in a Jupyter notebook (.ipynb) by replacing its source.',
  input_schema: {
    type: 'object',
    properties: {
      notebook_path: {
        type: 'string',
        description: 'Path to the .ipynb file.',
      },
      cell_number: {
        type: 'number',
        description: 'Zero-based cell index to edit.',
      },
      new_source: {
        type: 'string',
        description: 'Replacement cell source.',
      },
      cell_type: {
        type: 'string',
        description: 'Optional replacement cell type: code, markdown, or raw.',
      },
    },
    required: ['notebook_path', 'cell_number', 'new_source'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { notebook_path, cell_number, new_source, cell_type } = input as NotebookEditInput
    const target = resolve(context.cwd, notebook_path)
    try {
      const notebook = JSON.parse(await readFile(target, 'utf-8')) as {
        cells?: Array<{ cell_type?: string; source?: string | string[] }>
      }
      if (!Array.isArray(notebook.cells)) {
        return {
          content: 'Error: notebook does not contain a cells array',
          is_error: true,
        }
      }
      const cell = notebook.cells[cell_number]
      if (!cell) {
        return {
          content: `Error: cell ${cell_number} not found`,
          is_error: true,
        }
      }
      cell.source = sourceToArray(new_source)
      if (cell_type) {
        cell.cell_type = cell_type
      }
      await writeFile(target, `${JSON.stringify(notebook, null, 2)}\n`, 'utf-8')
      return {
        content: `Updated notebook cell ${cell_number} in ${target}`,
      }
    } catch (error) {
      return {
        content: `Error editing notebook: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}
