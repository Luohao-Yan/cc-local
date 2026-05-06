/**
 * Daemon WebSocket Server - 与官方 IdeServer 架构一致
 *
 * 使用 WebSocket 而非 Named Pipe：
 * - 跨平台一致性（Windows/macOS/Linux）
 * - 与 IDE Server 模式一致
 * - 更简单可靠
 */

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as http from 'http'
import * as net from 'net'
import * as path from 'path'
import { WebSocketServer, WebSocket } from 'ws'
import { jsonParse, jsonStringify } from '../utils/slowOperations.js'
import {
  DaemonErrorCode,
  type DaemonRequest,
  type DaemonResponse,
} from './protocol.js'
import { getDaemonLockPath, type DaemonLockContent } from './transport.js'

function log(message: string, ...args: unknown[]): void {
  console.error(`[Daemon WS] ${message}`, ...args)
}

export type RequestHandler = (request: DaemonRequest) => Promise<DaemonResponse>

export interface DaemonWsServerOptions {
  /** Specific port (default: 0 = random) */
  port?: number
}

/**
 * Daemon WebSocket Server
 */
export class DaemonWsServer {
  private server: http.Server | null = null
  private wss: WebSocketServer | null = null
  private clients = new Set<WebSocket>()
  private handlers = new Map<string, RequestHandler>()
  private running = false
  private port = 0
  private authToken = ''
  private lockfilePath = ''
  private startedAt = 0

  constructor(private options: DaemonWsServerOptions = {}) {}

  /**
   * Start the WebSocket server
   */
  async start(): Promise<{ port: number; authToken: string }> {
    if (this.running) {
      return { port: this.port, authToken: this.authToken }
    }

    // Generate auth token
    this.authToken = crypto.randomBytes(32).toString('hex')
    this.startedAt = Date.now()

    // Create HTTP server (for WebSocket upgrade)
    this.server = http.createServer((_req, res) => {
      res.writeHead(426, { 'Content-Type': 'text/plain' })
      res.end('Upgrade Required')
    })

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    this.wss.on('error', err => {
      log('WebSocket server error:', err)
    })

    // Bind to port
    const port = this.options.port || 0
    await new Promise<void>((resolve, reject) => {
      this.server!.listen(port, '127.0.0.1', () => {
        const addr = this.server!.address() as net.AddressInfo
        this.port = addr.port
        this.running = true
        log(`Listening on port ${this.port}`)
        resolve()
      })
      this.server!.once('error', reject)
    })

    // Write lock file
    await this.writeLockfile()

    log(`Daemon WebSocket server started on port ${this.port}`)
    return { port: this.port, authToken: this.authToken }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return
    }

    log('Stopping WebSocket server')

    // Close all client connections
    for (const client of this.clients) {
      client.close()
    }
    this.clients.clear()

    // Close WebSocket server
    await new Promise<void>(resolve => {
      if (this.wss) {
        this.wss.close(() => resolve())
      } else {
        resolve()
      }
    })
    this.wss = null

    // Close HTTP server
    await new Promise<void>(resolve => {
      if (this.server) {
        this.server.close(() => resolve())
      } else {
        resolve()
      }
    })
    this.server = null

    // Delete lock file
    this.deleteLockfile()

    this.running = false
    log('WebSocket server stopped')
  }

  /**
   * Register a handler for a method
   */
  registerHandler(method: string, handler: RequestHandler): void {
    this.handlers.set(method, handler)
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Get server info
   */
  getInfo(): { port: number; pid: number; startedAt: number; sessions: number } {
    return {
      port: this.port,
      pid: process.pid,
      startedAt: this.startedAt,
      sessions: this.clients.size,
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    // Verify auth token
    const authHeader = req.headers['authorization'] ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (token !== this.authToken) {
      log('Unauthorized connection attempt')
      ws.close(4003, 'Unauthorized')
      return
    }

    this.clients.add(ws)
    log(`Client connected. Total clients: ${this.clients.size}`)

    let buffer = ''

    ws.on('message', (data: Buffer) => {
      buffer += data.toString()

      // Process complete messages (newline-delimited JSON)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          this.handleMessage(ws, line)
        }
      }
    })

    ws.on('close', () => {
      this.clients.delete(ws)
      log(`Client disconnected. Remaining clients: ${this.clients.size}`)
    })

    ws.on('error', err => {
      log('Client error:', err)
      this.clients.delete(ws)
    })
  }

  private async handleMessage(ws: WebSocket, line: string): Promise<void> {
    let request: DaemonRequest & { id?: number }
    let requestId: number | undefined

    try {
      const parsed = jsonParse(line) as Record<string, unknown>
      request = parsed as DaemonRequest & { id?: number }
      requestId = typeof parsed.id === 'number' ? parsed.id : undefined
    } catch (e) {
      log('Failed to parse message:', e)
      this.sendResponse(ws, {
        error: { code: DaemonErrorCode.PARSE_ERROR, message: 'Parse error' },
      })
      return
    }

    const method = request?.method
    log(`Request: ${method}`)

    const handler = method ? this.handlers.get(method) : undefined
    if (!handler || !method) {
      log(`No handler for method: ${method}`)
      this.sendResponse(ws, {
        error: { code: DaemonErrorCode.METHOD_NOT_FOUND, message: 'Method not found' },
        id: requestId,
      })
      return
    }

    try {
      const response = await handler(request)
      this.sendResponse(ws, { ...response, id: requestId })
    } catch (e) {
      log(`Handler error for ${method}:`, e)
      this.sendResponse(ws, {
        error: {
          code: DaemonErrorCode.INTERNAL_ERROR,
          message: (e as Error).message || 'Internal error',
        },
        id: requestId,
      })
    }
  }

  private sendResponse(ws: WebSocket, response: DaemonResponse): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(jsonStringify(response) + '\n')
    }
  }

  private async writeLockfile(): Promise<void> {
    const lockPath = getDaemonLockPath()
    const lockDir = path.dirname(lockPath)

    // Ensure directory exists
    await fs.promises.mkdir(lockDir, { recursive: true })

    this.lockfilePath = lockPath

    const content: DaemonLockContent = {
      port: this.port,
      pid: process.pid,
      startedAt: this.startedAt,
      authToken: this.authToken,
      url: `ws://127.0.0.1:${this.port}`,
    }

    await fs.promises.writeFile(
      lockPath,
      jsonStringify(content, null, 2),
      { encoding: 'utf-8', mode: 0o600 }
    )

    log(`Lock file written: ${lockPath}`)
  }

  private deleteLockfile(): void {
    if (this.lockfilePath) {
      try {
        fs.unlinkSync(this.lockfilePath)
        log('Lock file deleted')
      } catch {
        // Ignore
      }
      this.lockfilePath = ''
    }
  }
}
