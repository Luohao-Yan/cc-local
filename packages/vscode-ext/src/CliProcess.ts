/**
 * CliProcess — 管理 cclocal CLI 子进程的生命周期。
 *
 * 工作模式（与官方 Claude Code 扩展 1:1 一致）：
 *  - spawn cclocal --ide 进程
 *  - cclocal 发现 ~/.claude/ide/<port>.lock 文件后，主动通过 WebSocket
 *    连接到扩展的 IdeServer（clientType = "claude-vscode"）
 *  - 扩展不需要通过 stdin/stdout 通信，所有消息走 WebSocket
 *  - 但仍监听 stdout/stderr 用于调试日志和错误捕获
 *
 * 崩溃时自动重启（指数退避，最多 5 次）。
 */

import { spawn, type ChildProcess } from 'child_process'
import * as os from 'os'
import * as path from 'path'

/** 进程事件回调 */
export interface CliProcessCallbacks {
  /** stdout 输出行（调试日志） */
  onLog: (line: string) => void
  /** 进程意外退出（非扩展主动 stop） */
  onUnexpectedExit: (code: number | null, signal: string | null) => void
}

/** 重启配置 */
const MAX_RESTARTS = 5
const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

export class CliProcess {
  private proc: ChildProcess | null = null
  private cclocalPath: string
  private cwd: string
  private idePort: number
  private callbacks: CliProcessCallbacks

  private restartCount = 0
  private backoffMs = INITIAL_BACKOFF_MS
  private stopped = false
  private restartTimer: ReturnType<typeof setTimeout> | null = null

  constructor(opts: {
    cclocalPath: string
    cwd: string
    idePort: number
    callbacks: CliProcessCallbacks
  }) {
    this.cclocalPath = opts.cclocalPath
    this.cwd = opts.cwd
    this.idePort = opts.idePort
    this.callbacks = opts.callbacks
  }

  /** 启动 cclocal 进程 */
  start(): void {
    this.stopped = false
    this.restartCount = 0
    this.backoffMs = INITIAL_BACKOFF_MS
    this.spawn()
  }

  /** 优雅停止（不触发重启） */
  stop(): void {
    this.stopped = true
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    if (this.proc) {
      try {
        // Windows 不支持 SIGTERM，使用 taskkill
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.proc.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
          })
        } else {
          this.proc.kill('SIGTERM')
        }
      } catch {
        // 进程可能已退出
      }
      this.proc = null
    }
  }

  /** 进程是否正在运行 */
  isRunning(): boolean {
    return this.proc !== null && !this.proc.killed
  }

  /** 重置重启计数（CLI 成功连接后调用） */
  resetRestartCount(): void {
    this.restartCount = 0
    this.backoffMs = INITIAL_BACKOFF_MS
  }

  // ─── 私有方法 ────────────────────────────────────────────────────────────

  /** 创建子进程 */
  private spawn(): void {
    const env = this.buildEnv()

    // cclocal --ide --port <port> 让 CLI 知道 WebSocket 服务端口
    // --port 参数不是必须的（CLI 也能通过 lock 文件发现），但提供可加快连接
    const args = ['--ide']

    this.proc = spawn(this.cclocalPath, args, {
      cwd: this.cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Windows: 使用 shell 以确保 PATH 中能找到 cclocal
      shell: process.platform === 'win32',
      // 隐藏 Windows 控制台窗口
      windowsHide: true,
    })

    this.proc.stdout?.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(l => l.trim())
      for (const line of lines) {
        this.callbacks.onLog(`[stdout] ${line}`)
      }
    })

    this.proc.stderr?.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(l => l.trim())
      for (const line of lines) {
        this.callbacks.onLog(`[stderr] ${line}`)
      }
    })

    this.proc.on('exit', (code, signal) => {
      this.proc = null

      if (this.stopped) return

      this.callbacks.onLog(
        `[CliProcess] cclocal 退出 code=${code} signal=${signal}`,
      )

      // 指数退避重启
      if (this.restartCount < MAX_RESTARTS) {
        this.restartCount++
        const delay = this.backoffMs + Math.random() * 500 // 加抖动
        this.callbacks.onLog(
          `[CliProcess] ${delay.toFixed(0)}ms 后重启 (第 ${this.restartCount} 次)`,
        )

        this.restartTimer = setTimeout(() => {
          this.restartTimer = null
          if (!this.stopped) {
            this.spawn()
          }
        }, delay)

        this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS)
      } else {
        this.callbacks.onUnexpectedExit(code, null)
      }
    })

    this.proc.on('error', (err: Error) => {
      this.callbacks.onLog(`[CliProcess] 启动失败: ${err.message}`)
      // error 事件后通常也会触发 exit，在那里处理重启
    })
  }

  /**
   * 构建注入了完整 PATH 的环境变量。
   *
   * VSCode Extension Host 进程的 PATH 通常很短，
   * 无法找到 bun、homebrew 等工具。
   * 需要手动补全 macOS / Linux / Windows 常见路径。
   */
  private buildEnv(): NodeJS.ProcessEnv {
    const home = os.homedir()
    const isWin = process.platform === 'win32'
    const isMac = process.platform === 'darwin'

    const extraPaths: string[] = []

    if (isMac) {
      extraPaths.push(
        '/opt/homebrew/bin',        // Apple Silicon Homebrew
        '/opt/homebrew/sbin',
        '/usr/local/bin',           // Intel Homebrew / 手动安装
        '/usr/local/sbin',
        '/usr/bin',
        '/usr/sbin',
        '/bin',
        '/sbin',
        `${home}/.bun/bin`,         // bun
        `${home}/.local/bin`,       // 用户级工具
        `${home}/.eigent/bin`,      // eigent
        `${home}/.cargo/bin`,       // rust cargo
        `${home}/go/bin`,          // go
        '/opt/homebrew/opt/node/bin', // Homebrew node
        '/usr/local/opt/node/bin',
      )
    } else if (isWin) {
      const appData = process.env.APPDATA ?? ''
      const localAppData = process.env.LOCALAPPDATA ?? ''
      extraPaths.push(
        `${home}\\.bun\\bin`,
        `${home}\\.cargo\\bin`,
        `${home}\\AppData\\Local\\Programs\\Python\\Scripts`,
        `${home}\\AppData\\Roaming\\npm`,
        `${localAppData}\\Programs\\Microsoft VS Code\\bin`,
        `${appData}\\npm`,
        'C:\\Program Files\\Git\\cmd',
        'C:\\Program Files\\Git\\bin',
        'C:\\Program Files\\nodejs',
        'C:\\Program Files\\dotnet',
        'C:\\Windows\\System32',
        'C:\\Windows',
      )
    } else {
      // Linux
      extraPaths.push(
        '/usr/local/bin',
        '/usr/local/sbin',
        '/usr/bin',
        '/usr/sbin',
        '/bin',
        '/sbin',
        `${home}/.bun/bin`,
        `${home}/.local/bin`,
        `${home}/.cargo/bin`,
        `${home}/.eigent/bin`,
        `${home}/.go/bin`,
        '/snap/bin',
      )
    }

    const currentPath = process.env.PATH ?? ''
    const mergedPath = [...extraPaths, currentPath]
      .filter(Boolean)
      .join(path.delimiter)

    return {
      ...process.env,
      PATH: mergedPath,
      // 传递 IDE 端口信息给 CLI（加快发现速度）
      CCLocal_IDE_PORT: String(this.idePort),
    }
  }
}
