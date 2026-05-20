/**
 * IdeServer — VSCode 扩展侧的 WebSocket 服务端实现。
 *
 * 工作原理（与官方 Claude Code 扩展 1:1 一致）：
 *  1. 扩展启动时在随机端口起一个 HTTP+WebSocket 服务器。
 *  2. 将连接信息写入 ~/.claude/ide/<port>.lock 文件。
 *  3. cclocal CLI 在启动时轮询 ~/.claude/ide/ 目录，发现 lock 文件后
 *     通过 WebSocket 连接到扩展，clientType 变为 "claude-vscode"。
 *  4. 扩展通过 WebSocket 发送用户消息，接收 stream-json 格式的响应。
 */

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as http from 'http'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import { WebSocketServer, type WebSocket } from 'ws'
import type {
  CliStreamMessage,
  ExtensionToCliMessage,
  ExtPingMessage,
} from './types.js'

/** Lock 文件写入的 JSON 内容结构（与 cclocal src/utils/ide.ts 中定义完全一致） */
interface LockfileContent {
  workspaceFolders: string[]
  pid: number
  ideName: string
  transport: 'ws'
  runningInWindows: boolean
  authToken: string
}

/** 心跳配置 */
const HEARTBEAT_INTERVAL_MS = 15_000
const HEARTBEAT_TIMEOUT_MS = 30_000

/** IDE 服务器事件回调 */
export interface IdeServerCallbacks {
  /** CLI WebSocket 客户端连接成功 */
  onClientConnected: (info?: { version?: string; model?: string }) => void
  /** CLI WebSocket 客户端断开连接 */
  onClientDisconnected: () => void
  /** 收到来自 CLI 的 stream-json 消息 */
  onMessage: (line: string) => void
  /** 服务器发生错误 */
  onError: (err: Error) => void
}

export class IdeServer {
  private server: http.Server | null = null
  private wss: WebSocketServer | null = null
  private client: WebSocket | null = null
  private port = 0
  private lockfilePath = ''
  private workspaceFolders: string[]
  private callbacks: IdeServerCallbacks
  private authToken = ''

  // 心跳
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastHeartbeat = 0
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null

  // 重连缓冲：CLI 断连后短暂保留消息
  private pendingMessages: ExtensionToCliMessage[] = []
  private readonly MAX_PENDING = 100

  constructor(workspaceFolders: string[], callbacks: IdeServerCallbacks) {
    this.workspaceFolders = workspaceFolders
    this.callbacks = callbacks
  }

