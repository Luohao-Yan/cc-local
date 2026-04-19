/**
 * HTTP API 服务器
 * 基于 Bun 原生 HTTP 服务器
 */

import type { AuthManager } from '../auth/AuthManager.js'
import type { SessionManager } from '../sessions/SessionManager.js'
import type { WebSocketManager } from '../ws/WebSocketManager.js'

interface ServerOptions {
  port: number
  host: string
  authManager: AuthManager
  sessionManager: SessionManager
  wsManager: WebSocketManager
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
          return new Response(null, {
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          })
        }

        // API 路由
        try {
          const response = await this.handleRequest(request, url, authManager, sessionManager)

          // 添加 CORS 头
          response.headers.set('Access-Control-Allow-Origin', '*')
          return response
        } catch (error) {
          console.error('Request handler error:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
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
      return new Response(
        JSON.stringify({ status: 'ok', version: '1.0.0' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // API v1 路由
    if (pathname.startsWith('/api/v1/')) {
      // 验证认证
      const authHeader = request.headers.get('Authorization')
      if (!authManager.verifyRequest(authHeader)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const apiPath = pathname.replace('/api/v1/', '')

      // 会话管理 API
      if (apiPath === 'sessions' && method === 'POST') {
        return this.createSession(request, sessionManager)
      }

      if (apiPath === 'sessions' && method === 'GET') {
        return this.listSessions(sessionManager)
      }

      if (apiPath.startsWith('sessions/')) {
        const sessionId = apiPath.replace('sessions/', '').split('/')[0]
        const action = apiPath.split('/')[1]

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
      }

      // 模型列表
      if (apiPath === 'models' && method === 'GET') {
        return this.listModels()
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

    return new Response('Not Found', { status: 404 })
  }

  private async createSession(
    request: Request,
    sessionManager: SessionManager
  ): Promise<Response> {
    try {
      const body = await request.json()
      const session = await sessionManager.createSession(body)
      return new Response(JSON.stringify(session), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  private async listSessions(sessionManager: SessionManager): Promise<Response> {
    const sessions = sessionManager.getAllSessions()
    return new Response(JSON.stringify(sessions), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async getSession(
    sessionId: string,
    sessionManager: SessionManager
  ): Promise<Response> {
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' },
    })
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
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  private async cancelGeneration(
    sessionId: string,
    sessionManager: SessionManager
  ): Promise<Response> {
    await sessionManager.cancelGeneration(sessionId)
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async deleteSession(
    sessionId: string,
    sessionManager: SessionManager
  ): Promise<Response> {
    sessionManager.deleteSession(sessionId)
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async listModels(): Promise<Response> {
    // TODO: 从配置读取可用模型
    const models = [
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4', name: 'Claude Opus 4' },
      { id: 'doubao', name: 'Doubao' },
    ]
    return new Response(JSON.stringify(models), {
      headers: { 'Content-Type': 'application/json' },
    })
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
      return new Response(JSON.stringify(session), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
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
    return new Response(JSON.stringify(messages), {
      headers: { 'Content-Type': 'application/json' },
    })
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
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
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
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
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
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
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
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
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

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
