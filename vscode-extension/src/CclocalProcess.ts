import { spawn, type ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

/** stream-json 输出的消息格式（内联定义，与旧版兼容） */
interface StreamJsonMessage {
  type: string
  subtype?: string
  delta?: { type: string; text?: string }
  name?: string
  input?: unknown
  result?: string
  error?: string
}

/** cclocal 进程事件回调类型 */
export interface CclocalProcessCallbacks {
  /** 收到 stream-json 消息 */
  onMessage: (msg: StreamJsonMessage) => void
  /** 进程发生错误或意外退出 */
  onError: (err: string) => void
  /** 进程正常结束 */
  onExit: () => void
}

/** 启动参数 */
export interface CclocalLaunchOptions {
  /** cclocal 全局命令路径，或 bun 可执行路径 */
  executablePath: string
  /** 如果使用 bun run，需要提供 cc-local 项目根目录 */
  projectPath?: string
  /** 工作目录（对话时的 cwd） */
  cwd: string
  /** 指定模型别名（可选） */
  model?: string
  /** 要发送的用户提示词 */
  prompt: string
}

/**
 * 管理单次 cclocal --print 调用进程的生命周期。
 * cclocal 以 --print --output-format stream-json --verbose 方式启动，
 * 每次对话创建一个新进程，输出完毕后自动退出。
 */
export class CclocalProcess {
  private process: ChildProcess | null = null
  private buffer = ''
  private killed = false

  constructor(private readonly callbacks: CclocalProcessCallbacks) { }

  /** 启动 cclocal 进程处理一次对话 */
  launch(options: CclocalLaunchOptions): void {
    if (this.process) {
      this.kill()
    }

    this.buffer = ''
    this.killed = false

    const { args, cmd } = this.buildCommand(options)

    this.process = spawn(cmd, args, {
      cwd: options.cwd,
      env: this.buildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.handleStdoutChunk(chunk.toString())
    })

    /** 收集 stderr 内容，进程退出时若无 stdout 输出则上报错误 */
    let stderrBuf = ''
    this.process.stderr?.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString()
    })

    this.process.on('error', (err: Error) => {
      if (!this.killed) {
        this.callbacks.onError(`启动 cclocal 失败: ${err.message}`)
      }
    })

    this.process.on('close', (code: number | null) => {
      this.process = null
      if (!this.killed) {
        if (code !== 0 && code !== null) {
          // 优先展示 stderr 内容，帮助用户定位问题
          const detail = stderrBuf.trim()
            ? `\n详情: ${stderrBuf.trim().split('\n').slice(-3).join(' | ')}`
            : ''
          this.callbacks.onError(`cclocal 进程以退出码 ${code} 结束${detail}`)
        }
        this.callbacks.onExit()
      }
    })
  }

  /** 强制终止进程 */
  kill(): void {
    this.killed = true
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
  }

  /** 判断进程是否仍在运行 */
  isRunning(): boolean {
    return this.process !== null && !this.killed
  }

  /**
   * 构建注入了完整 PATH 的环境变量，确保子进程能找到 cclocal 和 bun。
   * VSCode Extension Host 不加载 shell 配置，默认 PATH 极简，
   * 需要手动补全 macOS 常见的可执行文件目录。
   */
  private buildEnv(): NodeJS.ProcessEnv {
    const home = os.homedir()
    // 常见的 macOS 工具路径，按优先级排列
    const extraPaths = [
      '/opt/homebrew/bin',        // Apple Silicon Homebrew
      '/usr/local/bin',           // Intel Homebrew / 手动安装
      `${home}/.bun/bin`,         // bun 默认安装路径
      `${home}/.local/bin`,       // 用户级工具
      `${home}/.eigent/bin`,      // eigent 自带 bun
      '/usr/bin',
      '/bin',
    ]
    const currentPath = process.env.PATH ?? ''
    // 将额外路径前置，避免被系统路径覆盖
    const mergedPath = [...extraPaths, currentPath].filter(Boolean).join(path.delimiter)
    return { ...process.env, PATH: mergedPath }
  }

  /**
   * 根据配置构建启动命令和参数。
   * 优先使用全局命令 cclocal，若提供了 projectPath 则用 bun run start。
   */
  private buildCommand(options: CclocalLaunchOptions): { cmd: string; args: string[] } {
    // 对提示词中的特殊字符进行转义，防止 shell: true 模式下解析异常
    const safePrompt = options.prompt

    const baseArgs = [
      '--print',
      safePrompt,
      '--output-format',
      'stream-json',
      '--verbose',
    ]

    if (options.model) {
      baseArgs.push('--model', options.model)
    }

    if (options.projectPath && fs.existsSync(options.projectPath)) {
      // 使用 bun run start 方式启动，executablePath 为 bun 路径
      const bunBin = options.executablePath || 'bun'
      return {
        cmd: bunBin,
        args: ['run', 'start', '--', ...baseArgs],
      }
    }

    // 使用全局 cclocal 命令（绝对路径或命令名）
    return {
      cmd: options.executablePath || 'cclocal',
      args: baseArgs,
    }
  }

  /**
   * 处理 stdout 增量数据，按行分割并解析 JSON。
   * cclocal stream-json 模式每行输出一个 JSON 对象。
   */
  private handleStdoutChunk(chunk: string): void {
    this.buffer += chunk
    const lines = this.buffer.split('\n')
    // 最后一段可能不完整，保留在 buffer 中
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        continue
      }
      try {
        const msg = JSON.parse(trimmed) as StreamJsonMessage
        this.callbacks.onMessage(msg)
      } catch {
        // 非 JSON 行（如调试输出）忽略
      }
    }
  }
}