  /** 启动服务器：绑定随机端口，写 lock 文件 */
  async start(): Promise<void> {
    this.authToken = crypto.randomBytes(32).toString('hex')

    this.server = http.createServer((_req, res) => {
      res.writeHead(426, { 'Content-Type': 'text/plain' })
      res.end('Upgrade Required')
    })

    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address() as net.AddressInfo
        this.port = addr.port
        resolve()
      })
      this.server!.once('error', reject)
    })

    await this.writeLockfile()
    this.startHeartbeat()
  }

  /** 停止服务器，删除 lock 文件 */
  async stop(): Promise<void> {
    this.stopHeartbeat()

    if (this.client) {
      this.client.close()
      this.client = null
    }

    await new Promise<void>(resolve => {
      if (this.wss) {
        this.wss.close(() => resolve())
      } else {
        resolve()
      }
    })

    await new Promise<void>(resolve => {
      if (this.server) {
        this.server.close(() => resolve())
      } else {
        resolve()
      }
    })

    this.deleteLockfile()
    this.server = null
    this.wss = null
  }

  /** 向已连接的 CLI 发送消息 */
  send(message: ExtensionToCliMessage): boolean {
    if (!this.client || this.client.readyState !== 1 /* OPEN */) {
      // 缓冲消息，CLI 重连后重发
      if (this.pendingMessages.length < this.MAX_PENDING) {
        this.pendingMessages.push(message)
      }
      return false
    }

    try {
      this.client.send(JSON.stringify(message) + '\n')
      return true
    } catch {
      return false
    }
  }

  /** 发送用户消息给 CLI */
  sendUserMessage(text: string, sessionId: string): boolean {
    return this.send({
      type: 'user',
      message: {
        role: 'user',
        content: text,
      },
      parent_tool_use_id: null,
      session_id: sessionId,
    })
  }

  /** 发送中断请求 */
  sendInterrupt(): void {
    this.send({
      type: 'control_response',
      request_id: crypto.randomUUID(),
      response: {
        subtype: 'tool_permission',
        approved: false,
      },
    })
  }

  /** 发送权限响应 */
  sendPermissionResponse(requestId: string, approved: boolean, always = false): void {
    this.send({
      type: 'control_response',
      request_id: requestId,
      response: {
        subtype: 'tool_permission',
        approved,
        always,
      },
    })
  }

  /** 发送配置变更 */
  sendConfigUpdate(config: { model?: string; permissionMode?: import('./types.js').PermissionMode; thinkingBudget?: 'low' | 'medium' | 'high'; effortLevel?: 'low' | 'medium' | 'high'; maxTokens?: number; temperature?: number }): void {
    this.send({ type: 'config_update', config })
  }

  /** 判断 CLI 是否已连接 */
  isClientConnected(): boolean {
    return this.client !== null && this.client.readyState === 1
  }

  /** 返回当前监听端口 */
  getPort(): number {
    return this.port
  }

  /** 返回 authToken（供测试和调试使用） */
  getAuthToken(): string {
    return this.authToken
  }

  /** 返回 lock 文件路径（调试用） */
  getLockfilePath(): string {
    return this.lockfilePath
  }

  // ─── 私有方法 ────────────────────────────────────────────────────────────

  /** 处理新 WebSocket 连接 */
  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    // 验证 Bearer token
    const authHeader = req.headers['authorization'] ?? ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''

    if (token !== this.authToken) {
      ws.close(4003, 'Unauthorized')
      return
    }

    // 同一时间只允许一个 CLI 连接
    if (this.client && this.client.readyState === 1) {
      this.client.close(1001, 'Replaced by new connection')
    }

    this.client = ws
    this.lastHeartbeat = Date.now()

    // 重发缓冲的消息
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift()!
      this.send(msg)
    }

    // 接收消息
    ws.on('message', (data: Buffer) => {
      const raw = data.toString()
      const lines = raw.split('\n').filter(l => l.trim())

      for (const line of lines) {
        try {
          const msg = JSON.parse(line) as CliStreamMessage

          // 处理 pong 响应
          if (msg.type === 'system' && 'subtype' in msg && (msg as any).subtype === 'pong') {
            this.lastHeartbeat = Date.now()
            continue
          }

          this.callbacks.onMessage(line)
        } catch {
          // 忽略解析失败的行
        }
      }
    })

    ws.on('close', () => {
      if (this.client === ws) {
        this.client = null
        this.callbacks.onClientDisconnected()
      }
    })

    ws.on('error', (err: Error) => {
      this.callbacks.onError(err)
      if (this.client === ws) {
        this.client = null
        this.callbacks.onClientDisconnected()
      }
    })

    // 通知连接成功
    // init 消息会通过 onMessage 传递，在那里提取版本和模型信息
    this.callbacks.onClientConnected()
  }

  /** 心跳 ping */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (!this.client || this.client.readyState !== 1) return

      const ping: ExtPingMessage = { type: 'ping', timestamp: Date.now() }
      try {
        this.client.send(JSON.stringify(ping) + '\n')
      } catch {
        // 发送失败，连接可能已断
      }

      // 检查上次 pong 是否超时
      if (Date.now() - this.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        this.callbacks.onError(new Error('Heartbeat timeout'))
        this.client.close(1001, 'Heartbeat timeout')
        this.client = null
        this.callbacks.onClientDisconnected()
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  /** 写入 lock 文件 */
  private async writeLockfile(): Promise<void> {
    const ideDir = path.join(os.homedir(), '.claude', 'ide')
    await fs.promises.mkdir(ideDir, { recursive: true })

    this.lockfilePath = path.join(ideDir, `${this.port}.lock`)

    const content: LockfileContent = {
      workspaceFolders: this.workspaceFolders,
      pid: process.pid,
      ideName: 'VS Code',
      transport: 'ws',
      runningInWindows: process.platform === 'win32',
      authToken: this.authToken,
    }

    await fs.promises.writeFile(
      this.lockfilePath,
      JSON.stringify(content, null, 2),
      { encoding: 'utf-8', mode: 0o600 },
    )
  }

  /** 删除 lock 文件 */
  private deleteLockfile(): void {
    if (this.lockfilePath) {
      try {
        fs.unlinkSync(this.lockfilePath)
      } catch {
        // 忽略删除失败
      }
      this.lockfilePath = ''
    }
  }
}
