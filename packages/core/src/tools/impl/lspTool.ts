/**
 * LSP Tool - Language Server Protocol operations
 *
 * Provides code intelligence through LSP servers:
 * - goToDefinition: Find where a symbol is defined
 * - findReferences: Find all references to a symbol
 * - hover: Get type/documentation info for a symbol
 * - documentSymbol: List all symbols in a document
 * - workspaceSymbol: Search for symbols across the workspace
 *
 * This is a native core implementation that connects to LSP servers
 * via stdio transport using the vscode-languageclient protocol.
 */

import { spawn, type ChildProcess } from 'child_process'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

/** Map of language IDs to LSP server commands */
const LANGUAGE_SERVERS: Record<string, string[]> = {
  typescript: ['typescript-language-server', '--stdio'],
  javascript: ['typescript-language-server', '--stdio'],
  typescriptreact: ['typescript-language-server', '--stdio'],
  javascriptreact: ['typescript-language-server', '--stdio'],
  python: ['pylsp', '--stdio'],
  rust: ['rust-analyzer'],
  go: ['gopls'],
}

/** Detect language ID from file extension */
function getLanguageId(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const mapping: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    rs: 'rust',
    go: 'go',
  }
  return ext ? mapping[ext] ?? null : null
}

/** Minimal LSP client — sends JSON-RPC over stdio */
class LSPClient {
  private proc: ChildProcess | null = null
  private requestId = 0
  private pending = new Map<number, { resolve: (value: any) => void; reject: (err: Error) => void }>()
  private buffer = ''
  private initialized = false

  async start(command: string[], cwd: string): Promise<void> {
    this.proc = spawn(command[0], command.slice(1), {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.proc.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString()
      this.processBuffer()
    })

    this.proc.stderr?.on('data', () => {
      // Ignore LSP server stderr
    })

    // Initialize
    const rootUri = `file://${cwd.replace(/\\/g, '/')}`
    const result = await this.sendRequest('initialize', {
      processId: process.pid,
      rootUri,
      capabilities: {
        textDocument: {
          definition: { dynamicRegistration: false },
          references: { dynamicRegistration: false },
          hover: { dynamicRegistration: false, contentFormat: ['plaintext', 'markdown'] },
          documentSymbol: { dynamicRegistration: false },
        },
        workspace: {
          symbol: { dynamicRegistration: false },
        },
      },
    })

    if (result) {
      await this.sendNotification('initialized', {})
      this.initialized = true
    }
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.proc?.stdin) {
        reject(new Error('LSP server not running'))
        return
      }

      const id = ++this.requestId
      this.pending.set(id, { resolve, reject })

      const message = JSON.stringify({ jsonrpc: '2.0', id, method, params })
      const header = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n`

      this.proc.stdin.write(header + message)
    })
  }

  private sendNotification(method: string, params: any): void {
    if (!this.proc?.stdin) return

    const message = JSON.stringify({ jsonrpc: '2.0', method, params })
    const header = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n`

    this.proc.stdin.write(header + message)
  }

  private processBuffer(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) break

      const header = this.buffer.slice(0, headerEnd)
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i)
      if (!contentLengthMatch) break

      const contentLength = parseInt(contentLengthMatch[1], 10)
      const bodyStart = headerEnd + 4
      if (this.buffer.length < bodyStart + contentLength) break

      const body = this.buffer.slice(bodyStart, bodyStart + contentLength)
      this.buffer = this.buffer.slice(bodyStart + contentLength)

      try {
        const msg = JSON.parse(body)
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!
          this.pending.delete(msg.id)
          if (msg.error) {
            reject(new Error(msg.error.message || 'LSP error'))
          } else {
            resolve(msg.result)
          }
        }
      } catch {
        // Ignore parse errors for notifications
      }
    }
  }

  async goToDefinition(filePath: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri: `file://${filePath.replace(/\\/g, '/')}` },
      position: { line: line - 1, character: character - 1 },
    })
  }

  async findReferences(filePath: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/references', {
      textDocument: { uri: `file://${filePath.replace(/\\/g, '/')}` },
      position: { line: line - 1, character: character - 1 },
      context: { includeDeclaration: true },
    })
  }

  async hover(filePath: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri: `file://${filePath.replace(/\\/g, '/')}` },
      position: { line: line - 1, character: character - 1 },
    })
  }

  async documentSymbol(filePath: string): Promise<any> {
    return this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri: `file://${filePath.replace(/\\/g, '/')}` },
    })
  }

  async workspaceSymbol(query: string): Promise<any> {
    return this.sendRequest('workspace/symbol', { query })
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      await this.sendRequest('shutdown', null)
      this.sendNotification('exit', {})
    }
    this.proc?.kill()
    this.proc = null
    this.initialized = false
  }
}

/** Format LSP Location to readable string */
function formatLocation(loc: any): string {
  if (!loc) return 'No results'
  if (Array.isArray(loc)) return loc.map(formatLocation).join('\n')
  if (loc.uri) {
    const path = loc.uri.replace('file://', '')
    const range = loc.range
    const line = range?.start?.line !== undefined ? range.start.line + 1 : '?'
    const char = range?.start?.character !== undefined ? range.start.character + 1 : '?'
    return `${path}:${line}:${char}`
  }
  return JSON.stringify(loc)
}

