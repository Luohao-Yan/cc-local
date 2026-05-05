/**
 * Ink Bridge Renderer
 *
 * Bridges packages-native mode to the Ink UI.
 * This is the primary path for `--ink-bridge` mode:
 * QueryEngine (from @cclocal/core) as backend, Ink UI as frontend.
 *
 * Strategy: Set CCLOCAL_USE_QUERY_ENGINE=1 to activate the
 * createQueryEngineAdapter path in REPL.tsx, then delegate
 * to the Ink UI entrypoint in the same process.
 */

import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// ── Options ──────────────────────────────────────────────────────────────

export interface InkBridgeOptions {
  /** Model override */
  model?: string
  /** CWD for the session */
  cwd?: string
  /** Session ID to resume */
  sessionId?: string
  /** Server URL for remote bridge */
  serverUrl?: string
  /** Auth token for remote bridge */
  authToken?: string
  /** Print mode (single prompt) */
  print?: string
  /** Output format */
  outputFormat?: string
  /** Max turns for tool loop */
  maxTurns?: number
  /** API key override */
  apiKey?: string
  /** Base URL override */
  baseUrl?: string
  /** API format: 'anthropic' or 'openai' */
  apiFormat?: 'anthropic' | 'openai'
  /** Additional args to pass through */
  extraArgs?: string[]
}

// ── MCP initialization ──────────────────────────────────────────────────

/**
 * Initialize MCP servers from config for Bridge mode.
 * The core MCPManager will be used by QueryEngine for tool calls.
 */
async function initializeMcpServers(): Promise<void> {
  try {
    const coreModule = await import('@cclocal/core')
    const { getAllMcpConfigs } = await import('../services/mcp/config.js')

    const mcpManager = (coreModule as any).getMCPManager?.() ?? (coreModule as any).MCPManager?.getInstance?.()
    const { servers } = await getAllMcpConfigs()

    // Register servers with the core MCPManager
    for (const [name, config] of Object.entries(servers)) {
      try {
        mcpManager.registerServer(name, config)
      } catch {
        // Server might already be registered
      }
    }

    // Connect all registered servers
    for (const server of mcpManager.listServers()) {
      if (server.status === 'registered' || server.status === 'disconnected') {
        try {
          await mcpManager.connectServer(server.name)
        } catch {
          // Connection failures are recorded in server record
        }
      }
    }
  } catch (error) {
    // MCP initialization failure shouldn't block the REPL
    console.error('MCP initialization failed:', error)
  }
}

// ── Entrypoint resolution ──────────────────────────────────────────────

function findRepoRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 8; depth += 1) {
    if (!existsSync(join(current, 'package.json'))) {
      current = dirname(current)
      continue
    }
    if (existsSync(join(current, 'packages', 'cli', 'src', 'entrypoints', 'cli.tsx'))) {
      return current
    }
    current = dirname(current)
  }
  return process.cwd()
}

function resolveInkEntrypoint(repoRoot = findRepoRoot()): string {
  // Prefer compiled dist (faster startup)
  const distEntry = join(repoRoot, 'dist', 'legacy-cli.js')
  if (existsSync(distEntry)) {
    return distEntry
  }

  // Monorepo source
  const srcEntry = join(repoRoot, 'packages', 'cli', 'src', 'entrypoints', 'cli.tsx')
  if (existsSync(srcEntry)) {
    return srcEntry
  }

  // Fallback: relative to this file
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'entrypoints', 'cli.tsx')
}

// ── Strip packages-only args ───────────────────────────────────────────

const PACKAGES_ONLY_FLAGS = new Set([
  '--ink-bridge', '--legacy-bridge',
  '--native', '--packages-native',
  '--local-engine',
])

function stripBridgeArgs(args: string[]): string[] {
  return args.filter((arg) => !PACKAGES_ONLY_FLAGS.has(arg))
}

// ── Main: renderInkBridgeRepl ───────────────────────────────────────────

/**
 * Launch the Ink UI with QueryEngine backend.
 *
 * This works by:
 * 1. Setting CCLOCAL_USE_QUERY_ENGINE=1 so REPL.tsx picks createQueryEngineAdapter
 * 2. Setting CCLOCAL_FORCE_INTERACTIVE=1 for interactive mode
 * 3. Setting CCLOCAL_IMPORTED=1 to prevent auto-execution of cli.tsx
 * 4. Importing and running the Ink UI entrypoint in-process
 *
 * The Ink UI (REPL.tsx) already has the correct dispatch:
 *   const query = shouldUseQueryEngine() ? createQueryEngineAdapter : legacyQuery
 * So we just need to flip the switch.
 */
export async function renderInkBridgeRepl(options: InkBridgeOptions = {}): Promise<void> {
  // ── 1. Initialize MCP servers ──────────────────────────────────────
  await initializeMcpServers()

  // ── 2. Set environment flags ───────────────────────────────────────
  // Activate QueryEngine path in REPL.tsx
  process.env.CCLOCAL_USE_QUERY_ENGINE = '1'

  // Force interactive mode
  process.env.CCLOCAL_FORCE_INTERACTIVE = '1'

  // Prevent cli.tsx from auto-executing main() at import time
  process.env.CCLOCAL_IMPORTED = '1'

  // Pass through API configuration via env
  if (options.apiKey) {
    process.env.ANTHROPIC_API_KEY = options.apiKey
  }
  if (options.baseUrl) {
    process.env.ANTHROPIC_BASE_URL = options.baseUrl
  }

  // ── 3. Build argv for Ink UI ──────────────────────────────────────
  const entrypoint = resolveInkEntrypoint()
  const inkArgs: string[] = []

  if (options.model) inkArgs.push('--model', options.model)
  if (options.cwd) inkArgs.push('--cwd', options.cwd)
  if (options.sessionId) inkArgs.push('--resume', options.sessionId)
  if (options.print) inkArgs.push('--print', options.print)
  if (options.outputFormat) inkArgs.push('--output-format', options.outputFormat)
  if (options.maxTurns) inkArgs.push('--max-turns', String(options.maxTurns))
  if (options.apiFormat) inkArgs.push('--api-format', options.apiFormat)

  // Strip packages-only flags, pass through the rest
  if (options.extraArgs) {
    inkArgs.push(...stripBridgeArgs(options.extraArgs))
  }

  // Update process.argv so Ink UI entrypoint sees correct args
  process.argv = [process.argv[0]!, entrypoint, ...inkArgs]

  // ── 4. Import and run the Ink UI entrypoint ───────────────────────
  const entryModule = await import(entrypoint)

  // cli.tsx exports a `main` function when CCLOCAL_IMPORTED=1
  if (typeof entryModule.main === 'function') {
    await entryModule.main()
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Check if Ink bridge mode should be used
 */
export function shouldUseInkBridge(args: string[]): boolean {
  return args.some((arg) =>
    arg === '--ink-bridge' ||
    arg === '--legacy-bridge' ||
    arg === '--ink'
  )
}

/**
 * Get bridge server URL from args
 */
export function getBridgeServerUrl(args: string[]): string | undefined {
  const serverIndex = args.indexOf('--server')
  if (serverIndex !== -1 && args[serverIndex + 1]) {
    return args[serverIndex + 1]
  }
  return undefined
}

/**
 * Get bridge auth token from args
 */
export function getBridgeAuthToken(args: string[]): string | undefined {
  const tokenIndex = args.indexOf('--token')
  if (tokenIndex !== -1 && args[tokenIndex + 1]) {
    return args[tokenIndex + 1]
  }
  return process.env.CCLOCAL_API_KEY
}
