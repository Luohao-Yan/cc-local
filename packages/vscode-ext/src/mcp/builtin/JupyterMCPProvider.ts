/**
 * JupyterMCPProvider — Built-in Jupyter notebook MCP integration.
 *
 * 1:1 match with official extension's built-in Jupyter MCP support.
 * Provides notebook cell execution, inspection, and manipulation.
 *
 * Commands:
 *   cclocal.mcp.enableJupyter — Enable Jupyter MCP
 *   cclocal.mcp.disableJupyter — Disable Jupyter MCP
 *
 * VS Code API integration:
 *   - NotebookCellData / NotebookCellKind for cell manipulation
 *   - NotebookEditor for cell execution
 *   - NotebookCellOutputItem for output retrieval
 */

import * as vscode from 'vscode'

export class JupyterMCPProvider implements vscode.Disposable {
  private enabled = false
  private outputChannel: vscode.LogOutputChannel
  /** Track watched notebooks for auto-execution */
  private watchedEditors = new Set<vscode.NotebookEditor>()

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Enable Jupyter MCP server in settings */
  async enable(): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const mcpServers = config.get<Record<string, any>>('mcpServers') || {}

    mcpServers['jupyter'] = {
      command: 'uvx',
      args: ['jupyter-mcp-server'],
      type: 'stdio',
    }

    await config.update('mcpServers', mcpServers, vscode.ConfigurationTarget.Global)
    this.enabled = true
    this.outputChannel.info('Jupyter MCP server enabled')
    vscode.window.showInformationMessage('CCLocal: Jupyter MCP server enabled')
  }

  /** Disable Jupyter MCP server */
  async disable(): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const mcpServers = config.get<Record<string, any>>('mcpServers') || {}

    delete mcpServers['jupyter']
    await config.update('mcpServers', mcpServers, vscode.ConfigurationTarget.Global)
    this.enabled = false
    this.outputChannel.info('Jupyter MCP server disabled')
    vscode.window.showInformationMessage('CCLocal: Jupyter MCP server disabled')
  }

  /** Check if Jupyter MCP is enabled */
  isEnabled(): boolean {
    return this.enabled
  }

  // ─── Notebook Cell Operations (1:1 with official extension) ──────────

  /**
   * Execute a notebook cell and return the output.
   * Uses VS Code's built-in notebook execution API.
   */
  async executeCell(notebookUri: vscode.Uri, cellIndex: number): Promise<string | undefined> {
    const doc = await vscode.workspace.openNotebookDocument(notebookUri)
    if (!doc || cellIndex >= doc.cellCount) return undefined

    const cell = doc.cellAt(cellIndex)
    const editor = await vscode.window.showNotebookDocument(doc)
    if (!editor) return undefined

    // Execute the cell
    const execution = editor.kernel?.createNotebookCellExecution(cell)
    if (!execution) {
      this.outputChannel.warn(`[Jupyter] No kernel available for execution`)
      return undefined
    }

    execution.start()
    try {
      await new Promise<void>((resolve, reject) => {
        execution.token.onCancellationRequested(() => reject(new Error('Cancelled')))
        // The kernel handles actual execution; we wait for output
        const timeout = setTimeout(() => resolve(), 60000)
        execution.onDidChangeOutputs?.(() => {
          if (cell.outputs.length > 0) {
            clearTimeout(timeout)
            resolve()
          }
        })
      })
    } finally {
      execution.end(undefined)
    }

    return this.getCellOutput(cell)
  }

  /**
   * Add a new cell to a notebook at the specified index.
   */
  async addCell(
    notebookUri: vscode.Uri,
    cellKind: vscode.NotebookCellKind,
    source: string,
    languageId: string,
    index: number,
  ): Promise<boolean> {
    const doc = await vscode.workspace.openNotebookDocument(notebookUri)
    if (!doc) return false

    const cellData = new vscode.NotebookCellData(cellKind, source, languageId)
    const workspaceEdit = new vscode.WorkspaceEdit()

    // Use notebook edit to insert cell
    const notebookEdit = vscode.NotebookEdit.insertCells(
      index,
      [cellData],
    )

    workspaceEdit.set(notebookUri, [notebookEdit])
    return vscode.workspace.applyEdit(workspaceEdit)
  }

  /**
   * Delete a cell from a notebook.
   */
  async deleteCell(notebookUri: vscode.Uri, cellIndex: number): Promise<boolean> {
    const doc = await vscode.workspace.openNotebookDocument(notebookUri)
    if (!doc || cellIndex >= doc.cellCount) return false

    const range = new vscode.NotebookRange(cellIndex, cellIndex + 1)
    const workspaceEdit = new vscode.WorkspaceEdit()
    const notebookEdit = vscode.NotebookEdit.deleteCells(range)

    workspaceEdit.set(notebookUri, [notebookEdit])
    return vscode.workspace.applyEdit(workspaceEdit)
  }

  /**
   * Get the output text from a cell.
   */
  getCellOutput(cell: vscode.NotebookCell): string | undefined {
    if (!cell.outputs || cell.outputs.length === 0) return undefined

    for (const output of cell.outputs) {
      for (const item of output.items) {
        if (item.mime === 'text/plain' || item.mime === 'application/vnd.code.notebook.stdout') {
          return new TextDecoder().decode(item.data)
        }
      }
    }

    return undefined
  }

  /**
   * Edit a cell's source content.
   */
  async editCellSource(
    notebookUri: vscode.Uri,
    cellIndex: number,
    newSource: string,
  ): Promise<boolean> {
    const doc = await vscode.workspace.openNotebookDocument(notebookUri)
    if (!doc || cellIndex >= doc.cellCount) return false

    const cell = doc.cellAt(cellIndex)
    const workspaceEdit = new vscode.WorkspaceEdit()
    workspaceEdit.replace(cell.document.uri, new vscode.Range(0, 0, cell.document.lineCount, 0), newSource)
    return vscode.workspace.applyEdit(workspaceEdit)
  }

  /**
   * List all cells in a notebook with their metadata.
   */
  async listCells(notebookUri: vscode.Uri): Promise<Array<{
    index: number
    kind: string
    languageId: string
    source: string
    hasOutput: boolean
  }> | undefined> {
    const doc = await vscode.workspace.openNotebookDocument(notebookUri)
    if (!doc) return undefined

    const cells: Array<{
      index: number
      kind: string
      languageId: string
      source: string
      hasOutput: boolean
    }> = []

    for (let i = 0; i < doc.cellCount; i++) {
      const cell = doc.cellAt(i)
      cells.push({
        index: i,
        kind: cell.kind === vscode.NotebookCellKind.Code ? 'code' : 'markdown',
        languageId: cell.document.languageId,
        source: cell.document.getText(),
        hasOutput: cell.outputs.length > 0,
      })
    }

    return cells
  }

  dispose(): void {
    this.watchedEditors.clear()
  }
}
