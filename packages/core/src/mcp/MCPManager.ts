import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { toolRegistry, type ToolRegistry } from '../tools/registry.js'
import type {
  MCPServerConfig,
  MCPServerRegistration,
  MCPServerRecord,
  MCPServerStatus,
  MCPToolDefinition,
} from './types.js'

interface MCPConnectionHandle {
  listTools(): Promise<MCPToolDefinition[]>
  callTool(name: string, args: unknown): Promise<ToolResult>
  close(): Promise<void>
}

export interface MCPManagerOptions {
  now?: () => number
  toolRegistry?: Pick<ToolRegistry, 'register' | 'unregister' | 'has'>
  syncToolsToRegistry?: boolean
  connectionFactory?: (record: MCPServerRecord) => Promise<MCPConnectionHandle>
}

export class MCPManager {
  private readonly servers = new Map<string, MCPServerRecord>()
  private readonly now: () => number
  private readonly toolRegistry?: Pick<ToolRegistry, 'register' | 'unregister' | 'has'>
  private readonly syncToolsToRegistry: boolean
  private readonly connectionFactory: (record: MCPServerRecord) => Promise<MCPConnectionHandle>
  private readonly connections = new Map<string, {
    handle: MCPConnectionHandle
    registeredToolNames: string[]
  }>()

  constructor(options: MCPManagerOptions = {}) {
    this.now = options.now ?? (() => Date.now())
    this.toolRegistry = options.toolRegistry
    this.syncToolsToRegistry = options.syncToolsToRegistry ?? false
    this.connectionFactory = options.connectionFactory ?? ((record) => this.createConnection(record))
  }

  registerServer(registration: MCPServerRegistration): MCPServerRecord {
    if (this.servers.has(registration.name)) {
      throw new Error(`MCP server "${registration.name}" already exists`)
    }

    this.validateServerConfig(registration.config)

    const record: MCPServerRecord = {
      name: registration.name,
      config: registration.config,
      status: 'registered',
      tools: (registration.tools ?? []).map((tool) => ({
        ...tool,
        registeredName: this.buildRegisteredToolName(registration.name, tool.name),
      })),
      updatedAt: this.now(),
    }

    this.servers.set(record.name, record)
    return record
  }

  async removeServer(name: string): Promise<boolean> {
    if (!this.servers.has(name)) {
      return false
    }

    await this.disconnectServer(name)
    return this.servers.delete(name)
  }

  getServer(name: string): MCPServerRecord | undefined {
    return this.servers.get(name)
  }

