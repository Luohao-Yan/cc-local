/**
 * Daemon Supervisor - Long-running background process that manages sessions
 *
 * 使用 WebSocket + lock 文件方式（与官方 IdeServer 一致）
 */

import { spawn, type ChildProcess } from 'child_process'
import { mkdir, readFile, unlink, readdir } from 'fs/promises'
import { join } from 'path'
import { logForDebugging } from '../utils/debug.js'
import { registerCleanup } from '../utils/cleanupRegistry.js'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'
import { isProcessRunning } from '../utils/genericProcessUtils.js'
import { jsonParse, jsonStringify } from '../utils/slowOperations.js'
import {
  type DaemonRequest,
  type DaemonResponse,
  type DaemonStatus,
  type SessionInfo,
  DaemonErrorCode,
  createError,
  createResponse,
  isStartRequest,
  isStopRequest,
  isLogsRequest,
  isKillRequest,
  isRestartRequest,
} from './protocol.js'
import { DaemonWsServer } from './server.js'
import {
  getDaemonLogsDir,
  getSessionLogPath,
  ENV_DAEMON_FORKED,
  ENV_WORKER_OPTIONS,
  ENV_SESSION_KIND,
  ENV_SESSION_NAME,
  ENV_SESSION_LOG,
} from './transport.js'

const VERSION = '1.0.0'

export interface SessionWorker {
  sessionId: string
  name?: string
  process: ChildProcess
  pid: number
  startedAt: number
  cwd: string
  agent?: string
  logPath: string
  status: 'running' | 'idle' | 'waiting'
}

export interface SupervisorOptions {
  /** WebSocket port (default: 0 = random) */
  port?: number
}

/**
 * Daemon Supervisor - manages session workers
 */
export class DaemonSupervisor {
  private wsServer: DaemonWsServer
  private sessions = new Map<string, SessionWorker>()
  private startedAt: number = Date.now()
  private running = false

  constructor(private options: SupervisorOptions = {}) {
    this.wsServer = new DaemonWsServer({ port: options.port })
  }

  /**
   * Start the supervisor
   */
  async start(): Promise<void> {
    if (this.running) {
      return
    }

    logForDebugging('[Daemon] Starting supervisor')

    // Register cleanup handlers
    registerCleanup(() => this.stop())

    // Clean up stale sessions
    await this.cleanupStaleSessions()

    // Start WebSocket server
    const { port } = await this.wsServer.start()
    logForDebugging(`[Daemon] WebSocket server started on port ${port}`)

    // Register IPC handlers
    this.wsServer.registerHandler('start', req => this.handleStart(req))
    this.wsServer.registerHandler('stop', req => this.handleStop(req))
    this.wsServer.registerHandler('status', () => this.handleStatus())
    this.wsServer.registerHandler('list', () => this.handleList())
    this.wsServer.registerHandler('logs', req => this.handleLogs(req))
    this.wsServer.registerHandler('kill', req => this.handleKill(req))
    this.wsServer.registerHandler('restart', req => this.handleRestart(req))

    this.running = true
    logForDebugging('[Daemon] Supervisor started')

    // Keep process alive
    process.stdin.resume()
  }

