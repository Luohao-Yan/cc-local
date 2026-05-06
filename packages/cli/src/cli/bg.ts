/**
 * Background Session Commands - `ps` / `logs` / `attach` / `kill` / `--bg`
 *
 * 这些命令通过 WebSocket 与 daemon supervisor 通信。
 */

import { readFile, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { isProcessRunning } from '../utils/genericProcessUtils.js'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'
import { logForDebugging } from '../utils/debug.js'
import { jsonParse } from '../utils/slowOperations.js'
import { DaemonClient, isDaemonRunning } from '../daemon/client.js'
import { getSessionsRegistryDir, getSessionLogPath } from '../daemon/transport.js'
import { type SessionInfo, type DaemonResponse, DaemonErrorCode } from '../daemon/protocol.js'
import { daemonMain } from '../daemon/main.js'

// ============================================================================
// Session Registry Types
// ============================================================================

interface SessionRegistryEntry {
  pid: number
  sessionId: string
  cwd: string
  startedAt: number
  kind: 'interactive' | 'bg' | 'daemon' | 'daemon-worker'
  name?: string
  logPath?: string
  agent?: string
  status?: 'busy' | 'idle' | 'waiting'
}

// ============================================================================
// ps - List Sessions
// ============================================================================

export async function psHandler(_args: string[]): Promise<void> {
  // Try daemon first
  const client = new DaemonClient()
  const connected = await client.connect()

  if (connected) {
    const response = await client.request<SessionInfo[]>('list', {})
    await client.disconnect()

    if ('error' in response && response.error) {
      console.error(`Error: ${response.error.message}`)
      process.exit(1)
    }

    displaySessions(response.result)
    return
  }

  // Fallback: read local session registry
  const sessions = await listLocalSessions()
  displaySessions(sessions)
}

function displaySessions(sessions: SessionInfo[]): void {
  if (sessions.length === 0) {
    console.log('No active sessions')
    return
  }

  console.log('Active sessions:')
  console.log('')

  for (const session of sessions) {
    const shortId = session.sessionId.slice(0, 8)
    const uptime = formatUptime(Date.now() - session.startedAt)
    const name = session.name || '-'
    const cwd = session.cwd.length > 30 ? '...' + session.cwd.slice(-27) : session.cwd

    console.log(`  ${shortId}  ${session.status.padEnd(7)}  ${uptime.padEnd(8)}  ${name.padEnd(12)}  ${cwd}`)
  }

  console.log('')
  console.log(`Total: ${sessions.length} session(s)`)
}

// ============================================================================
// logs - View Session Logs
// ============================================================================

export async function logsHandler(sessionId: string | undefined): Promise<void> {
  if (!sessionId) {
    console.error('Usage: cclocal logs <session-id>')
    console.error('')
    console.error('Use "cclocal ps" to list active sessions')
    process.exit(1)
  }

  // Find the session
  const session = await findSession(sessionId)
  if (!session) {
    console.error(`Session not found: ${sessionId}`)
    process.exit(1)
  }

  const logPath = session.logPath || getSessionLogPath(session.sessionId)

  // Try to read the log file
  try {
    const content = await readFile(logPath, 'utf-8')
    const lines = content.split('\n').slice(-100)
    for (const line of lines) {
      if (line.trim()) {
        console.log(line)
      }
    }
  } catch {
    console.log('No logs available')
  }
}

// ============================================================================
// attach - Attach to Session
// ============================================================================

export async function attachHandler(sessionId: string | undefined): Promise<void> {
  if (!sessionId) {
    console.error('Usage: cclocal attach <session-id>')
    console.error('')
    console.error('Use "cclocal ps" to list active sessions')
    process.exit(1)
  }

  // Attach is more complex - it would require terminal control
  // For now, just show logs
  console.log(`Attaching to session ${sessionId}...`)
  console.log('(Note: Full attach requires terminal control, showing logs instead)')
  console.log('')

  await logsHandler(sessionId)
}

// ============================================================================
// kill - Kill Session
// ============================================================================

export async function killHandler(sessionId: string | undefined): Promise<void> {
  if (!sessionId) {
    console.error('Usage: cclocal kill <session-id>')
    console.error('')
    console.error('Use "cclocal ps" to list active sessions')
    process.exit(1)
  }

  // Try daemon first
  const client = new DaemonClient()
  const connected = await client.connect()

  if (connected) {
    const response = await client.request('kill', { sessionId })
    await client.disconnect()

    if ('error' in response && response.error) {
      console.error(`Error: ${response.error.message}`)
      process.exit(1)
    }

    console.log(`Session ${sessionId} killed`)
    return
  }

  // Fallback: kill by PID from local registry
  const session = await findSession(sessionId)
  if (!session) {
    console.error(`Session not found: ${sessionId}`)
    process.exit(1)
  }

  try {
    process.kill(session.pid, 'SIGTERM')
    console.log(`Session ${sessionId} killed (PID ${session.pid})`)

    // Clean up registry file
    const registryDir = getSessionsRegistryDir()
    try {
      await unlink(join(registryDir, `${session.pid}.json`))
    } catch {
      // Ignore
    }
  } catch (e) {
    console.error(`Failed to kill session: ${(e as Error).message}`)
    process.exit(1)
  }
}

// ============================================================================
// --bg - Run in Background
// ============================================================================

export async function handleBgFlag(args: string[]): Promise<void> {
  // Check if daemon is running, start if not
  if (!(await isDaemonRunning())) {
    console.log('Starting daemon...')
    await daemonMain(['start'])

    // Wait for daemon to be ready
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  // Start a background session
  const client = new DaemonClient()
  const connected = await client.connect()

  if (!connected) {
    console.error('Failed to connect to daemon')
    process.exit(1)
  }

  const response = await client.request<{ sessionId: string; pid: number; logPath: string }>('start', {
    cwd: process.cwd(),
    name: args[0], // First arg could be a name
  })

  await client.disconnect()

  if ('error' in response && response.error) {
    console.error(`Error: ${response.error.message}`)
    process.exit(1)
  }

  console.log('Background session started:')
  console.log(`  Session ID: ${response.result.sessionId}`)
  console.log(`  PID: ${response.result.pid}`)
  console.log(`  Log file: ${response.result.logPath}`)
  console.log('')
  console.log('Use "cclocal ps" to list sessions')
  console.log(`Use "cclocal logs ${response.result.sessionId.slice(0, 8)}" to view logs`)
}

// ============================================================================
// Helper Functions
// ============================================================================

async function listLocalSessions(): Promise<SessionInfo[]> {
  const sessions: SessionInfo[] = []
  const registryDir = getSessionsRegistryDir()

  try {
    const files = await readdir(registryDir)

    for (const file of files) {
      if (!/^\d+\.json$/.test(file)) continue

      const pid = parseInt(file.slice(0, -5), 10)

      try {
        const content = await readFile(join(registryDir, file), 'utf-8')
        const entry = jsonParse(content) as SessionRegistryEntry

        // Skip if process is not running
        if (!isProcessRunning(pid)) {
          // Clean up stale file
          try {
            await unlink(join(registryDir, file))
          } catch {
            // Ignore
          }
          continue
        }

        sessions.push({
          sessionId: entry.sessionId,
          name: entry.name,
          pid: entry.pid,
          status: entry.status === 'busy' ? 'running' : entry.status === 'idle' ? 'idle' : 'waiting',
          startedAt: entry.startedAt,
          cwd: entry.cwd,
          agent: entry.agent,
          logPath: entry.logPath || getSessionLogPath(entry.sessionId),
        })
      } catch {
        // Skip invalid entries
      }
    }
  } catch {
    // Directory may not exist
  }

  return sessions
}

async function findSession(sessionIdOrPid: string): Promise<SessionInfo | null> {
  // Try exact session ID match
  const sessions = await listLocalSessions()
  const exact = sessions.find(s => s.sessionId === sessionIdOrPid || s.sessionId.startsWith(sessionIdOrPid))
  if (exact) return exact

  // Try PID match
  const pid = parseInt(sessionIdOrPid, 10)
  if (!isNaN(pid)) {
    const byPid = sessions.find(s => s.pid === pid)
    if (byPid) return byPid
  }

  return null
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}
