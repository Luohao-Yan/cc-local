import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js'
import { CallToolResultSchema, ResourceUpdatedNotificationSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { toolRegistry, type ToolRegistry, type DeferredTool } from '../tools/registry.js'
import type {
  MCPServerConfig,
  MCPServerRegistration,
  MCPServerRecord,
  MCPResourceDefinition,
  MCPServerStatus,
  MCPToolDefinition,
} from './types.js'

interface MCPConnectionHandle {
  listTools(): Promise<MCPToolDefinition[]>
  callTool(name: string, args: unknown): Promise<ToolResult>
  listResources?(): Promise<MCPResourceDefinition[]>
  readResource?(uri: string): Promise<ToolResult>
  subscribeResource?(uri: string): Promise<void>
  unsubscribeResource?(uri: string): Promise<void>
  close(): Promise<void>
}

export interface MCPManagerOptions {
  now?: () => number
  toolRegistry?: Pick<ToolRegistry, 'register' | 'unregister' | 'has' | 'registerMcpTools'>
  syncToolsToRegistry?: boolean
  connectionFactory?: (record: MCPServerRecord) => Promise<MCPConnectionHandle>
}

export class MCPManager {
  private readonly servers = new Map<string, MCPServerRecord>()
  private readonly now: () => number
  private readonly toolRegistry?: Pick<ToolRegistry, 'register' | 'unregister' | 'has' | 'registerMcpTools'>
  private readonly syncToolsToRegistry: boolean
  private readonly connectionFactory: (record: MCPServerRecord) => Promise<MCPConnectionHandle>
  private readonly connections = new Map<string, {
    handle: MCPConnectionHandle
    registeredToolNames: string[]
  }>()
  /** Deduplicates concurrent connectServer calls for the same server name. */
  private readonly pendingConnections = new Map<string, Promise<MCPServerRecord>>()

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

    // Enterprise control enforcement
    if (!this.isServerNameAllowed(registration.name)) {
      throw new Error(`MCP server "${registration.name}" is blocked by enterprise policy`)
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
    } else if (config.type === 'sse' || config.type === 'http' || config.type === 'ws') {
      if (!config.url?.trim()) {
        throw new Error(`${config.type} MCP server requires a non-empty url`)
      }
      if (config.command) {
        throw new Error(`${config.type} MCP server must not define command`)
      }
      try {
        new URL(config.url)
      } catch {
        throw new Error(`${config.type} MCP server requires a valid url`)
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

    // Deduplicate: if another call already connecting this server, reuse its promise
    const pending = this.pendingConnections.get(name)
    if (pending) {
      return pending
    }

    const promise = this._doConnectServer(name).finally(() => {
      this.pendingConnections.delete(name)
    })
    this.pendingConnections.set(name, promise)
    return promise
  }

  private async _doConnectServer(name: string): Promise<MCPServerRecord> {
    this.setServerStatus(name, 'connecting')

    try {
      const record = this.servers.get(name)!
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

    const MCP_TOOL_TIMEOUT_MS = 120_000 // 2 minutes

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`MCP tool "${toolName}" on server "${serverName}" timed out after ${MCP_TOOL_TIMEOUT_MS / 1000}s`)), MCP_TOOL_TIMEOUT_MS)
    })

    try {
      const result = await Promise.race([
        connection.handle.callTool(toolName, args),
        timeoutPromise,
      ])
      return result
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }

  async listResources(serverName: string): Promise<MCPResourceDefinition[]> {
    const connection = this.connections.get(serverName)
    if (!connection) {
      throw new Error(`MCP server "${serverName}" is not connected`)
    }
    if (!connection.handle.listResources) {
      return []
    }
    return await connection.handle.listResources()
  }

  async readResource(serverName: string, uri: string): Promise<ToolResult> {
    const connection = this.connections.get(serverName)
    if (!connection) {
      throw new Error(`MCP server "${serverName}" is not connected`)
    }
    if (!connection.handle.readResource) {
      throw new Error(`MCP server "${serverName}" does not support resources`)
    }
    return await connection.handle.readResource(uri)
  }

  // ---- Resource Subscription ----

  /** Track subscribed URIs per server */
  private readonly subscribedUris = new Map<string, Set<string>>()

  /** Callback when a resource is updated */
  onResourceUpdate?: (serverName: string, uri: string) => void

  /**
   * Subscribe to resource change notifications from an MCP server.
   * Requires the server to support the `resources/subscribe` capability.
   */
  async subscribeResource(serverName: string, uri: string): Promise<void> {
    const connection = this.connections.get(serverName)
    if (!connection) {
      throw new Error(`MCP server "${serverName}" is not connected`)
    }
    if (!connection.handle.subscribeResource) {
      throw new Error(`MCP server "${serverName}" does not support resource subscriptions`)
    }

    // Deduplicate: skip if already subscribed
    const existing = this.subscribedUris.get(serverName)
    if (existing?.has(uri)) return

    await connection.handle.subscribeResource(uri)

    if (!this.subscribedUris.has(serverName)) {
      this.subscribedUris.set(serverName, new Set())
    }
    this.subscribedUris.get(serverName)!.add(uri)
  }

  /**
   * Unsubscribe from resource change notifications.
   */
  async unsubscribeResource(serverName: string, uri: string): Promise<void> {
    const connection = this.connections.get(serverName)
    if (!connection) return

    if (connection.handle.unsubscribeResource) {
      await connection.handle.unsubscribeResource(uri)
    }

    this.subscribedUris.get(serverName)?.delete(uri)
  }

  /**
   * Get all currently subscribed URIs for a server.
   */
  getSubscribedUris(serverName: string): string[] {
    return Array.from(this.subscribedUris.get(serverName) ?? [])
  }

  // ---- Enterprise Controls ----

  /** Allowed MCP servers (whitelist). If set, only these servers can be registered. */
  allowedMcpServers?: Set<string>

  /** Denied MCP servers (blacklist). These servers cannot be registered or connected. */
  deniedMcpServers?: Set<string>

  /** If true, only servers from managed settings are allowed. User-configured servers are blocked. */
  strictMcpServersOnly = false

  /**
   * Configure enterprise controls for MCP server access.
   */
  setEnterpriseControls(options: {
    allowedMcpServers?: string[]
    deniedMcpServers?: string[]
    strictMcpServersOnly?: boolean
  }): void {
    if (options.allowedMcpServers) {
      this.allowedMcpServers = new Set(options.allowedMcpServers)
    }
    if (options.deniedMcpServers) {
      this.deniedMcpServers = new Set(options.deniedMcpServers)
    }
    if (options.strictMcpServersOnly !== undefined) {
      this.strictMcpServersOnly = options.strictMcpServersOnly
    }
  }

  /**
   * Check if a server name is allowed under current enterprise controls.
   */
  isServerNameAllowed(name: string): boolean {
    // Deny list takes precedence
    if (this.deniedMcpServers?.has(name)) return false

    // Allow list: if set, only allow listed servers
    if (this.allowedMcpServers && !this.allowedMcpServers.has(name)) return false

    return true
  }

  private async createConnection(record: MCPServerRecord): Promise<MCPConnectionHandle> {
    this.validateServerConfig(record.config)

    const transport =
      record.config.type === 'stdio'
        ? new StdioClientTransport({
            command: record.config.command as string,
            args: record.config.args,
            cwd: record.config.cwd,
            env: (record.config.env ?? {}) as Record<string, string>,
            stderr: 'pipe',
          })
        : record.config.type === 'sse'
          ? new SSEClientTransport(new URL(record.config.url as string), {
              requestInit: {
                headers: record.config.headers,
              },
              fetch: globalThis.fetch,
            })
          : record.config.type === 'http'
            ? new StreamableHTTPClientTransport(new URL(record.config.url as string), {
                requestInit: {
                  headers: record.config.headers,
                },
                fetch: globalThis.fetch,
              })
          : record.config.type === 'ws'
            ? new WebSocketClientTransport(new URL(record.config.url as string))
            : (() => {
                throw new Error(`Unsupported MCP transport type: ${record.config.type}`)
              })()

    // @ts-ignore
    const client = new Client(
      {
        name: 'cclocal',
        version: '1.0.0',
      },
      {
        capabilities: {
          // Declare capability to receive resource update notifications
          resources: {
            subscribe: true,
            listChanged: true,
          },
        },
      }
    )

    await client.connect(transport)

    // Register handler for resource update notifications
    try {
      client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
        const uri = notification.params?.uri
        if (uri) {
          this.onResourceUpdate?.(record.name, uri)
        }
      })
    } catch {
      // Server may not support resource notifications — ignore
    }

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
      listResources: async () => {
        const listResources = (client as unknown as {
          listResources?: () => Promise<{ resources?: Array<{ uri: string; name?: string; description?: string; mimeType?: string }> }>
        }).listResources
        if (!listResources) {
          return []
        }
        const result = await listResources.call(client)
        return (result.resources || []).map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        }))
      },
      readResource: async (uri) => {
        const request = (client as unknown as {
          request?: (request: unknown, schema: unknown) => Promise<{ contents?: unknown[] }>
        }).request
        if (!request) {
          throw new Error('MCP client does not support resource reads')
        }
        const result = await request.call(client, {
          method: 'resources/read',
          params: { uri },
        }, undefined)
        return {
          content: this.formatToolResultContent(result.contents || []),
        }
      },
      subscribeResource: async (uri) => {
        const subscribeResource = (client as unknown as {
          subscribeResource?: (params: { uri: string }) => Promise<unknown>
        }).subscribeResource
        if (subscribeResource) {
          await subscribeResource.call(client, { uri })
        }
      },
      unsubscribeResource: async (uri) => {
        const unsubscribeResource = (client as unknown as {
          unsubscribeResource?: (params: { uri: string }) => Promise<unknown>
        }).unsubscribeResource
        if (unsubscribeResource) {
          await unsubscribeResource.call(client, { uri })
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

    const wrappedTools: Tool[] = tools.map((toolDefinition) => {
      const registeredName = toolDefinition.registeredName || this.buildRegisteredToolName(serverName, toolDefinition.name)
      return {
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
    })

    // Register MCP tools with defer=true so only schema is sent to API.
    // Full execute is loaded when ToolSearch promotes the tool.
    if ('registerMcpTools' in this.toolRegistry) {
      ;(this.toolRegistry as ToolRegistry).registerMcpTools(serverName, wrappedTools, true)
    } else {
      // Fallback for injected registries without registerMcpTools
      for (const tool of wrappedTools) {
        this.toolRegistry.register(tool)
      }
    }

    for (const toolDefinition of tools) {
      const registeredName = toolDefinition.registeredName || this.buildRegisteredToolName(serverName, toolDefinition.name)
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

function registerMcpCompatibilityTools(manager: MCPManager): void {
  if (!toolRegistry.has('mcp')) {
    toolRegistry.register({
      name: 'mcp',
      description: 'Call a tool on a connected MCP server by server and tool name.',
      input_schema: {
        type: 'object',
        properties: {
          server: { type: 'string', description: 'MCP server name.' },
          tool: { type: 'string', description: 'MCP tool name on that server.' },
          arguments: { type: 'object', description: 'Arguments to pass to the MCP tool.' },
        },
        required: ['server', 'tool'],
      },
      execute: async (input: unknown) => {
        const { server, tool, arguments: args = {} } = input as {
          server?: string
          tool?: string
          arguments?: unknown
        }
        if (!server || !tool) {
          return {
            content: 'Error: server and tool are required',
            is_error: true,
          }
        }
        try {
          return await manager.callTool(server, tool, args)
        } catch (error) {
          return {
            content: error instanceof Error ? error.message : String(error),
            is_error: true,
          }
        }
      },
    })
  }

  if (!toolRegistry.has('ReadMcpResourceTool')) {
    toolRegistry.register({
      name: 'ReadMcpResourceTool',
      description: 'Read a resource URI from a connected MCP server.',
      input_schema: {
        type: 'object',
        properties: {
          server: { type: 'string', description: 'MCP server name.' },
          uri: { type: 'string', description: 'Resource URI to read.' },
        },
        required: ['server', 'uri'],
      },
      execute: async (input: unknown) => {
        const { server, uri } = input as { server?: string; uri?: string }
        if (!server || !uri) {
          return {
            content: 'Error: server and uri are required',
            is_error: true,
          }
        }
        try {
          return await manager.readResource(server, uri)
        } catch (error) {
          return {
            content: error instanceof Error ? error.message : String(error),
            is_error: true,
          }
        }
      },
    })
  }
}

registerMcpCompatibilityTools(mcpManager)
