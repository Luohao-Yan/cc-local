/**
 * Configuration Loader for Packages-Native Mode
 *
 * Supports loading configuration from:
 * 1. Environment variables
 * 2. Local config file (~/.claude/cclocal.json)
 * 3. Interactive prompts when needed
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface NativeConfig {
  /** Anthropic API key */
  apiToken?: string

  /** Server URL for remote mode */
  serverUrl?: string

  /** Default model */
  model?: string

  /** Default mode (local or remote) */
  defaultMode?: 'local' | 'remote'

  /** Max turns for queries */
  maxTurns?: number

  /** Working directory */
  cwd?: string
}

const CONFIG_DIR = join(homedir(), '.claude')
const CONFIG_FILE = join(CONFIG_DIR, 'cclocal.json')

/**
 * Load configuration from all sources
 */
export async function loadNativeConfig(): Promise<NativeConfig> {
  const config: NativeConfig = {}

  // 1. Load from file
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileContent = readFileSync(CONFIG_FILE, 'utf-8')
      const fileConfig = JSON.parse(fileContent)
      Object.assign(config, fileConfig)
    } catch (error) {
      // Ignore parse errors
    }
  }

  // 2. Override with environment variables
  if (process.env.ANTHROPIC_API_KEY) {
    config.apiToken = process.env.ANTHROPIC_API_KEY
  }
  if (process.env.CCLOCAL_SERVER_URL) {
    config.serverUrl = process.env.CCLOCAL_SERVER_URL
  }
  if (process.env.CCLOCAL_MODEL) {
    config.model = process.env.CCLOCAL_MODEL
  }
  if (process.env.CCLOCAL_DEFAULT_MODE) {
    config.defaultMode = process.env.CCLOCAL_DEFAULT_MODE as 'local' | 'remote'
  }
  if (process.env.CCLOCAL_MAX_TURNS) {
    config.maxTurns = parseInt(process.env.CCLOCAL_MAX_TURNS, 10)
  }

  return config
}

/**
 * Save configuration to file
 */
export async function saveNativeConfig(config: Partial<NativeConfig>): Promise<void> {
  // Ensure directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  // Load existing config
  let existingConfig: NativeConfig = {}
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileContent = readFileSync(CONFIG_FILE, 'utf-8')
      existingConfig = JSON.parse(fileContent)
    } catch {
      // Ignore errors
    }
  }

  // Merge and save
  const newConfig = { ...existingConfig, ...config }
  writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2))
}

/**
 * Ensure API key is available
 * Prompts user if not set
 */
export async function ensureApiKey(): Promise<string> {
  const config = await loadNativeConfig()

  if (config.apiToken) {
    return config.apiToken
  }

  // No API key available - prompt user
  console.log('\n🔑 API Key Required\n')
  console.log('Local engine mode requires an Anthropic API key.')
  console.log('')
  console.log('Options:')
  console.log('  1. Set ANTHROPIC_API_KEY environment variable')
  console.log('  2. Run: cclocal config set apiToken <key>')
  console.log('  3. Use --server flag to connect to a remote server')
  console.log('')

  // In non-interactive mode, throw error
  if (!process.stdin.isTTY) {
    throw new Error('API key required. Set ANTHROPIC_API_KEY or use --server flag.')
  }

  // Interactive prompt
  const readline = await import('node:readline/promises')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const key = await rl.question('Enter your Anthropic API key: ')

    if (!key.trim()) {
      throw new Error('API key is required')
    }

    // Save for future use
    await saveNativeConfig({ apiToken: key.trim() })

    return key.trim()
  } finally {
    rl.close()
  }
}

/**
 * Get config value with fallback
 */
export function getConfigValue<K extends keyof NativeConfig>(
  config: NativeConfig,
  key: K,
  fallback: NativeConfig[K]
): NativeConfig[K] {
  return config[key] ?? fallback
}
