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
 *
 * NOTE: We don't call getAllMcpConfigs() here because config reading
 * isn't allowed yet at this point. MCP initialization will happen
 * inside REPL.tsx's own startup flow via useMcp hooks.
 */
async function initializeMcpServers(): Promise<void> {
  // MCP is handled by REPL.tsx's own useMcp / useInitialMcpClients hooks.
  // No-op here to avoid accessing config before it's ready.
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
  // Always use monorepo source (has CCLOCAL_USE_QUERY_ENGINE support)
  const srcEntry = join(repoRoot, 'packages', 'cli', 'src', 'entrypoints', 'cli.tsx')
  if (existsSync(srcEntry)) {
    return srcEntry
  }

  // Fallback to compiled dist
  const distEntry = join(repoRoot, 'dist', 'legacy-cli.js')
  if (existsSync(distEntry)) {
    return distEntry
  }

  // Last resort: relative to this file
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
  // ── 1. Set environment flags ───────────────────────────────────────
  // Activate QueryEngine path in REPL.tsx
  process.env.CCLOCAL_USE_QUERY_ENGINE = '1'

  // Pass through API configuration via env
  if (options.apiKey) {
    process.env.ANTHROPIC_API_KEY = options.apiKey
  }
  if (options.baseUrl) {
    process.env.ANTHROPIC_BASE_URL = options.baseUrl
  }

  // ── 2. Build argv for Ink UI ──────────────────────────────────────
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

  // Update process.argv so cli.tsx entrypoint sees correct args
  // cli.tsx auto-executes main() on import, so we just need argv right
  process.argv = [process.argv[0]!, entrypoint, ...inkArgs]

  // ── 3. Import cli.tsx — it auto-runs main() ───────────────────────
  // The import triggers cli.tsx's top-level `void main()` call,
  // which parses process.argv, detects CCLOCAL_USE_QUERY_ENGINE=1,
  // and routes to REPL.tsx with createQueryEngineAdapter.
  // Log the routing for debugging
  if (process.env.CCLOCAL_DEBUG === '1') {
    console.error(`[ink-bridge] entrypoint=${entrypoint}`)
    console.error(`[ink-bridge] argv=${process.argv.join(' ')}`)
    console.error(`[ink-bridge] CCLOCAL_USE_QUERY_ENGINE=${process.env.CCLOCAL_USE_QUERY_ENGINE}`)
  }
  await import(entrypoint)
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
