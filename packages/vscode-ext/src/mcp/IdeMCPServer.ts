/**
 * IDE MCP Server for CCLocal VS Code Extension
 * Exposes IDE tools via MCP for CLI to consume
 */

import * as vscode from 'vscode'
import * as http from 'http'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { WebSocketServer, WebSocket } from 'ws'
import type { IdeLockfile, MCPToolCall, MCPToolResult } from '@cclocal/shared'

// ─── Tool Definitions ──────────────────────────────────────────────────────────

const IDE_TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file from the IDE workspace',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the IDE workspace',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file to write',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'get_diagnostics',
    description: 'Get IDE diagnostics (errors, warnings) for a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to get diagnostics for',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_selection',
    description: 'Get the currently selected text in the editor',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'open_file',
    description: 'Open a file in the IDE editor',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to open',
        },
        line: {
          type: 'number',
          description: 'Optional line number to scroll to',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'save_file',
    description: 'Save the currently active file',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_files',
    description: 'List files in a directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_workspace_folders',
    description: 'Get the list of workspace folders',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

// ─── MCP Server ─────────────────────────────────────────────────────────────────

export class IdeMCPServer {
  private server: http.Server | null = null
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private port: number = 0
  private authToken: string = ''
  private lockfilePath: string | null = null

  constructor(private outputChannel: vscode.OutputChannel) {}

  /**
   * Start the MCP server
   */
  async start(): Promise<number> {
    // Generate auth token
    this.authToken = crypto.randomBytes(32).toString('hex')

    // Create HTTP server
    this.server = http.createServer()

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.server })

    // Handle WebSocket connections
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    // Bind to random port
    return new Promise((resolve, reject) => {
      this.server!.listen(0, '127.0.0.1', () => {
        const address = this.server!.address()
        if (typeof address === 'object' && address) {
          this.port = address.port
          this.outputChannel.info(`MCP server started on port ${this.port}`)
          this.writeLockfile()
          resolve(this.port)
        } else {
          reject(new Error('Failed to get server port'))
        }
      })
    })
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    // Close all clients
    this.clients.forEach((client) => client.close())
    this.clients.clear()

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve())
      })
      this.wss = null
    }

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve())
      })
      this.server = null
    }

    // Remove lockfile
    this.removeLockfile()
  }

  /**
   * Get the server port
   */
  getPort(): number {
    return this.port
  }

  /**
   * Get the auth token
   */
  getAuthToken(): string {
    return this.authToken
  }

  // ─── Connection Handling ──────────────────────────────────────────────────────

  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    // Verify auth token from query string
    const url = new URL(req.url || '', 'http://localhost')
    const token = url.searchParams.get('token')

    if (token !== this.authToken) {
      ws.close(1008, 'Unauthorized')
      return
    }

    this.clients.add(ws)
    this.outputChannel.info('MCP client connected')

    ws.on('message', (data) => {
      this.handleMessage(ws, data)
    })

    ws.on('close', () => {
      this.clients.delete(ws)
      this.outputChannel.info('MCP client disconnected')
    })

    ws.on('error', (error) => {
      this.outputChannel.error(`MCP WebSocket error: ${error}`)
      this.clients.delete(ws)
    })

    // Send tools list on connect
    this.sendToolsList(ws)
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString())

      switch (message.method) {
        case 'tools/list':
          this.sendToolsList(ws, message.id)
          break

        case 'tools/call':
          this.handleToolCall(ws, message.id, message.params as MCPToolCall)
          break

        default:
          this.sendError(ws, message.id, `Unknown method: ${message.method}`)
      }
    } catch (error) {
      this.outputChannel.error(`Failed to parse MCP message: ${error}`)
    }
  }

  // ─── Tool Handling ────────────────────────────────────────────────────────────

  private async handleToolCall(ws: WebSocket, id: string, params: MCPToolCall): Promise<void> {
    try {
      let result: MCPToolResult

      switch (params.name) {
        case 'read_file':
          result = await this.toolReadFile(params.arguments as { path: string })
          break

        case 'write_file':
          result = await this.toolWriteFile(params.arguments as { path: string; content: string })
          break

        case 'get_diagnostics':
          result = await this.toolGetDiagnostics(params.arguments as { path: string })
          break

        case 'get_selection':
          result = await this.toolGetSelection()
          break

        case 'open_file':
          result = await this.toolOpenFile(params.arguments as { path: string; line?: number })
          break

        case 'save_file':
          result = await this.toolSaveFile()
          break

        case 'list_files':
          result = await this.toolListFiles(params.arguments as { path: string })
          break

        case 'get_workspace_folders':
          result = await this.toolGetWorkspaceFolders()
          break

        default:
          result = {
            content: [{ type: 'text', text: `Unknown tool: ${params.name}` }],
            isError: true,
          }
      }

      this.sendResponse(ws, id, result)
    } catch (error) {
      this.sendResponse(ws, id, {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true,
      })
    }
  }

  private async toolReadFile(params: { path: string }): Promise<MCPToolResult> {
    try {
      const uri = vscode.Uri.file(params.path)
      const content = await vscode.workspace.fs.readFile(uri)
      return {
        content: [{ type: 'text', text: Buffer.from(content).toString('utf8') }],
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to read file: ${error}` }],
        isError: true,
      }
    }
  }

  private async toolWriteFile(params: { path: string; content: string }): Promise<MCPToolResult> {
    try {
      const uri = vscode.Uri.file(params.path)
      await vscode.workspace.fs.writeFile(uri, Buffer.from(params.content, 'utf8'))
      return {
        content: [{ type: 'text', text: 'File written successfully' }],
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to write file: ${error}` }],
        isError: true,
      }
    }
  }

  private async toolGetDiagnostics(params: { path: string }): Promise<MCPToolResult> {
    const uri = vscode.Uri.file(params.path)
    const diagnostics = vscode.languages.getDiagnostics(uri)

    const result = diagnostics.map((d) => ({
      message: d.message,
      severity: vscode.DiagnosticSeverity[d.severity],
      range: {
        start: { line: d.range.start.line, character: d.range.start.character },
        end: { line: d.range.end.line, character: d.range.end.character },
      },
      source: d.source,
    }))

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }

  private async toolGetSelection(): Promise<MCPToolResult> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return {
        content: [{ type: 'text', text: 'No active editor' }],
        isError: true,
      }
    }

    const selection = editor.selection
    const text = editor.document.getText(selection)
    const filePath = editor.document.uri.fsPath
    const line = selection.active.line

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          text,
          file: filePath,
          line,
          startLine: selection.start.line,
          endLine: selection.end.line,
        }),
      }],
    }
  }

  private async toolOpenFile(params: { path: string; line?: number }): Promise<MCPToolResult> {
    try {
      const uri = vscode.Uri.file(params.path)
      const document = await vscode.workspace.openTextDocument(uri)
      const editor = await vscode.window.showTextDocument(document)

      if (params.line !== undefined) {
        const line = Math.max(0, Math.min(params.line, document.lineCount - 1))
        const position = new vscode.Position(line, 0)
        editor.selection = new vscode.Selection(position, position)
        editor.revealRange(new vscode.Range(position, position))
      }

      return {
        content: [{ type: 'text', text: 'File opened successfully' }],
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to open file: ${error}` }],
        isError: true,
      }
    }
  }

  private async toolSaveFile(): Promise<MCPToolResult> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return {
        content: [{ type: 'text', text: 'No active editor' }],
        isError: true,
      }
    }

    await editor.document.save()
    return {
      content: [{ type: 'text', text: 'File saved successfully' }],
    }
  }

  private async toolListFiles(params: { path: string }): Promise<MCPToolResult> {
    try {
      const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(params.path))
      const result = files.map(([name, type]) => ({
        name,
        type: type === vscode.FileType.Directory ? 'directory' : 'file',
      }))

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to list files: ${error}` }],
        isError: true,
      }
    }
  }

  private async toolGetWorkspaceFolders(): Promise<MCPToolResult> {
    const folders = vscode.workspace.workspaceFolders || []
    const result = folders.map((f) => ({
      name: f.name,
      path: f.uri.fsPath,
    }))

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }

  // ─── Response Sending ─────────────────────────────────────────────────────────

  private sendResponse(ws: WebSocket, id: string, result: MCPToolResult): void {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id,
      result,
    }))
  }

  private sendToolsList(ws: WebSocket, id?: string): void {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: id || 'tools-list',
      result: {
        tools: IDE_TOOLS,
      },
    }))
  }

  private sendError(ws: WebSocket, id: string, message: string): void {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message,
      },
    }))
  }

  // ─── Lockfile ─────────────────────────────────────────────────────────────────

  private writeLockfile(): void {
    const ideDir = path.join(os.homedir(), '.claude', 'ide')
    fs.mkdirSync(ideDir, { recursive: true })

    const lockfile: IdeLockfile = {
      workspaceFolders: vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) || [],
      pid: process.pid,
      ideName: 'VS Code',
      transport: 'ws',
      runningInWindows: process.platform === 'win32',
      authToken: this.authToken,
      mcpPort: this.port,
    }

    this.lockfilePath = path.join(ideDir, `${this.port}.lock`)
    fs.writeFileSync(this.lockfilePath, JSON.stringify(lockfile, null, 2))
  }

  private removeLockfile(): void {
    if (this.lockfilePath && fs.existsSync(this.lockfilePath)) {
      fs.unlinkSync(this.lockfilePath)
      this.lockfilePath = null
    }
  }
}
