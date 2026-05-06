/**
 * Daemon WebSocket Client - 连接 daemon supervisor
 *
 * 通过读取 lock 文件发现 daemon 端口，使用 WebSocket 连接。
 */

import * as fs from 'fs'
import WebSocket from 'ws'
import { jsonParse, jsonStringify } from '../utils/slowOperations.js'
import {
  createError,
  DaemonErrorCode,
  type DaemonResponse,
  type DaemonStatus,
  type SessionInfo,
} from './protocol.js'
import { getDaemonLockPath, type DaemonLockContent } from './transport.js'

const CONNECTION_TIMEOUT_MS = 5000
const REQUEST_TIMEOUT_MS = 10000

function log(message: string, ...args: unknown[]): void {
  // Silent by default
  if (process.env.DEBUG) {
    console.error(`[Daemon Client] ${message}`, ...args)
  }
}

/**
 * Daemon WebSocket Client
 */
export class DaemonClient {
  private ws: WebSocket | null = null
  private connected = false
  private buffer = ''
  private pendingResolve: ((value: DaemonResponse) => void) | null = null
  private pendingReject: ((error: Error) => void) | null = null
  private requestId = 0

  /**
   * Connect to the daemon
   */
  async connect(): Promise<boolean> {
    const lock = await this.readLockFile()
    if (!lock) {
      log('Lock file not found')
      return false
    }

    return new Promise(resolve => {
      try {
        this.ws = new WebSocket(lock.url, {
          headers: {
            Authorization: `Bearer ${lock.authToken}`,
          },
        })

        const timeout = setTimeout(() => {
          log('Connection timeout')
          this.ws?.terminate()
          this.ws = null
          resolve(false)
        }, CONNECTION_TIMEOUT_MS)

        this.ws.on('open', () => {
          clearTimeout(timeout)
          this.connected = true
          log('Connected to daemon')
          resolve(true)
        })

        this.ws.on('error', err => {
          clearTimeout(timeout)
          log('Connection error:', err.message)
          this.ws = null
          resolve(false)
        })

        this.ws.on('message', (data: Buffer) => {
          this.buffer += data.toString()
          this.processBuffer()
        })

        this.ws.on('close', () => {
          this.connected = false
          log('Connection closed')
          if (this.pendingResolve) {
            // Daemon stopped, return success
            this.pendingResolve({ result: { stopped: true } })
            this.pendingResolve = null
            this.pendingReject = null
          }
        })
      } catch (e) {
        log('Failed to connect:', e)
        resolve(false)
      }
    })
  }

  /**
   * Disconnect from daemon
   */
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.buffer = ''
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Send a request to the daemon
   */
  async request<T>(method: string, params: unknown): Promise<DaemonResponse<T>> {
    if (!this.ws || !this.connected) {
      return createError(DaemonErrorCode.DAEMON_NOT_RUNNING, 'Daemon not running')
    }

    const id = this.requestId++
    const request = { method, params, id }

    return new Promise<DaemonResponse<T>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResolve = null
        this.pendingReject = null
        reject(new Error('Request timeout'))
      }, REQUEST_TIMEOUT_MS)

      // Store resolvers
      this.pendingResolve = (value: DaemonResponse) => {
        clearTimeout(timeout)
        resolve(value as DaemonResponse<T>)
      }
      this.pendingReject = reject

      try {
        this.ws!.send(jsonStringify(request) + '\n')
      } catch (e) {
        clearTimeout(timeout)
        reject(e)
      }
    })
  }

  /**
   * Read the daemon lock file
   */
  private async readLockFile(): Promise<DaemonLockContent | null> {
    const lockPath = getDaemonLockPath()
    try {
      const content = await fs.promises.readFile(lockPath, 'utf-8')
      return jsonParse(content) as DaemonLockContent
    } catch {
      return null
    }
  }

  /**
   * Process buffered data
   */
  private processBuffer(): void {
    const lines = this.buffer.split('\n')
    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const response = jsonParse(line) as DaemonResponse
        if (this.pendingResolve) {
          this.pendingResolve(response)
          this.pendingResolve = null
          this.pendingReject = null
          // Only process one response per request
          return
        }
      } catch (e) {
        if (this.pendingReject) {
          this.pendingReject(e as Error)
          this.pendingResolve = null
          this.pendingReject = null
          return
        }
      }
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if daemon is running
 */
export async function isDaemonRunning(): Promise<boolean> {
  const client = new DaemonClient()
  const connected = await client.connect()
  if (connected) {
    await client.disconnect()
    return true
  }
  return false
}

/**
 * Get daemon status
 */
export async function getDaemonStatus(): Promise<DaemonStatus | null> {
  const client = new DaemonClient()
  if (!(await client.connect())) {
    return null
  }

  const response = await client.request<DaemonStatus>('status', {})
  await client.disconnect()

  if ('error' in response) {
    return null
  }

  return response.result
}

/**
 * List all sessions
 */
export async function listSessions(): Promise<SessionInfo[] | null> {
  const client = new DaemonClient()
  if (!(await client.connect())) {
    return null
  }

  const response = await client.request<SessionInfo[]>('list', {})
  await client.disconnect()

  if ('error' in response) {
    return null
  }

  return response.result
}

/**
 * Kill a session
 */
export async function killSession(sessionId: string): Promise<boolean> {
  const client = new DaemonClient()
  if (!(await client.connect())) {
    return false
  }

  const response = await client.request('kill', { sessionId })
  await client.disconnect()

  return !('error' in response)
}

/**
 * Read lock file content
 */
export async function readDaemonLock(): Promise<DaemonLockContent | null> {
  const lockPath = getDaemonLockPath()
  try {
    const content = await fs.promises.readFile(lockPath, 'utf-8')
    return jsonParse(content) as DaemonLockContent
  } catch {
    return null
  }
}