/** Format hover result */
function formatHover(result: any): string {
  if (!result) return 'No hover information available'
  if (typeof result === 'string') return result
  const contents = result.contents
  if (typeof contents === 'string') return contents
  if (Array.isArray(contents)) {
    return contents
      .map((c: any) => (typeof c === 'string' ? c : c.value ?? JSON.stringify(c)))
      .join('\n\n')
  }
  if (contents?.value) return contents.value
  return JSON.stringify(contents)
}

/** Format document symbols */
function formatDocumentSymbols(symbols: any[], indent = 0): string {
  if (!Array.isArray(symbols)) return 'No symbols found'
  const prefix = '  '.repeat(indent)
  const kindNames = ['File', 'Module', 'Namespace', 'Package', 'Class', 'Method', 'Property',
    'Field', 'Constructor', 'Enum', 'Interface', 'Function', 'Variable', 'Constant',
    'String', 'Number', 'Boolean', 'Array', 'Object', 'Key', 'Null', 'EnumMember',
    'Struct', 'Event', 'Operator', 'TypeParameter']
  return symbols
    .map((s) => {
      const kind = kindNames[s.kind - 1] ?? 'Unknown'
      const line = s.range?.start?.line !== undefined ? s.range.start.line + 1 : '?'
      let result = `${prefix}${s.name} (${kind}) :${line}`
      if (s.children?.length) {
        result += '\n' + formatDocumentSymbols(s.children, indent + 1)
      }
      return result
    })
    .join('\n')
}

// Cache LSP clients per language + cwd
const clientCache = new Map<string, LSPClient>()

async function getClient(filePath: string, cwd: string): Promise<LSPClient | null> {
  const langId = getLanguageId(filePath)
  if (!langId) return null

  const serverCmd = LANGUAGE_SERVERS[langId]
  if (!serverCmd) return null

  const key = `${langId}:${cwd}`
  let client = clientCache.get(key)
  if (client) return client

  client = new LSPClient()
  try {
    await client.start(serverCmd, cwd)
    clientCache.set(key, client)
    return client
  } catch {
    return null
  }
}

// ---- LSP Tool ----

export interface LSPInput {
  operation: string
  file_path: string
  line?: number
  character?: number
  query?: string
}

export const lspTool: Tool = {
  name: 'lsp',
  description:
    'Language Server Protocol operations for code intelligence. Supports: goToDefinition, findReferences, hover, documentSymbol, workspaceSymbol.',
  input_schema: {
    type: 'object' as const,
    properties: {
      operation: {
        type: 'string',
        description: 'The LSP operation: goToDefinition, findReferences, hover, documentSymbol, workspaceSymbol',
        enum: ['goToDefinition', 'findReferences', 'hover', 'documentSymbol', 'workspaceSymbol'],
      },
      file_path: {
        type: 'string',
        description: 'Absolute path to the file.',
      },
      line: { type: 'number', description: 'Line number (1-indexed).' },
      character: { type: 'number', description: 'Character offset (1-indexed).' },
      query: { type: 'string', description: 'Search query for workspaceSymbol.' },
    },
    required: ['operation', 'file_path'],
  },

  async execute(input: LSPInput, context: ToolContext): Promise<ToolResult> {
    const { operation, file_path, line, character, query } = input
    const cwd = context.cwd || process.cwd()

    const client = await getClient(file_path, cwd)
    if (!client) {
      const langId = getLanguageId(file_path)
      if (!langId) {
        return {
          content: `[LSP] Unsupported file type: ${file_path}`,
          is_error: true,
        }
      }
      return {
        content: `[LSP] No language server configured for ${langId}. Install ${LANGUAGE_SERVERS[langId]?.[0] ?? 'a compatible server'} to enable LSP features.`,
        is_error: true,
      }
    }

    try {
      switch (operation) {
        case 'goToDefinition': {
          if (!line || !character) {
            return { content: '[LSP] goToDefinition requires line and character', is_error: true }
          }
          const result = await client.goToDefinition(file_path, line, character)
          return { content: formatLocation(result) }
        }
        case 'findReferences': {
          if (!line || !character) {
            return { content: '[LSP] findReferences requires line and character', is_error: true }
          }
          const result = await client.findReferences(file_path, line, character)
          return { content: formatLocation(result) }
        }
        case 'hover': {
          if (!line || !character) {
            return { content: '[LSP] hover requires line and character', is_error: true }
          }
          const result = await client.hover(file_path, line, character)
          return { content: formatHover(result) }
        }
        case 'documentSymbol': {
          const result = await client.documentSymbol(file_path)
          return { content: formatDocumentSymbols(result) }
        }
        case 'workspaceSymbol': {
          if (!query) {
            return { content: '[LSP] workspaceSymbol requires a query', is_error: true }
          }
          const result = await client.workspaceSymbol(query)
          if (!Array.isArray(result) || result.length === 0) {
            return { content: `[LSP] No symbols matching "${query}"` }
          }
          return { content: result.map((s: any) => `${s.name} (${s.kind}) — ${formatLocation(s.location)}`).join('\n') }
        }
        default:
          return { content: `[LSP] Unknown operation: ${operation}`, is_error: true }
      }
    } catch (error) {
      return {
        content: `[LSP] ${operation} failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}

/**
 * Shutdown all cached LSP clients (call on session exit).
 */
export async function shutdownAllLSPClients(): Promise<void> {
  for (const [key, client] of clientCache.entries()) {
    await client.shutdown()
    clientCache.delete(key)
  }
}
