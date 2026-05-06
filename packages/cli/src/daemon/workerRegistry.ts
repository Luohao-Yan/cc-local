/**
 * Worker Registry - Entry point for `--daemon-worker` child processes
 *
 * Workers are spawned by the daemon supervisor to handle background sessions.
 */

import { createWriteStream, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import { jsonParse } from '../utils/slowOperations.js'
import { logForDebugging } from '../utils/debug.js'
import {
  ENV_WORKER_OPTIONS,
  ENV_DAEMON_FORKED,
  ENV_SESSION_KIND,
  ENV_SESSION_NAME,
  ENV_SESSION_LOG,
  getDaemonLogsDir,
  getSessionLogPath,
} from './transport.js'

export type WorkerKind = 'bg-session' | 'assistant'

export interface WorkerOptions {
  kind: WorkerKind
  sessionId: string
  cwd?: string
  agent?: string
  name?: string
  logPath?: string
}

/**
 * Run a daemon worker based on the kind
 */
export async function runDaemonWorker(kind: string | undefined): Promise<void> {
  if (!kind) {
    console.error('Worker kind required')
    process.exit(1)
  }

  // Get worker options from environment
  const optionsJson = process.env[ENV_WORKER_OPTIONS]
  let options: WorkerOptions

  if (optionsJson) {
    try {
      options = jsonParse(optionsJson) as WorkerOptions
    } catch {
      console.error('Invalid worker options')
      process.exit(1)
      return
    }
  } else {
    options = { kind: kind as WorkerKind, sessionId: `worker-${process.pid}` }
  }

  logForDebugging(`[Worker] Starting ${kind} worker with options: ${JSON.stringify(options)}`)

  switch (kind) {
    case 'bg-session':
      return runBgSessionWorker(options)
    case 'assistant':
      return runAssistantWorker(options)
    default:
      console.error(`Unknown worker kind: ${kind}`)
      process.exit(1)
  }
}

/**
 * Run a background session worker
 */
async function runBgSessionWorker(options: WorkerOptions): Promise<void> {
  const { sessionId, cwd } = options

  // Set up log file
  const logPath = process.env[ENV_SESSION_LOG] || getSessionLogPath(sessionId || `worker-${process.pid}`)

  // Ensure logs directory exists
  try {
    mkdirSync(getDaemonLogsDir(), { recursive: true })
  } catch {
    // Ignore
  }

  // Redirect output to log file
  const logStream = createWriteStream(logPath, { flags: 'a' })

  // Tee output to both stdout and log file
  const originalStdoutWrite = process.stdout.write.bind(process.stdout) as typeof process.stdout.write
  const originalStderrWrite = process.stderr.write.bind(process.stderr) as typeof process.stderr.write

  // @ts-ignore - Bun/Node type mismatch
  process.stdout.write = (chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (err?: Error | null) => void) => {
    logStream.write(chunk)
    return originalStdoutWrite(chunk as string, encoding as BufferEncoding, cb as (err?: Error | null) => void)
  }

  // @ts-ignore - Bun/Node type mismatch
  process.stderr.write = (chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: (err?: Error | null) => void) => {
    logStream.write(chunk)
    return originalStderrWrite(chunk as string, encoding as BufferEncoding, cb as (err?: Error | null) => void)
  }

  logForDebugging(`[Worker] Background session started: ${sessionId}`)
  logForDebugging(`[Worker] Log file: ${logPath}`)

  try {
    // Import and run the main REPL
    // The main REPL will pick up the environment variables for session registration
    const { main } = await import('../main.js')

    // Set up process.cwd() to the session's working directory
    if (cwd) {
      process.chdir(cwd)
    }

    // Run the main REPL
    await main()
  } catch (e) {
    logForDebugging(`[Worker] Session error: ${(e as Error).message}`)
    process.exit(1)
  } finally {
    logStream.end()
  }
}

/**
 * Run an assistant worker (for Agent SDK daemon mode)
 */
async function runAssistantWorker(options: WorkerOptions): Promise<void> {
  logForDebugging(`[Worker] Assistant worker started: ${options.sessionId}`)

  // TODO: Implement assistant worker for Agent SDK daemon mode
  // This would use the agent SDK to run as a daemon

  console.log('Assistant worker not yet implemented')
  process.exit(1)
}

/**
 * Spawn a worker process (used by supervisor)
 */
export function spawnWorker(options: WorkerOptions): ReturnType<typeof spawn> {
  const env = {
    ...process.env,
    [ENV_DAEMON_FORKED]: '1',
    [ENV_WORKER_OPTIONS]: JSON.stringify(options),
    [ENV_SESSION_KIND]: 'bg',
    [ENV_SESSION_NAME]: options.name || '',
    [ENV_SESSION_LOG]: options.logPath || getSessionLogPath(options.sessionId),
  }

  return spawn(process.execPath, [
    process.argv[1]!,
    '--daemon-worker',
    options.kind,
  ], {
    cwd: options.cwd || process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
}
