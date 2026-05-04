/**
 * SSH Manager
 *
 * 管理 SSH 远程连接，支持：
 * - SSH 连接建立和断开
 * - 远程命令执行
 * - 文件传输
 * - 隧道管理
 */

import { randomUUID } from 'crypto'
import { spawn, ChildProcess } from 'child_process'

export interface SSHConfig {
  host: string
  port?: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
  timeout?: number
}

export interface SSHSession {
  id: string
  config: SSHConfig
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  error?: string
  createdAt: number
}

export interface SSHExecOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
}

export interface SSHExecResult {
  stdout: string
  stderr: string
  exitCode: number | null
  signal?: string
}

export interface SSHTunnel {
  id: string
  sessionId: string
  localPort: number
  remotePort: number
  remoteHost?: string
  status: 'starting' | 'active' | 'stopped' | 'error'
  error?: string
  createdAt: number
}

interface SSHTunnelInternal extends SSHTunnel {
  process?: ChildProcess
}

interface SSHConnectionInternal extends SSHSession {
  process?: ChildProcess
  tunnels: Map<string, SSHTunnelInternal>
}

/**
 * SSH 管理器
 */
export class SSHManager {
  private connections = new Map<string, SSHConnectionInternal>()

  /**
   * 建立 SSH 连接
   */
  async connect(config: SSHConfig): Promise<SSHSession> {
    const sessionId = randomUUID()

    const connection: SSHConnectionInternal = {
      id: sessionId,
      config,
      status: 'connecting',
      createdAt: Date.now(),
      tunnels: new Map(),
    }

    this.connections.set(sessionId, connection)

    try {
      // 验证连接（通过执行简单命令）
      const result = await this.executeCommand(sessionId, 'echo "connected"', { timeout: config.timeout || 10000 })

      // 检查退出码
      if (result.exitCode !== 0) {
        connection.status = 'error'
        connection.error = result.stderr || `Connection failed with exit code ${result.exitCode}`
        throw new Error(connection.error)
      }

      connection.status = 'connected'
      return { ...connection }

    } catch (error) {
      connection.status = 'error'
      connection.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  /**
   * 断开 SSH 连接
   */
  async disconnect(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId)
    if (!connection) return

    // 关闭相关隧道
    for (const [tunnelId, tunnel] of connection.tunnels) {
      if ((tunnel as SSHTunnelInternal).process) {
        ((tunnel as SSHTunnelInternal).process)!.kill()
      }
      connection.tunnels.delete(tunnelId)
    }

    // 终止主进程
    if (connection.process) {
      connection.process.kill()
    }

    connection.status = 'disconnected'
    this.connections.delete(sessionId)
  }

  /**
   * 在远程执行命令
   */
  async execute(
    sessionId: string,
    command: string,
    options?: SSHExecOptions
  ): Promise<SSHExecResult> {
    const connection = this.connections.get(sessionId)
    if (!connection || connection.status !== 'connected') {
      throw new Error('SSH session not connected')
    }

    return this.executeCommand(sessionId, command, options)
  }

  /**
   * 执行 SSH 命令（内部方法）
   */
  private executeCommand(
    sessionId: string,
    command: string,
    options?: SSHExecOptions
  ): Promise<SSHExecResult> {
    const connection = this.connections.get(sessionId)
    if (!connection) {
      return Promise.reject(new Error('Session not found'))
    }

    const { config } = connection
    const timeout = options?.timeout || 30000

    return new Promise((resolve, reject) => {
      const sshArgs = this.buildSSHArgs(config, command, options)

      const proc = spawn('ssh', sshArgs, {
        env: { ...process.env, ...options?.env },
      })

      let stdout = ''
      let stderr = ''
      let timeoutId: ReturnType<typeof setTimeout>

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code, signal) => {
        clearTimeout(timeoutId)
        resolve({
          stdout,
          stderr,
          exitCode: code,
          signal: signal?.toString(),
        })
      })

      proc.on('error', (err) => {
        clearTimeout(timeoutId)
        reject(err)
      })

      // 超时处理
      timeoutId = setTimeout(() => {
        proc.kill()
        reject(new Error(`Command timeout after ${timeout}ms`))
      }, timeout)

      connection.process = proc
    })
  }

  /**
   * 构建 SSH 命令参数
   */
  private buildSSHArgs(
    config: SSHConfig,
    command: string,
    options?: SSHExecOptions
  ): string[] {
    const args: string[] = []

    // 端口
    if (config.port) {
      args.push('-p', String(config.port))
    }

    // 私钥
    if (config.privateKey) {
      args.push('-i', config.privateKey)
    }

    // 严格主机检查
    args.push('-o', 'StrictHostKeyChecking=no')
    args.push('-o', 'UserKnownHostsFile=/dev/null')

    // 连接超时
    args.push('-o', `ConnectTimeout=${config.timeout || 10}`)

    // 用户@主机
    args.push(`${config.username}@${config.host}`)

    // 工作目录
    if (options?.cwd) {
      args.push(`cd ${options.cwd} && ${command}`)
    } else {
      args.push(command)
    }

    return args
  }

  /**
   * 上传文件
   */
  async uploadFile(
    sessionId: string,
    localPath: string,
    remotePath: string
  ): Promise<void> {
    const connection = this.connections.get(sessionId)
    if (!connection || connection.status !== 'connected') {
      throw new Error('SSH session not connected')
    }

    const { config } = connection
    const remote = `${config.username}@${config.host}:${remotePath}`

    return new Promise((resolve, reject) => {
      const proc = spawn('scp', [
        '-o', 'StrictHostKeyChecking=no',
        '-P', String(config.port || 22),
        localPath,
        remote,
      ])

      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`SCP upload failed with code ${code}`))
        }
      })

      proc.on('error', reject)
    })
  }

  /**
   * 下载文件
   */
  async downloadFile(
    sessionId: string,
    remotePath: string,
    localPath: string
  ): Promise<void> {
    const connection = this.connections.get(sessionId)
    if (!connection || connection.status !== 'connected') {
      throw new Error('SSH session not connected')
    }

    const { config } = connection
    const remote = `${config.username}@${config.host}:${remotePath}`

    return new Promise((resolve, reject) => {
      const proc = spawn('scp', [
        '-o', 'StrictHostKeyChecking=no',
        '-P', String(config.port || 22),
        remote,
        localPath,
      ])

      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`SCP download failed with code ${code}`))
        }
      })

      proc.on('error', reject)
    })
  }

  /**
   * 创建端口转发隧道
   */
  async createTunnel(
    sessionId: string,
    localPort: number,
    remotePort: number,
    remoteHost?: string
  ): Promise<{ tunnelId: string }> {
    const connection = this.connections.get(sessionId)
    if (!connection || connection.status !== 'connected') {
      throw new Error('SSH session not connected')
    }

    const tunnelId = `${sessionId}-${localPort}-${remotePort}-${remoteHost || 'localhost'}`

    // 检查是否已存在相同配置的隧道
    if (connection.tunnels.has(tunnelId)) {
      const existing = connection.tunnels.get(tunnelId)!
      if (existing.status === 'active') {
        return { tunnelId }
      }
    }

    const tunnel: SSHTunnelInternal = {
      id: tunnelId,
      sessionId,
      localPort,
      remotePort,
      remoteHost: remoteHost || 'localhost',
      status: 'starting',
      createdAt: Date.now(),
    }

    connection.tunnels.set(tunnelId, tunnel)

    try {
      await this.startTunnel(connection, tunnel)
      tunnel.status = 'active'
      return { tunnelId }
    } catch (error) {
      tunnel.status = 'error'
      tunnel.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  /**
   * 启动隧道进程
   */
  private startTunnel(connection: SSHConnectionInternal, tunnel: SSHTunnelInternal): Promise<void> {
    const { config } = connection

    return new Promise((resolve, reject) => {
      const args: string[] = []

      // 端口
      if (config.port) {
        args.push('-p', String(config.port))
      }

      // 私钥
      if (config.privateKey) {
        args.push('-i', config.privateKey)
      }

      // 禁用严格主机检查
      args.push('-o', 'StrictHostKeyChecking=no')
      args.push('-o', 'UserKnownHostsFile=/dev/null')

      // 保持连接
      args.push('-N') // 不执行远程命令
      args.push('-f') // 后台运行（但在某些环境下可能需要调整）

      // 端口转发: -L localPort:remoteHost:remotePort
      const forwardTarget = `${tunnel.remoteHost}:${tunnel.remotePort}`
      args.push('-L', `${tunnel.localPort}:${forwardTarget}`)

      // 连接超时
      args.push('-o', `ConnectTimeout=${config.timeout || 10}`)

      // 用户@主机
      args.push(`${config.username}@${config.host}`)

      const proc = spawn('ssh', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      tunnel.process = proc

      let stderrOutput = ''

      proc.stderr?.on('data', (data) => {
        stderrOutput += data.toString()
      })

      proc.on('error', (err) => {
        tunnel.status = 'error'
        tunnel.error = err.message
        reject(err)
      })

      proc.on('close', (code) => {
        if (code !== 0 && tunnel.status === 'starting') {
          tunnel.status = 'error'
          tunnel.error = `SSH tunnel failed: ${stderrOutput}`
          reject(new Error(tunnel.error))
        } else if (tunnel.status === 'active') {
          tunnel.status = 'stopped'
        }
      })

      // 等待隧道建立（简单延时）
      setTimeout(() => {
        if (tunnel.status === 'starting') {
          resolve()
        }
      }, 500)
    })
  }

  /**
   * 关闭隧道
   */
  async closeTunnel(tunnelId: string): Promise<void> {
    // 从 tunnelId 中解析 sessionId
    const parts = tunnelId.split('-')
    const sessionId = parts[0]

    const connection = this.connections.get(sessionId)
    if (!connection) return

    const tunnel = connection.tunnels.get(tunnelId) as SSHTunnelInternal | undefined
    if (!tunnel) return

    if (tunnel.process) {
      tunnel.process.kill()
    }

    tunnel.status = 'stopped'
    connection.tunnels.delete(tunnelId)
  }

  /**
   * 获取隧道状态
   */
  getTunnel(sessionId: string, tunnelId: string): SSHTunnel | undefined {
    const connection = this.connections.get(sessionId)
    if (!connection) return undefined
    return connection.tunnels.get(tunnelId)
  }

  /**
   * 列出会话的所有隧道
   */
  listTunnels(sessionId: string): SSHTunnel[] {
    const connection = this.connections.get(sessionId)
    if (!connection) return []
    return Array.from(connection.tunnels.values())
  }

  /**
   * 获取会话状态
   */
  getSession(sessionId: string): SSHSession | undefined {
    const conn = this.connections.get(sessionId)
    if (!conn) return undefined
    return { ...conn }
  }

  /**
   * 获取所有连接
   */
  listSessions(): SSHSession[] {
    return Array.from(this.connections.values()).map(c => ({ ...c }))
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    for (const sessionId of this.connections.keys()) {
      await this.disconnect(sessionId)
    }
  }
}

// 导出默认实例
export const sshManager = new SSHManager()
