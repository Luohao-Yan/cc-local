/**
 * HTTP API 服务器
 * 基于 Bun 原生 HTTP 服务器
 */

import type { AuthManager } from '../auth/AuthManager.js'
import type { SessionManager } from '../sessions/SessionManager.js'
import type { WebSocketManager } from '../ws/WebSocketManager.js'
import type { MCPManager } from '@cclocal/core'
import {
  listHooks,
  registerHook,
  removeHook,
  executeHooks,
  getConfig,
  setConfig,
  listConfig,
  deleteConfig,
  decideToolPermission,
  filterToolsByPermission,
  type PermissionPolicy,
  type HookEvent,
  CompactionService,
  logEvent,
  logToolUsage,
  logQueryMetrics,
  toolRegistry,
} from '@cclocal/core'

type WebSocketData = { token: string }

interface ServerOptions {
  port: number
  host: string
  authManager: AuthManager
  sessionManager: SessionManager
  wsManager: WebSocketManager
  mcpManager: MCPManager
}

export class Server {
  private server?: ReturnType<typeof Bun.serve>
  private options: ServerOptions

  constructor(options: ServerOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    const { authManager, sessionManager, wsManager } = this.options

    this.server = Bun.serve<WebSocketData>({
      port: this.options.port,
      hostname: this.options.host,

      websocket: {
        open: (socket) => wsManager.onOpen(socket),
        message: (socket, message) => wsManager.onMessage(socket, message),
        close: (socket) => wsManager.onClose(socket),
      },

      fetch: async (request, server) => {
        const url = new URL(request.url)
        const origin = request.headers.get('Origin')

        // WebSocket 升级
        if (url.pathname === '/ws') {
          const token = url.searchParams.get('token')
          if (!token || !authManager.verifyToken(token)) {
            return new Response('Unauthorized', { status: 401 })
          }
          const success = server.upgrade(request, {
            data: { token },
          })
          if (success) {
            return undefined as any // WebSocket 已处理
          }
          return new Response('WebSocket upgrade failed', { status: 400 })
        }

        // CORS 处理
        if (request.method === 'OPTIONS') {
          if (!authManager.isOriginAllowed(origin)) {
            return this.errorResponse(403, 'origin_not_allowed', 'Origin is not allowed')
          }
          return new Response(null, {
            status: 204,
            headers: authManager.getCorsHeaders(
              origin,
              request.headers.get('Access-Control-Request-Headers')
            ),
          })
        }

        // API 路由
        try {
          if (origin && !authManager.isOriginAllowed(origin)) {
            return this.errorResponse(403, 'origin_not_allowed', 'Origin is not allowed')
          }

          const response = await this.handleRequest(request, url, authManager, sessionManager)

          // 添加 CORS 头
          const corsHeaders = authManager.getCorsHeaders(origin, request.headers.get('Access-Control-Request-Headers'))
          corsHeaders.forEach((value, key) => {
            response.headers.set(key, value)
          })
          return response
        } catch (error) {
          console.error('Request handler error:', error)
          return this.errorResponse(500, 'internal_server_error', 'Internal server error')
        }
      },
    })

    console.log(`   HTTP server listening on ${this.options.host}:${this.options.port}`)
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop()
      this.server = undefined
    }
  }

  get port(): number | undefined {
    return this.server?.port
  }

  private async handleRequest(
    request: Request,
    url: URL,
    authManager: AuthManager,
    sessionManager: SessionManager
  ): Promise<Response> {
    const pathname = url.pathname
    const method = request.method

    // 健康检查
    if (pathname === '/health' && method === 'GET') {
      return this.jsonResponse({ status: 'ok', version: '1.0.0' })
    }

    // API v1 路由
    if (pathname.startsWith('/api/v1/')) {
      // 验证认证
      const authResult = authManager.authenticateRequest(request.headers)
      if (!authResult.ok) {
        return this.errorResponse(401, authResult.code || 'unauthorized', authResult.message || 'Unauthorized')
      }

      const apiPath = pathname.replace('/api/v1/', '')

      // 会话管理 API
      if (apiPath === 'sessions' && method === 'POST') {
        return this.createSession(request, sessionManager)
      }

      if (apiPath === 'sessions' && method === 'GET') {
        return this.listSessions(sessionManager)
      }

      if (apiPath === 'query' && method === 'POST') {
        return this.queryWithoutPersistence(request, sessionManager)
      }

      if (apiPath.startsWith('sessions/')) {
        const parts = apiPath.replace('sessions/', '').split('/')
        const sessionId = parts[0]
        const action = parts[1]

        if (method === 'GET' && !action) {
          return this.getSession(sessionId, sessionManager)
        }

        if (method === 'POST' && action === 'messages') {
          return this.sendMessage(sessionId, request, sessionManager)
        }

        if (method === 'POST' && action === 'cancel') {
          return this.cancelGeneration(sessionId, sessionManager)
        }

        if (method === 'DELETE' && !action) {
          return this.deleteSession(sessionId, sessionManager)
        }

        if (method === 'POST' && action === 'fork') {
          return this.forkSession(sessionId, request, sessionManager)
        }
      }

      // 模型列表
      if (apiPath === 'models' && method === 'GET') {
        return this.listModels()
      }

      if (apiPath === 'mcp/servers' && method === 'GET') {
        return this.listMcpServers()
      }

      if (apiPath === 'mcp/servers' && method === 'POST') {
        return this.registerMcpServer(request)
      }

      if (apiPath.startsWith('mcp/servers/')) {
        const parts = apiPath.replace('mcp/servers/', '').split('/')
        const serverName = decodeURIComponent(parts[0] || '')
        const action = parts[1]
        if (method === 'GET' && !action) {
          return this.getMcpServer(serverName)
        }
        if (method === 'DELETE' && !action) {
          return this.deleteMcpServer(serverName)
        }
        if (method === 'POST' && action === 'connect') {
          return this.connectMcpServer(serverName)
        }
        if (method === 'POST' && action === 'disconnect') {
          return this.disconnectMcpServer(serverName)
        }
      }

      // 工具调用 API
      if (apiPath.startsWith('tools/') && method === 'POST') {
        const toolPath = apiPath.replace('tools/', '')
        const toolName = toolPath.split('/')[0]
        const action = toolPath.split('/')[1]
        if (action === 'execute') {
          return this.executeTool(toolName, request, sessionManager)
        }
      }

      // 文件操作 API
      if (apiPath.startsWith('files/')) {
        const action = apiPath.replace('files/', '')
        if (action === 'read' && method === 'POST') {
          return this.readFile(request, sessionManager)
        }
        if (action === 'write' && method === 'POST') {
          return this.writeFile(request, sessionManager)
        }
        if (action === 'edit' && method === 'POST') {
          return this.editFile(request, sessionManager)
        }
        if (action === 'search' && method === 'POST') {
          return this.searchFiles(request, sessionManager)
        }
      }

      // Hook Management API
      if (apiPath === 'hooks' && method === 'GET') {
        return this.listHooksEndpoint(url)
      }
      if (apiPath === 'hooks' && method === 'POST') {
        return this.registerHookEndpoint(request)
      }
      if (apiPath.startsWith('hooks/') && method === 'DELETE') {
        const parts = apiPath.replace('hooks/', '').split('/')
        const event = decodeURIComponent(parts[0] || '') as HookEvent
        const command = parts.slice(1).map(decodeURIComponent).join('/')
        return this.removeHookEndpoint(event, command)
      }
      if (apiPath === 'hooks/execute' && method === 'POST') {
        return this.executeHooksEndpoint(request)
      }

      // Config Management API
      if (apiPath === 'config' && method === 'GET') {
        return this.getConfigEndpoint(url)
      }
      if (apiPath === 'config' && method === 'PATCH') {
        return this.updateConfigEndpoint(request)
      }
      if (apiPath === 'config' && method === 'DELETE') {
        return this.deleteConfigEndpoint(url)
      }

      // Permission Policy API
      if (apiPath === 'permissions' && method === 'GET') {
        return this.getPermissionsEndpoint()
      }
      if (apiPath === 'permissions' && method === 'PATCH') {
        return this.updatePermissionsEndpoint(request)
      }
      if (apiPath === 'permissions/check' && method === 'POST') {
        return this.checkPermissionEndpoint(request)
      }

      // Session Compaction API
      if (apiPath.startsWith('sessions/') && apiPath.endsWith('/compact') && method === 'POST') {
        const sessionId = apiPath.replace('sessions/', '').replace('/compact', '')
        return this.compactSessionEndpoint(sessionId, request, sessionManager)
      }
      if (apiPath.startsWith('sessions/') && apiPath.endsWith('/compaction-status') && method === 'GET') {
        const sessionId = apiPath.replace('sessions/', '').replace('/compaction-status', '')
        return this.getCompactionStatusEndpoint(sessionId, sessionManager)
      }

      // Analytics API
      if (apiPath === 'analytics/events' && method === 'POST') {
        return this.logAnalyticsEventEndpoint(request)
      }
      if (apiPath === 'analytics/usage' && method === 'GET') {
        return this.getAnalyticsUsageEndpoint()
      }

      // Tool Registry API
      if (apiPath === 'tools' && method === 'GET') {
        return this.listToolsEndpoint()
      }

      // Auth Info API
      if (apiPath === 'auth/info' && method === 'GET') {
        return this.getAuthInfoEndpoint(authManager)
      }

      // 消息历史 API (moved here to avoid duplicate sessions/ block)
      if (apiPath.startsWith('sessions/')) {
        const parts = apiPath.replace('sessions/', '').split('/')
        const sessionId = parts[0]
        const action = parts[1]

        if (action === 'messages' && method === 'GET') {
          return this.getMessageHistory(sessionId, url, sessionManager)
        }

        if (method === 'PUT' && !action) {
          return this.updateSession(sessionId, request, sessionManager)
        }
      }
    }

    return this.errorResponse(404, 'not_found', 'Route not found')
  }

  private async createSession(
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const session = await sessionManager.createSession(body)
      return this.jsonResponse(session, 201)
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async listSessions(sessionManager: SessionManager): Promise<Response> {
    const sessions = sessionManager.getAllSessions()
    return this.jsonResponse(sessions)
  }

  private async getSession(
    sessionId: string,
    sessionManager: SessionManager
  ): Promise<Response> {
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      return this.errorResponse(404, 'session_not_found', 'Session not found')
    }
    return this.jsonResponse(session)
  }

  private async sendMessage(
    sessionId: string,
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const { content, options } = body

      // 启动 SSE 流
      const stream = new ReadableStream({
        start: (controller) => {
          sessionManager.sendMessageStream(sessionId, content, options, controller)
        },
        cancel: () => {
          sessionManager.cancelGeneration(sessionId)
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async cancelGeneration(
    sessionId: string,
    sessionManager: SessionManager
  ): Promise<Response> {
    await sessionManager.cancelGeneration(sessionId)
    return this.jsonResponse({ success: true })
  }

  private async deleteSession(
    sessionId: string,
    sessionManager: SessionManager
  ): Promise<Response> {
    sessionManager.deleteSession(sessionId)
    return this.jsonResponse({ success: true })
  }

  private async forkSession(
    sessionId: string,
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json().catch(() => ({}))
      const session = await sessionManager.cloneSession(sessionId, body)
      return this.jsonResponse(session, 201)
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async queryWithoutPersistence(
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json() as {
        content: string
        options?: Record<string, unknown>
        cwd?: string
        model?: string
      }

      const stream = new ReadableStream({
        start: (controller) => {
          sessionManager.sendEphemeralMessageStream(
            body.content,
            body.options || {},
            controller,
            {
              cwd: body.cwd,
              model: body.model,
            }
          )
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async listModels(): Promise<Response> {
    try {
      const configuredModels = await getConfig('models')
      if (Array.isArray(configuredModels)) {
        return this.jsonResponse(configuredModels)
      }
    } catch {
      // Fall through to defaults
    }
    const models = [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ]
    return this.jsonResponse(models)
  }

  private async listMcpServers(): Promise<Response> {
    return this.jsonResponse(this.options.mcpManager.listServers())
  }

  private async getMcpServer(serverName: string): Promise<Response> {
    const record = this.options.mcpManager.getServer(serverName)
    if (!record) {
      return this.errorResponse(404, 'mcp_server_not_found', 'MCP server not found')
    }

    return this.jsonResponse(record)
  }

  private async registerMcpServer(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        name: string
        config: {
          type: 'stdio' | 'sse' | 'http' | 'ws'
          command?: string
          args?: string[]
          cwd?: string
          url?: string
          env?: Record<string, string>
          headers?: Record<string, string>
          namespace?: string
          allowedTools?: string[]
          blockedTools?: string[]
          syncToolsToRegistry?: boolean
        }
        tools?: Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }>
      }

      if (!body?.name || !body?.config?.type) {
        return this.errorResponse(400, 'invalid_request', 'MCP server name and config.type are required')
      }

      const record = this.options.mcpManager.registerServer({
        name: body.name,
        config: body.config,
        tools: body.tools,
      })

      return this.jsonResponse(record, 201)
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async deleteMcpServer(serverName: string): Promise<Response> {
    const deleted = await this.options.mcpManager.removeServer(serverName)
    if (!deleted) {
      return this.errorResponse(404, 'mcp_server_not_found', 'MCP server not found')
    }
    return this.jsonResponse({ success: true })
  }

  private async connectMcpServer(serverName: string): Promise<Response> {
    try {
      const record = await this.options.mcpManager.connectServer(serverName)
      return this.jsonResponse(record)
    } catch (error) {
      return this.errorResponse(400, 'mcp_connect_failed', this.getErrorMessage(error))
    }
  }

  private async disconnectMcpServer(serverName: string): Promise<Response> {
    try {
      const record = await this.options.mcpManager.disconnectServer(serverName)
      return this.jsonResponse(record)
    } catch (error) {
      return this.errorResponse(400, 'mcp_disconnect_failed', this.getErrorMessage(error))
    }
  }

  // 更新会话
  private async updateSession(
    sessionId: string,
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const session = sessionManager.updateSession(sessionId, body)
      return this.jsonResponse(session)
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  // 获取消息历史
  private async getMessageHistory(
    sessionId: string,
    url: URL,
    sessionManager: SessionManager
  ): Promise<Response> {
    const limit = parseInt(url.searchParams.get('limit') || '100', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    const messages = sessionManager.getMessageHistory(sessionId, limit, offset)
    return this.jsonResponse(messages)
  }

  // 执行工具
  private async executeTool(
    toolName: string,
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const result = await sessionManager.executeTool(toolName, body)
      return this.jsonResponse(result)
    } catch (error) {
      return this.errorResponse(400, 'tool_execution_failed', this.getErrorMessage(error))
    }
  }

  // 读取文件
  private async readFile(
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const result = await sessionManager.executeTool('file_read', body)
      return this.jsonResponse(result)
    } catch (error) {
      return this.errorResponse(400, 'file_read_failed', this.getErrorMessage(error))
    }
  }

  // 写入文件
  private async writeFile(
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const result = await sessionManager.executeTool('file_write', body)
      return this.jsonResponse(result)
    } catch (error) {
      return this.errorResponse(400, 'file_write_failed', this.getErrorMessage(error))
    }
  }

  // 编辑文件
  private async editFile(
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const result = await sessionManager.executeTool('file_edit', body)
      return this.jsonResponse(result)
    } catch (error) {
      return this.errorResponse(400, 'file_edit_failed', this.getErrorMessage(error))
    }
  }

  // 搜索文件
  private async searchFiles(
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const { type = 'glob', ...params } = body

      const toolName = type === 'content' ? 'grep' : 'glob'
      const result = await sessionManager.executeTool(toolName, params)

      return this.jsonResponse(result)
    } catch (error) {
      return this.errorResponse(400, 'file_search_failed', this.getErrorMessage(error))
    }
  }

  private jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private errorResponse(status: number, code: string, message: string, details?: unknown): Response {
    return new Response(JSON.stringify({
      error: {
        code,
        message,
        details,
      },
    }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  // ---- Hook Management Handlers ----

  private async listHooksEndpoint(url: URL): Promise<Response> {
    const event = url.searchParams.get('event') as HookEvent | null
    const hooks = listHooks(event ?? undefined)
    return this.jsonResponse(hooks)
  }

  private async registerHookEndpoint(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        event: HookEvent
        command: string
        timeout?: number
        enabled?: boolean
      }
      if (!body.event || !body.command) {
        return this.errorResponse(400, 'invalid_request', 'event and command are required')
      }
      registerHook({
        event: body.event,
        command: body.command,
        timeout: body.timeout,
        enabled: body.enabled,
      })
      return this.jsonResponse({ success: true }, 201)
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async removeHookEndpoint(event: string, command: string): Promise<Response> {
    if (!event || !command) {
      return this.errorResponse(400, 'invalid_request', 'event and command are required')
    }
    const removed = removeHook(event as HookEvent, command)
    if (!removed) {
      return this.errorResponse(404, 'hook_not_found', 'Hook not found')
    }
    return this.jsonResponse({ success: true })
  }

  private async executeHooksEndpoint(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        event: HookEvent
        context?: { toolName?: string; input?: unknown; output?: unknown; sessionId?: string }
      }
      if (!body.event) {
        return this.errorResponse(400, 'invalid_request', 'event is required')
      }
      const results = await executeHooks(body.event, body.context ?? {})
      return this.jsonResponse(results)
    } catch (error) {
      return this.errorResponse(400, 'hook_execution_failed', this.getErrorMessage(error))
    }
  }

  // ---- Config Management Handlers ----

  private async getConfigEndpoint(url: URL): Promise<Response> {
    const key = url.searchParams.get('key')
    if (!key) {
      const config = await listConfig()
      return this.jsonResponse(config)
    }
    const value = await getConfig(key)
    if (value === undefined) {
      return this.errorResponse(404, 'config_not_found', `Key not found: ${key}`)
    }
    return this.jsonResponse({ key, value })
  }

  private async updateConfigEndpoint(request: Request): Promise<Response> {
    try {
      const body = await request.json() as Record<string, unknown>
      const results: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(body)) {
        await setConfig(key, String(value))
        results[key] = value
      }
      return this.jsonResponse({ success: true, updated: results })
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async deleteConfigEndpoint(url: URL): Promise<Response> {
    const key = url.searchParams.get('key')
    if (!key) {
      return this.errorResponse(400, 'invalid_request', 'key query parameter is required')
    }
    const deleted = await deleteConfig(key)
    if (!deleted) {
      return this.errorResponse(404, 'config_not_found', `Key not found: ${key}`)
    }
    return this.jsonResponse({ success: true, deleted: key })
  }

  // ---- Permission Policy Handlers ----

  private permissionPolicy: PermissionPolicy = {}

  private async getPermissionsEndpoint(): Promise<Response> {
    return this.jsonResponse(this.permissionPolicy)
  }

  private async updatePermissionsEndpoint(request: Request): Promise<Response> {
    try {
      const body = await request.json() as Partial<PermissionPolicy>
      this.permissionPolicy = { ...this.permissionPolicy, ...body }
      return this.jsonResponse(this.permissionPolicy)
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async checkPermissionEndpoint(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { toolName: string }
      if (!body.toolName) {
        return this.errorResponse(400, 'invalid_request', 'toolName is required')
      }
      const decision = decideToolPermission(body.toolName, this.permissionPolicy)
      return this.jsonResponse(decision)
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  // ---- Compaction Handlers ----

  private async compactSessionEndpoint(
    sessionId: string,
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      return this.errorResponse(404, 'session_not_found', 'Session not found')
    }
    try {
      const body = await request.json().catch(() => ({})) as { summaryText?: string }
      const compaction = new CompactionService()
      if (!compaction.needsCompaction(session.messages)) {
        return this.jsonResponse({ compacted: false, reason: 'below_threshold' })
      }
      const summaryText = body.summaryText ?? 'Context was auto-compacted.'
      const compacted = compaction.compact(session.messages, summaryText)
      sessionManager.updateSession(sessionId, { messages: compacted })
      return this.jsonResponse({
        compacted: true,
        before: session.messages.length,
        after: compacted.length,
        estimatedTokens: compaction.estimateTokens(compacted),
      })
    } catch (error) {
      return this.errorResponse(400, 'compaction_failed', this.getErrorMessage(error))
    }
  }

  private async getCompactionStatusEndpoint(
    sessionId: string,
    sessionManager: SessionManager
  ): Promise<Response> {
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      return this.errorResponse(404, 'session_not_found', 'Session not found')
    }
    const compaction = new CompactionService()
    const estimatedTokens = compaction.estimateTokens(session.messages)
    return this.jsonResponse({
      estimatedTokens,
      maxTokens: 180_000,
      needsCompaction: compaction.needsCompaction(session.messages),
      messageCount: session.messages.length,
    })
  }

  // ---- Analytics Handlers ----

  private async logAnalyticsEventEndpoint(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        name: string
        properties?: Record<string, unknown>
        sessionId?: string
      }
      if (!body.name) {
        return this.errorResponse(400, 'invalid_request', 'name is required')
      }
      await logEvent({
        name: body.name,
        properties: body.properties,
        sessionId: body.sessionId,
      })
      return this.jsonResponse({ success: true })
    } catch (error) {
      return this.errorResponse(400, 'invalid_request', this.getErrorMessage(error))
    }
  }

  private async getAnalyticsUsageEndpoint(): Promise<Response> {
    try {
      const { readFileSync, existsSync } = await import('fs')
      const { join } = await import('path')
      const { homedir } = await import('os')
      const eventsFile = join(homedir(), '.cclocal', 'analytics', 'events.jsonl')
      if (!existsSync(eventsFile)) {
        return this.jsonResponse({ events: [], total: 0 })
      }
      const lines = readFileSync(eventsFile, 'utf-8').trim().split('\n').filter(Boolean)
      const events = lines.slice(-100).map((line: string) => JSON.parse(line))
      return this.jsonResponse({ events, total: lines.length })
    } catch (error) {
      return this.errorResponse(500, 'analytics_read_failed', this.getErrorMessage(error))
    }
  }

  // ---- Tool Registry Handler ----

  private async listToolsEndpoint(): Promise<Response> {
    const allTools = toolRegistry.getAll()
    const filtered = filterToolsByPermission(allTools, this.permissionPolicy)
    const tools = filtered.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }))
    return this.jsonResponse(tools)
  }

  // ---- Auth Info Handler ----

  private async getAuthInfoEndpoint(authManager: AuthManager): Promise<Response> {
    const summary = authManager.getAuthSummary()
    return this.jsonResponse({
      ...summary,
      hasServerToken: authManager.getServerToken() !== undefined,
    })
  }
}
