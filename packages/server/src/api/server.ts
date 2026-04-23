/**
 * HTTP API 服务器
 * 基于 Bun 原生 HTTP 服务器
 */

import type { AuthManager } from '../auth/AuthManager.js'
import type { SessionManager } from '../sessions/SessionManager.js'
import type { WebSocketManager } from '../ws/WebSocketManager.js'
import type { MCPManager } from '@cclocal/core'

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

    this.server = Bun.serve({
      port: this.options.port,
      hostname: this.options.host,

      fetch: async (request, server) => {
        const url = new URL(request.url)
        const origin = request.headers.get('Origin')

        // WebSocket 升级
        if (url.pathname === '/ws') {
          const success = wsManager.handleUpgrade(request, server)
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
        const toolName = apiPath.replace('tools/', '').split('/')[0]
        const action = apiPath.split('/')[1]
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

      // 消息历史 API
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
    // TODO: 从配置读取可用模型
    const models = [
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4', name: 'Claude Opus 4' },
      { id: 'doubao', name: 'Doubao' },
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
}
