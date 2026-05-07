/**
 * VS Code MCP Tools for CCLocal
 * Additional tools exposed by the VS Code extension to the CLI via MCP
 */

import * as vscode from 'vscode'

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export interface VSCodeToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: unknown) => Promise<unknown>
}

// ─── Get Open Files Tool ───────────────────────────────────────────────────────

function getOpenFilesTool(): VSCodeToolDefinition {
  return {
    name: 'get_open_files',
    description: 'Get a list of all currently open files in the editor.',
    inputSchema: {
      type: 'object',
      properties: {
        includePath: {
          type: 'boolean',
          default: true,
          description: 'Include full file paths',
        },
        includeLanguage: {
          type: 'boolean',
          default: true,
          description: 'Include language identifiers',
        },
      },
    },
    execute: async (input: unknown) => {
      const opts = input as { includePath?: boolean; includeLanguage?: boolean }
      const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs)
      const files = tabs
        .filter(tab => tab.input instanceof vscode.TabInputText)
        .map(tab => {
          const textTab = tab.input as vscode.TabInputText
          const result: Record<string, unknown> = {
            name: textTab.uri.path.split('/').pop() || '',
          }
          if (opts.includePath !== false) {
            result.path = textTab.uri.fsPath
          }
          if (opts.includeLanguage !== false) {
            // Best effort - we can't always get the language from a tab
            result.language = undefined
          }
          return result
        })

      return { files }
    },
  }
}

// ─── Get Visible Text Tool ────────────────────────────────────────────────────

function getVisibleTextTool(): VSCodeToolDefinition {
  return {
    name: 'get_visible_text',
    description: 'Get the currently visible text in the active editor.',
    inputSchema: {
      type: 'object',
      properties: {
        includeRange: {
          type: 'boolean',
          default: true,
          description: 'Include line range information',
        },
      },
    },
    execute: async (input: unknown) => {
      const opts = input as { includeRange?: boolean }
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return { error: 'No active editor' }
      }

      const visibleRanges = editor.visibleRanges
      const texts = visibleRanges.map(range => {
        const text = editor.document.getText(range)
        const result: Record<string, unknown> = { text }
        if (opts.includeRange !== false) {
          result.startLine = range.start.line + 1 // 1-indexed
          result.endLine = range.end.line + 1
        }
        return result
      })

      return {
        fileName: editor.document.fileName,
        language: editor.document.languageId,
        visibleTexts: texts,
      }
    },
  }
}

// ─── Run Task Tool ─────────────────────────────────────────────────────────────

function runTaskTool(): VSCodeToolDefinition {
  return {
    name: 'run_task',
    description: 'Run a background task in the VS Code terminal.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute',
        },
        name: {
          type: 'string',
          description: 'Name for the terminal instance',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the command',
        },
      },
      required: ['command'],
    },
    execute: async (input: unknown) => {
      const opts = input as { command: string; name?: string; cwd?: string }
      const terminal = vscode.window.createTerminal({
        name: opts.name || 'CCLocal Task',
        cwd: opts.cwd,
      })
      terminal.show()
      terminal.sendText(opts.command)

      return {
        success: true,
        message: `Task started in terminal: ${opts.name || 'CCLocal Task'}`,
      }
    },
  }
}

// ─── Diagnostics Changed Tool ─────────────────────────────────────────────────

function diagnosticsChangedTool(): VSCodeToolDefinition {
  return {
    name: 'diagnostics_changed',
    description: 'Get current diagnostics (errors, warnings) for all open files or a specific file.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Optional specific file path to check. If omitted, checks all open files.',
        },
        severities: {
          type: 'array',
          items: { type: 'string', enum: ['error', 'warning', 'info', 'hint'] },
          description: 'Filter by severity levels',
        },
      },
    },
    execute: async (input: unknown) => {
      const opts = input as { filePath?: string; severities?: string[] }
      const severityMap: Record<string, vscode.DiagnosticSeverity> = {
        error: vscode.DiagnosticSeverity.Error,
        warning: vscode.DiagnosticSeverity.Warning,
        info: vscode.DiagnosticSeverity.Information,
        hint: vscode.DiagnosticSeverity.Hint,
      }

      const allowedSeverities = (opts.severities || ['error', 'warning'])
        .map(s => severityMap[s])
        .filter((s): s is vscode.DiagnosticSeverity => s !== undefined)

      let uris: vscode.Uri[]
      if (opts.filePath) {
        uris = [vscode.Uri.file(opts.filePath)]
      } else {
        uris = vscode.window.tabGroups.all
          .flatMap(g => g.tabs)
          .filter(t => t.input instanceof vscode.TabInputText)
          .map(t => (t.input as vscode.TabInputText).uri)
      }

      const results: Record<string, unknown[]> = {}
      for (const uri of uris) {
        const diagnostics = vscode.languages.getDiagnostics(uri)
        const filtered = diagnostics.filter(d => allowedSeverities.includes(d.severity))
        if (filtered.length > 0) {
          results[uri.fsPath] = filtered.map(d => ({
            severity: ['error', 'warning', 'info', 'hint'][d.severity],
            message: d.message,
            line: d.range.start.line + 1,
            source: d.source,
            code: d.code?.toString(),
          }))
        }
      }

      return { diagnostics: results }
    },
  }
}

// ─── File Saved Tool ──────────────────────────────────────────────────────────

function fileSavedTool(): VSCodeToolDefinition {
  return {
    name: 'file_saved',
    description: 'Listen for file save events. Returns recently saved files.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'number',
          description: 'Unix timestamp to get saves since (defaults to last 60 seconds)',
        },
      },
    },
    execute: async (input: unknown) => {
      const opts = input as { since?: number }
      const since = opts.since || (Date.now() - 60000)

      // Return last saved files from our tracking
      const savedFiles = recentlySavedFiles.filter(
        f => f.timestamp >= since
      )

      return { savedFiles }
    },
  }
}

// ─── File Save Tracker ─────────────────────────────────────────────────────────

interface SavedFileEntry {
  path: string
  timestamp: number
  language?: string
}

const recentlySavedFiles: SavedFileEntry[] = []
const MAX_SAVED_FILES = 100

export function trackFileSave(doc: vscode.TextDocument): void {
  recentlySavedFiles.push({
    path: doc.fileName,
    timestamp: Date.now(),
    language: doc.languageId,
  })

  // Trim old entries
  while (recentlySavedFiles.length > MAX_SAVED_FILES) {
    recentlySavedFiles.shift()
  }
}

// ─── Tool Registration ────────────────────────────────────────────────────────

let registeredTools: VSCodeToolDefinition[] | null = null

/**
 * Get all VS Code MCP tools
 */
export function getVSCodeMCPTools(): VSCodeToolDefinition[] {
  if (!registeredTools) {
    registeredTools = [
      getOpenFilesTool(),
      getVisibleTextTool(),
      runTaskTool(),
      diagnosticsChangedTool(),
      fileSavedTool(),
    ]
  }
  return registeredTools
}

/**
 * Register VS Code file save event listener
 */
export function registerFileSaveListener(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      trackFileSave(doc)
    })
  )
}
