/**
 * IdeServer — VSCode 扩展侧的 WebSocket 服务端实现。
 *
 * 工作原理（与官方 Claude Code 扩展 1:1 一致）：
 *  1. 扩展启动时在随机端口起一个 HTTP+WebSocket 服务器。
 *  2. 将连接信息写入 ~/.claude/ide/<port>.lock 文件（JSON 格式）。
 *  3. cclocal CLI 在启动时轮询 ~/.claude/ide/ 目录，发现 lock 文件后
 *     通过 WebSocket 连接到扩展，clientType 变为 "claude-vscode"。
 *  4. CLI 连接后，扩展通过 WebSocket 发送用户消息，接收 stream-json 格式的响应。
 *  5. 扩展停止时删除 lock 文件，关闭 WebSocket 服务器。
 */

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as http from 'http'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import { WebSocketServer, type WebSocket } from 'ws'

/** Lock 文件写入的 JSON 内容结构（与 cclocal src/utils/ide.ts 中定义完全一致） */
interface LockfileContent {
  workspaceFolders: string[]
  pid: number
  ideName: string
  transport: 'ws'
  runningInWindows: boolean
  authToken: string
}

/** IDE 服务器事件回调 */
export interface IdeServerCallbacks {
  /** CLI 客户端连接成功 */
  onClientConnected: () => void
  /** CLI 客户端断开连接 */
  onClientDisconnected: () => void
  /** 收到来自 CLI 的消息（stream-json 行） */
  onMessage: (line: string) => void
  /** 服务器内部错误 */
  onError: (err: Error) => void
}

export class IdeServer {
  private server: http.Server | null = null
  private wss: WebSocketServer | null = null
  private client: WebSocket | null = null
  private port = 0
  private lockfilePath = ''
  private authToken = ''
  private workspaceFolders: string[]
  private callbacks: IdeServerCallbacks

  constructor(workspaceFolders: string[], callbacks: IdeServerCallbacks) {
    this.workspaceFolders = workspaceFolders
    this.callbacks = callbacks
  }

  /** 启动服务器：绑定随机端口，写 lock 文件 */
  async start(): Promise<void> {
    /** 生成安全随机 token，用于 CLI 鉴权 */
    this.authToken = crypto.randomBytes(32).toString('hex')

    /** 创建 HTTP 服务器，仅用于 WebSocket 升级握手 */
    this.server = http.createServer((_req, res) => {
      res.writeHead(426, { 'Content-Type': 'text/plain' })
      res.end('Upgrade Required')
    })

    /** 创建 WebSocket 服务器，挂载到 HTTP 服务器 */
    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    this.wss.on('error', (err: Error) => {
      this.callbacks.onError(err)
    })

    /** 绑定随机端口（传 0 让 OS 分配） */
    await new Promise<void>((resolve, reject) => {
      this.server!.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address() as net.AddressInfo
        this.port = addr.port
        resolve()
      })
      this.server!.once('error', reject)
    })

    /** 写入 lock 文件，供 CLI 发现 */
    await this.writeLockfile()
  }

  /** 停止服务器，删除 lock 文件 */
  async stop(): Promise<void> {
    this.deleteLockfile()

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

    this.wss = null
    this.server = null
  }

  /** 向已连接的 CLI 客户端发送消息 */
  send(message: object): boolean {
    if (!this.client || this.client.readyState !== 1 /* OPEN */) {
      return false
    }
    try {
      this.client.send(JSON.stringify(message) + '\n')
      return true
    } catch {
      return false
    }
  }

  /** 发送用户消息给 CLI（格式与 directConnectManager.ts 中一致） */
  sendUserMessage(text: string): boolean {
    return this.send({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text }],
      },
      parent_tool_use_id: null,
      session_id: '',
    })
  }

  /** 发送中断信号，取消当前请求 */
  sendInterrupt(): void {
    this.send({
      type: 'control_request',
      request_id: crypto.randomUUID(),
      request: { subtype: 'interrupt' },
    })
  }

  /** 判断是否有已连接的 CLI */
  isClientConnected(): boolean {
    return this.client !== null && this.client.readyState === 1
  }

  /** 返回当前监听的端口 */
  getPort(): number {
    return this.port
  }

  /** 返回 authToken（供日志/调试使用） */
  getAuthToken(): string {
    return this.authToken
  }

  // ─── 私有方法 ────────────────────────────────────────────────────────────────

  /** 处理新的 WebSocket 连接（每次 CLI 启动都会连接一次） */
  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    /** 验证 Bearer token */
    const authHeader = req.headers['authorization'] ?? ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''

    if (token !== this.authToken) {
      ws.close(4003, 'Unauthorized')
      return
    }

    /** 同时只允许一个 CLI 客户端 */
    if (this.client) {
      this.client.close(1001, 'Replaced by new connection')
    }

    this.client = ws
    this.callbacks.onClientConnected()

    ws.on('message', (data: Buffer) => {
      const raw = data.toString()
      /** CLI 每行一个 JSON，可能批量发送，按行拆分处理 */
      const lines = raw.split('\n').filter(l => l.trim())
      for (const line of lines) {
        this.callbacks.onMessage(line)
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
    })
  }

  /** 将连接信息写入 ~/.claude/ide/<port>.lock */
  private async writeLockfile(): Promise<void> {
    const ideDir = path.join(os.homedir(), '.claude', 'ide')

    /** 确保目录存在 */
    await fs.promises.mkdir(ideDir, { recursive: true })

    this.lockfilePath = path.join(ideDir, `${this.port}.lock`)

    const content: LockfileContent = {
      workspaceFolders: this.workspaceFolders,
      pid: process.pid,
      ideName: 'VS Code',
      transport: 'ws',
      runningInWindows: false,
      authToken: this.authToken,
    }

    await fs.promises.writeFile(
      this.lockfilePath,
      JSON.stringify(content, null, 2),
      { encoding: 'utf-8', mode: 0o600 },
    )
  }

  /** 删除 lock 文件（扩展停止或重启时清理） */
  private deleteLockfile(): void {
    if (!this.lockfilePath) {
      return
    }
    try {
      fs.unlinkSync(this.lockfilePath)
    } catch {
      // 文件可能已被手动删除，忽略
    }
    this.lockfilePath = ''
  }
}