  listServers(): MCPServerRecord[] {
    return Array.from(this.servers.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  setServerStatus(name: string, status: MCPServerStatus, lastError?: string): MCPServerRecord {
    const record = this.servers.get(name)
    if (!record) {
      throw new Error(`MCP server "${name}" not found`)
    }

    const nextRecord: MCPServerRecord = {
      ...record,
      status,
      lastError,
      updatedAt: this.now(),
    }

    this.servers.set(name, nextRecord)
    return nextRecord
  }

  setServerTools(name: string, tools: MCPToolDefinition[]): MCPServerRecord {
    const record = this.servers.get(name)
    if (!record) {
      throw new Error(`MCP server "${name}" not found`)
    }

    const nextRecord: MCPServerRecord = {
      ...record,
      tools,
      updatedAt: this.now(),
    }

    this.servers.set(name, nextRecord)
    return nextRecord
  }

  validateServerConfig(config: MCPServerConfig): void {
    if (config.type === 'stdio') {
      if (!config.command?.trim()) {
        throw new Error('stdio MCP server requires a non-empty command')
      }

      if (config.url) {
        throw new Error('stdio MCP server must not define url')
      }
    } else if (config.type === 'sse') {
      if (!config.url?.trim()) {
        throw new Error('sse MCP server requires a non-empty url')
      }
      if (config.command) {
        throw new Error('sse MCP server must not define command')
      }
      try {
        new URL(config.url)
      } catch {
        throw new Error('sse MCP server requires a valid url')
      }
    } else {
      throw new Error(`Unsupported MCP transport type: ${config.type}`)
    }

    if (config.namespace !== undefined && !config.namespace.trim()) {
      throw new Error('MCP server namespace must not be empty')
    }

    if (config.allowedTools && config.blockedTools) {
      const overlap = config.allowedTools.filter((tool) => config.blockedTools?.includes(tool))
      if (overlap.length > 0) {
        throw new Error(`MCP server tool policy overlaps on: ${overlap.join(', ')}`)
      }
    }
  }

  async connectServer(name: string): Promise<MCPServerRecord> {
    const record = this.servers.get(name)
    if (!record) {
      throw new Error(`MCP server "${name}" not found`)
    }

    if (record.status === 'connected') {
      return record
    }

    this.setServerStatus(name, 'connecting')

    try {
      const handle = await this.connectionFactory(record)
      const tools = (await handle.listTools())
        .filter((tool) => this.isToolAllowed(record.config, tool.name))
        .map((tool) => ({
        ...tool,
        registeredName: this.buildRegisteredToolName(name, tool.name),
      }))

      this.connections.set(name, {
        handle,
        registeredToolNames: [],
      })
      this.setServerTools(name, tools)

      if (this.shouldSyncToolsToRegistry(record.config)) {
        this.syncServerToolsToRegistry(name, tools)
      }

      return this.setServerStatus(name, 'connected')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.cleanupConnection(name)
      this.setServerTools(name, [])
      return this.setServerStatus(name, 'failed', message)
    }
  }

  async disconnectServer(name: string): Promise<MCPServerRecord> {
    const record = this.servers.get(name)
    if (!record) {
      throw new Error(`MCP server "${name}" not found`)
    }

    await this.cleanupConnection(name)
    this.setServerTools(name, [])
    return this.setServerStatus(name, 'disconnected')
  }

  async callTool(serverName: string, toolName: string, args: unknown): Promise<ToolResult> {
    const connection = this.connections.get(serverName)
    if (!connection) {
      throw new Error(`MCP server "${serverName}" is not connected`)
    }

    const record = this.servers.get(serverName)
    if (!record) {
      throw new Error(`MCP server "${serverName}" not found`)
    }

    if (!record.tools.some((tool) => tool.name === toolName)) {
      throw new Error(`MCP tool "${toolName}" is not allowed for server "${serverName}"`)
    }

    return await connection.handle.callTool(toolName, args)
  }

  private async createConnection(record: MCPServerRecord): Promise<MCPConnectionHandle> {
    this.validateServerConfig(record.config)

    const transport =
      record.config.type === 'stdio'
        ? new StdioClientTransport({
            command: record.config.command as string,
            args: record.config.args,
            cwd: record.config.cwd,
            env: (record.config.env ?? process.env) as Record<string, string>,
            stderr: 'pipe',
          })
        : record.config.type === 'sse'
          ? new SSEClientTransport(new URL(record.config.url as string), {
              requestInit: {
                headers: record.config.headers,
              },
              fetch: globalThis.fetch,
            })
          : (() => {
              throw new Error(`Unsupported MCP transport type: ${record.config.type}`)
            })()

    const client = new Client(
      {
        name: 'cclocal',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    )

    await client.connect(transport)

    return {
      listTools: async () => {
        const result = await client.listTools()
        return result.tools.map((tool) => ({
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema,
        }))
      },
      callTool: async (toolName, args) => {
        const result = await client.callTool({
          name: toolName,
          arguments: (args && typeof args === 'object') ? args as Record<string, unknown> : {},
        }, CallToolResultSchema)

        if ('isError' in result && result.isError) {
          return {
            content: this.formatToolResultContent(result.content),
            is_error: true,
          }
        }

        return {
          content: this.formatToolResultContent(result.content),
        }
      },
      close: async () => {
        await transport.close()
      },
    }
  }

  private syncServerToolsToRegistry(serverName: string, tools: MCPToolDefinition[]): void {
    if (!this.toolRegistry) {
      return
    }

    const connection = this.connections.get(serverName)
    if (!connection) {
      return
    }

    for (const toolName of connection.registeredToolNames) {
      this.toolRegistry.unregister(toolName)
    }

    const nextRegisteredToolNames: string[] = []

    for (const toolDefinition of tools) {
      const registeredName = toolDefinition.registeredName || this.buildRegisteredToolName(serverName, toolDefinition.name)
      const wrappedTool: Tool = {
        name: registeredName,
        description: `[MCP:${serverName}] ${toolDefinition.description || toolDefinition.name}`,
        input_schema: {
          type: 'object',
          properties: toolDefinition.inputSchema,
        },
        execute: async (input: unknown, _context: ToolContext) => {
          return await this.callTool(serverName, toolDefinition.name, input)
        },
      }

      this.toolRegistry.register(wrappedTool)
      nextRegisteredToolNames.push(registeredName)
    }

    connection.registeredToolNames = nextRegisteredToolNames
  }

  private async cleanupConnection(name: string): Promise<void> {
    const connection = this.connections.get(name)
    if (!connection) {
      return
    }

    if (this.toolRegistry) {
      for (const toolName of connection.registeredToolNames) {
        this.toolRegistry.unregister(toolName)
      }
    }

    await connection.handle.close()
    this.connections.delete(name)
  }

  private buildRegisteredToolName(serverName: string, toolName: string): string {
    const record = this.servers.get(serverName)
    const namespace = record?.config.namespace || serverName
    return `mcp__${this.sanitizeName(namespace)}__${this.sanitizeName(toolName)}`
  }

  private sanitizeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]+/g, '_')
  }

  private isToolAllowed(config: MCPServerConfig, toolName: string): boolean {
    if (config.allowedTools && !config.allowedTools.includes(toolName)) {
      return false
    }

    if (config.blockedTools?.includes(toolName)) {
      return false
    }

    return true
  }

  private shouldSyncToolsToRegistry(config: MCPServerConfig): boolean {
    if (config.syncToolsToRegistry === false) {
      return false
    }

    return this.syncToolsToRegistry
  }

  private formatToolResultContent(content: unknown): string {
    if (!Array.isArray(content)) {
      return JSON.stringify(content ?? '')
    }

    return content
      .map((block) => {
        if (block && typeof block === 'object' && 'text' in block && typeof block.text === 'string') {
          return block.text
        }
        return JSON.stringify(block)
      })
      .join('\n')
  }
}

export const mcpManager = new MCPManager({
  toolRegistry,
  syncToolsToRegistry: true,
})