  /**
   * Stop the supervisor
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return
    }

    logForDebugging('[Daemon] Stopping supervisor')

    // Kill all sessions
    for (const [sessionId, worker] of this.sessions) {
      try {
        worker.process.kill('SIGTERM')
      } catch {
        // Ignore errors
      }
    }
    this.sessions.clear()

    // Stop WebSocket server
    await this.wsServer.stop()

    this.running = false
    logForDebugging('[Daemon] Supervisor stopped')
  }

  // ============================================================================
  // IPC Handlers
  // ============================================================================

  private async handleStart(req: DaemonRequest): Promise<DaemonResponse> {
    const params = isStartRequest(req) ? req.params : {}
    const cwd = params.cwd || process.cwd()
    const name = params.name
    const agent = params.agent

    const sessionId = generateSessionId()

    try {
      const worker = await this.spawnWorker({
        sessionId,
        cwd,
        name,
        agent,
      })

      return createResponse({
        sessionId: worker.sessionId,
        pid: worker.pid,
        logPath: worker.logPath,
      })
    } catch (e) {
      logForDebugging(`[Daemon] Failed to start session: ${(e as Error).message}`)
      return createError(DaemonErrorCode.INTERNAL_ERROR, (e as Error).message)
    }
  }

  private async handleStop(req: DaemonRequest): Promise<DaemonResponse> {
    const params = isStopRequest(req) ? req.params : {}
    const sessionId = params.sessionId

    if (sessionId) {
      // Stop specific session
      const worker = this.sessions.get(sessionId)
      if (!worker) {
        return createError(DaemonErrorCode.SESSION_NOT_FOUND, 'Session not found')
      }
      worker.process.kill('SIGTERM')
      this.sessions.delete(sessionId)
      return createResponse({ stopped: sessionId })
    }

    // Stop all sessions and daemon
    await this.stop()
    process.exit(0)
  }

  private handleStatus(): Promise<DaemonResponse<DaemonStatus>> {
    const info = this.wsServer.getInfo()
    const status: DaemonStatus = {
      version: VERSION,
      pid: info.pid,
      uptime: Date.now() - this.startedAt,
      sessions: this.sessions.size,
      socketPath: `ws://127.0.0.1:${info.port}`,
      startedAt: this.startedAt,
    }
    return Promise.resolve(createResponse(status))
  }

  private handleList(): Promise<DaemonResponse<SessionInfo[]>> {
    const sessions: SessionInfo[] = []
    for (const [, worker] of this.sessions) {
      sessions.push({
        sessionId: worker.sessionId,
        name: worker.name,
        pid: worker.pid,
        status: worker.status,
        startedAt: worker.startedAt,
        cwd: worker.cwd,
        agent: worker.agent,
        logPath: worker.logPath,
      })
    }
    return Promise.resolve(createResponse(sessions))
  }

  private async handleLogs(req: DaemonRequest): Promise<DaemonResponse> {
    const params = isLogsRequest(req) ? req.params : { sessionId: '' }
    const sessionId = params.sessionId

    const worker = this.sessions.get(sessionId)
    if (!worker) {
      return createError(DaemonErrorCode.SESSION_NOT_FOUND, 'Session not found')
    }

    try {
      const logContent = await readFile(worker.logPath, 'utf-8')
      const lines = logContent.split('\n').slice(-100)
      return createResponse({ logs: lines })
    } catch {
      return createResponse({ logs: [] })
    }
  }

  private async handleKill(req: DaemonRequest): Promise<DaemonResponse> {
    const params = isKillRequest(req) ? req.params : { sessionId: '' }
    const sessionId = params.sessionId

    const worker = this.sessions.get(sessionId)
    if (!worker) {
      return createError(DaemonErrorCode.SESSION_NOT_FOUND, 'Session not found')
    }

    worker.process.kill('SIGTERM')
    this.sessions.delete(sessionId)
    return createResponse({ killed: sessionId })
  }

  private async handleRestart(req: DaemonRequest): Promise<DaemonResponse> {
    const params = isRestartRequest(req) ? req.params : {}
    const sessionId = params.sessionId

    // If no sessionId, restart daemon itself
    if (!sessionId) {
      await this.stop()
      return createResponse({ restarting: true })
    }

    const worker = this.sessions.get(sessionId)
    if (!worker) {
      return createError(DaemonErrorCode.SESSION_NOT_FOUND, 'Session not found')
    }

    // Kill and respawn
    const { cwd, name, agent } = worker
    worker.process.kill('SIGTERM')
    this.sessions.delete(sessionId)

    try {
      const newWorker = await this.spawnWorker({
        sessionId: generateSessionId(),
        cwd,
        name,
        agent,
      })
      return createResponse({
        sessionId: newWorker.sessionId,
        pid: newWorker.pid,
      })
    } catch (e) {
      return createError(DaemonErrorCode.INTERNAL_ERROR, (e as Error).message)
    }
  }

  // ============================================================================
  // Worker Management
  // ============================================================================

  private async spawnWorker(options: {
    sessionId: string
    cwd: string
    name?: string
    agent?: string
  }): Promise<SessionWorker> {
    const { sessionId, cwd, name, agent } = options
    const logPath = getSessionLogPath(sessionId)

    // Ensure logs directory exists
    await mkdir(getDaemonLogsDir(), { recursive: true })

    const workerOptions = {
      kind: 'bg-session',
      sessionId,
      cwd,
      name,
      agent,
      logPath,
    }

    const childProcess = spawn(process.execPath, [process.argv[1]!, '--daemon-worker', 'bg-session'], {
      cwd,
      env: {
        ...process.env,
        [ENV_DAEMON_FORKED]: '1',
        [ENV_WORKER_OPTIONS]: jsonStringify(workerOptions),
        [ENV_SESSION_KIND]: 'bg',
        [ENV_SESSION_NAME]: name || '',
        [ENV_SESSION_LOG]: logPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    })

    // Check if spawn succeeded
    if (!childProcess.pid) {
      throw new Error('Failed to spawn worker process')
    }

    const worker: SessionWorker = {
      sessionId,
      name,
      process: childProcess,
      pid: childProcess.pid,
      startedAt: Date.now(),
      cwd,
      agent,
      logPath,
      status: 'running',
    }

    // Handle process exit
    childProcess.on('exit', () => {
      this.sessions.delete(sessionId)
      logForDebugging(`[Daemon] Session ${sessionId} exited`)
    })

    this.sessions.set(sessionId, worker)
    logForDebugging(`[Daemon] Started session ${sessionId} with PID ${childProcess.pid}`)

    return worker
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  private async cleanupStaleSessions(): Promise<void> {
    const sessionsDir = join(getClaudeConfigHomeDir(), 'sessions')

    try {
      const files = await readdir(sessionsDir)
      for (const file of files) {
        if (!/^\d+\.json$/.test(file)) continue

        const pid = parseInt(file.slice(0, -5), 10)
        if (isProcessRunning(pid)) continue

        // Stale session, remove it
        try {
          await unlink(join(sessionsDir, file))
          logForDebugging(`[Daemon] Cleaned up stale session file: ${file}`)
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Directory may not exist
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
