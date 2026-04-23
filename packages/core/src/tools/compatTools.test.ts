import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, expect, it } from 'vitest'
import { toolRegistry } from './registry.js'
import { clearTaskStore, taskCreateTool, taskListTool, taskUpdateTool } from './impl/taskTools.js'
import { todoWriteTool, getSessionTodos } from './impl/todoWriteTool.js'
import { notebookEditTool } from './impl/notebookEditTool.js'
import type { ToolContext } from '@cclocal/shared'

describe('compatibility tools', () => {
  it('registers migrated legacy tool names in the default registry', () => {
    const toolNames = toolRegistry.getAll().map((tool) => tool.name)
    expect(toolNames).toContain('WebFetch')
    expect(toolNames).toContain('web_fetch')
    expect(toolNames).toContain('WebSearch')
    expect(toolNames).toContain('web_search')
    expect(toolNames).toContain('TodoWrite')
    expect(toolNames).toContain('NotebookEdit')
    expect(toolNames).toContain('TaskCreate')
    expect(toolNames).toContain('TaskGet')
    expect(toolNames).toContain('TaskList')
    expect(toolNames).toContain('TaskUpdate')
    expect(toolNames).toContain('mcp')
    expect(toolNames).toContain('ReadMcpResourceTool')
    expect(toolNames).toContain('REPL')
    expect(toolNames).toContain('Monitor')
    expect(toolNames).toContain('VerifyPlanExecution')
    expect(toolNames).toContain('SuggestBackgroundPR')
    expect(toolNames).toContain('remote_skill')
    expect(toolNames).toContain('in-process')
    expect(toolNames).toContain('ship-audit')
    expect(toolNames).toContain('migration-review')
  })

  it('stores todos by session', async () => {
    const context: ToolContext = {
      sessionId: 'todo-session',
      cwd: process.cwd(),
    }

    const result = await todoWriteTool.execute({
      todos: [{
        content: 'Migrate tools',
        status: 'in_progress',
        priority: 'high',
      }],
    }, context)

    expect(result.is_error).toBeUndefined()
    expect(result.content).toContain('Todos updated successfully')
    expect(getSessionTodos('todo-session')).toEqual([{
      id: 'todo-1',
      content: 'Migrate tools',
      status: 'in_progress',
      priority: 'high',
    }])
  })

  it('creates, updates, and lists lightweight tasks', async () => {
    clearTaskStore()
    const context: ToolContext = {
      sessionId: 'task-session',
      cwd: process.cwd(),
    }

    const createResult = await taskCreateTool.execute({
      subject: 'Finish native migration',
      description: 'Port old CLI capability into packages',
    }, context)
    expect(createResult.is_error).toBeUndefined()
    const id = createResult.content.match(/ID: (task-[a-z0-9]+)/)?.[1]
    expect(id).toBeTruthy()

    const updateResult = await taskUpdateTool.execute({
      id,
      status: 'completed',
    }, context)
    expect(updateResult.content).toContain('Status: completed')

    const listResult = await taskListTool.execute({
      status: 'completed',
    }, context)
    expect(listResult.content).toContain('Finish native migration')
  })

  it('edits a notebook cell in place', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cclocal-notebook-'))
    try {
      const notebookPath = join(dir, 'demo.ipynb')
      await writeFile(notebookPath, JSON.stringify({
        cells: [{
          cell_type: 'code',
          source: ['print("old")\n'],
          metadata: {},
          outputs: [],
          execution_count: null,
        }],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      }), 'utf-8')

      const result = await notebookEditTool.execute({
        notebook_path: notebookPath,
        cell_number: 0,
        new_source: 'print("new")',
      }, {
        sessionId: 'notebook-session',
        cwd: dir,
      })

      expect(result.is_error).toBeUndefined()
      const notebook = JSON.parse(await readFile(notebookPath, 'utf-8'))
      expect(notebook.cells[0].source).toEqual(['print("new")'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
