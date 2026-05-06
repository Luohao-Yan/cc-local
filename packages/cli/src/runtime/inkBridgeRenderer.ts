/**
 * Ink Bridge Renderer
 *
 * Bridges packages-native mode to the Ink UI.
 * This is the primary path for `--ink-bridge` mode:
 * QueryEngine (from @cclocal/core) as backend, Ink UI as frontend.
 *
 * Strategy: Set CCLOCAL_USE_QUERY_ENGINE=1 to activate the
 * createQueryEngineAdapter path in REPL.tsx, then call main()
 * directly from main.js.
 */

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
 * 3. Importing main.js and calling main() directly (awaited, not fire-and-forget)
 *
 * The Ink UI (REPL.tsx) already has the correct dispatch:
 *   const query = shouldUseQueryEngine() ? createQueryEngineAdapter : legacyQuery
 * So we just need to flip the switch.
 */
export async function renderInkBridgeRepl(options: InkBridgeOptions = {}): Promise<void> {
  // ── 1. Set environment flags ───────────────────────────────────────
  // Activate QueryEngine path in REPL.tsx
  process.env.CCLOCAL_USE_QUERY_ENGINE = '1'
  process.env.CCLOCAL_FORCE_INTERACTIVE = '1'

  // Pass through API configuration via env
  if (options.apiKey) {
    process.env.ANTHROPIC_API_KEY = options.apiKey
  }
  if (options.baseUrl) {
    process.env.ANTHROPIC_BASE_URL = options.baseUrl
  }

  // ── 2. Build argv for Ink UI ──────────────────────────────────────
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

  // Update process.argv so main.js sees correct args
  process.argv = [process.argv[0]!, 'ink-bridge', ...inkArgs]

  // ── 3. Import main.js and call main() directly ───────────────────────
  // This ensures we wait for main() to complete instead of fire-and-forget.
  // cli.tsx has `void main()` which is fire-and-forget, causing early exit.
  const { main } = await import('../main.js')
  await main()
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
