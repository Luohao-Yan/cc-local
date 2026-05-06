/**
 * Daemon Main - Entry point for `claude daemon [subcommand]`
 *
 * Commands:
 * - `claude daemon start` - Start daemon supervisor (background process)
 * - `claude daemon stop` - Stop daemon
 * - `claude daemon status` - Check daemon status
 * - `claude daemon restart` - Restart daemon
 */

import { spawn } from 'child_process'
import { unlink } from 'fs/promises'
import { platform } from 'os'
import { DaemonClient, readDaemonLock } from './client.js'
import { getDaemonLockPath, ENV_DAEMON_FORKED } from './transport.js'
import { type DaemonStatus } from './protocol.js'
import { DaemonSupervisor } from './supervisor.js'
import { logForDebugging } from '../utils/debug.js'
import { isProcessRunning } from '../utils/genericProcessUtils.js'

const isWindows = platform() === 'win32'

/**
 * Main entry point for daemon commands
 */
export async function daemonMain(args: string[]): Promise<void> {
  const [subcommand, ...subArgs] = args

  switch (subcommand) {
    case 'start':
      return handleDaemonStart(subArgs)
    case 'stop':
      return handleDaemonStop(subArgs)
    case 'status':
      return handleDaemonStatus(subArgs)
    case 'restart':
      return handleDaemonRestart(subArgs)
    case undefined:
    case '':
      // No subcommand - default to status
      return handleDaemonStatus([])
    default:
      console.error(`Unknown daemon subcommand: ${subcommand}`)
      console.error('Usage: cclocal daemon [start|stop|status|restart]')
      process.exit(1)
  }
}

/**
 * Start daemon supervisor
 */
async function handleDaemonStart(_args: string[]): Promise<void> {
  // Check if already running
  const existingStatus = await getExistingDaemonStatus()
  if (existingStatus) {
    console.log('Daemon is already running')
    console.log(`  PID: ${existingStatus.pid}`)
    console.log(`  Uptime: ${formatUptime(existingStatus.uptime)}`)
    console.log(`  Sessions: ${existingStatus.sessions}`)
    return
  }

  // Fork into background
  if (process.env[ENV_DAEMON_FORKED] !== '1') {
    console.log('Starting daemon...')

    const execPath = process.execPath
    const scriptPath = process.argv[1]!

    if (isWindows) {
      // Windows: Use detached spawn with windowsHide
      spawnWindowsDaemon(execPath, scriptPath)
    } else {
      // Unix: Standard detached spawn
      const child = spawn(execPath, [scriptPath, 'daemon', 'start'], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          [ENV_DAEMON_FORKED]: '1',
        },
      })
      child.unref()
    }

    // Wait and check if daemon started
    // On Windows, the process may take longer to initialize
    const maxAttempts = isWindows ? 20 : 10
    const pollInterval = isWindows ? 500 : 500

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      const status = await getExistingDaemonStatus()
      if (status) {
        console.log(`Daemon started with PID ${status.pid}`)
        return
      }
    }

    console.error('Failed to start daemon')
    console.error('Tip: Try running with CLAUDE_DAEMON_FORKED=1 to debug')
    process.exit(1)
    return
  }

  // We're the forked process - run supervisor
  const supervisor = new DaemonSupervisor()

  // Handle shutdown signals
  process.on('SIGTERM', async () => {
    logForDebugging('[Daemon] Received SIGTERM')
    await supervisor.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logForDebugging('[Daemon] Received SIGINT')
    await supervisor.stop()
    process.exit(0)
  })

  try {
    await supervisor.start()
    // Keep running until shutdown
  } catch (e) {
    logForDebugging(`[Daemon] Supervisor error: ${(e as Error).message}`)
    process.exit(1)
  }
}

/**
 * Spawn daemon on Windows
 * Uses detached process with windowsHide to run in background
 */
function spawnWindowsDaemon(execPath: string, scriptPath: string): void {
  const daemonArgs = [scriptPath, 'daemon', 'start']

  const child = spawn(execPath, daemonArgs, {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      [ENV_DAEMON_FORKED]: '1',
    },
    windowsHide: true,
  })

  // Critical: unref the child so the parent can exit
  child.unref()

  // Handle any errors silently - parent process will check status
  child.on('error', () => {
    // Ignore errors
  })
}

/**
 * Stop daemon
 */
async function handleDaemonStop(_args: string[]): Promise<void> {
  const status = await getExistingDaemonStatus()
  if (!status) {
    console.log('Daemon is not running')
    return
  }

  console.log(`Stopping daemon (PID ${status.pid})...`)

  // Connect and send stop request
  const client = new DaemonClient()
  const connected = await client.connect()

  if (connected) {
    await client.request('stop', {})
    await client.disconnect()
    console.log('Daemon stopped')
  } else {
    // Fallback: kill by PID
    try {
      process.kill(status.pid, 'SIGTERM')
      console.log('Daemon stopped')

      // Clean up lock file
      try {
        await unlink(getDaemonLockPath())
      } catch {
        // Ignore
      }
    } catch (e) {
      console.error(`Failed to stop daemon: ${(e as Error).message}`)
      process.exit(1)
    }
  }
}

/**
 * Check daemon status
 */
async function handleDaemonStatus(_args: string[]): Promise<void> {
  const status = await getExistingDaemonStatus()

  if (!status) {
    console.log('Daemon is not running')
    return
  }

  console.log('Daemon status:')
  console.log(`  PID: ${status.pid}`)
  console.log(`  Version: ${status.version}`)
  console.log(`  Uptime: ${formatUptime(status.uptime)}`)
  console.log(`  Sessions: ${status.sessions}`)
  console.log(`  WebSocket: ${status.socketPath}`)
}

/**
 * Restart daemon
 */
async function handleDaemonRestart(_args: string[]): Promise<void> {
  console.log('Restarting daemon...')

  // Stop
  const status = await getExistingDaemonStatus()
  if (status) {
    try {
      process.kill(status.pid, 'SIGTERM')
      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch {
      // Ignore errors
    }
  }

  // Start
  await handleDaemonStart([])
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ExistingDaemonStatus {
  pid: number
  version: string
  uptime: number
  sessions: number
  socketPath: string
}

async function getExistingDaemonStatus(): Promise<ExistingDaemonStatus | null> {
  const lock = await readDaemonLock()
  if (!lock) {
    return null
  }

  // Check if process is still running
  if (!isProcessRunning(lock.pid)) {
    // Clean up stale lock file
    try {
      await unlink(getDaemonLockPath())
    } catch {
      // Ignore
    }
    return null
  }

  // Try to connect to daemon
  const client = new DaemonClient()
  const connected = await client.connect()
  if (!connected) {
    return null
  }

  const response = await client.request<DaemonStatus>('status', {})
  await client.disconnect()

  if ('error' in response) {
    return null
  }

  return {
    pid: response.result.pid,
    version: response.result.version,
    uptime: response.result.uptime,
    sessions: response.result.sessions,
    socketPath: response.result.socketPath,
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
