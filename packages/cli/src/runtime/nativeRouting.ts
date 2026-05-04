/**
 * Packages-Native Routing Logic
 *
 * Determines whether to use legacy mode or packages-native mode,
 * and which native sub-mode to use (REST or local engine).
 */

import { shouldUseInkUi, getUserArgs } from '../ui/inkAdapter.js'
import {
  hasExplicitServerArg,
  hasLegacyFlag,
  REST_BACKED_COMMANDS,
} from './routeContext.js'

/**
 * Commands that should use REST API in packages-native mode
 */
export const NATIVE_REST_COMMANDS = new Set([
  'mcp', 'models', 'sessions', 'doctor', 'context',
  'stats', 'cost', 'model', 'export', 'assistant',
  'config', 'env', 'permissions', 'auth', 'setup-token',
  'plugin', 'plugins', 'agents', 'completion', 'install',
  'log', 'open', 'server', 'task', 'auto-mode', 'error',
  'remote-control', 'rollback', 'ssh', 'up', 'update', 'upgrade',
])

/**
 * Native mode type
 */
export type NativeModeType = 'rest' | 'local-engine'

/**
 * Native mode configuration
 */
export interface NativeModeConfig {
  /** Whether to use native mode */
  useNative: boolean
  /** Native mode type */
  type: NativeModeType
  /** Server URL (for REST mode) */
  serverUrl?: string
  /** Auth token */
  authToken?: string
  /** First command (if any) */
  command?: string
  /** Raw arguments */
  rawArgs: string[]
}

/**
 * Determine if packages-native mode should be used
 */
export function shouldUseNativeMode(args: string[]): boolean {
  // Legacy flag takes precedence
  if (hasLegacyFlag(args)) {
    return false
  }

  // Check Ink UI decision
  if (shouldUseInkUi(args)) {
    return false
  }

  // Explicit native flag
  if (args.includes('--native') || args.includes('--packages-native')) {
    return true
  }

  // REST-backed commands use packages-native
  const firstCommand = getFirstCommand(args)
  if (firstCommand && NATIVE_REST_COMMANDS.has(firstCommand)) {
    return true
  }

  // Explicit server URL uses packages-native
  if (hasExplicitServerArg(args)) {
    return true
  }

  // Default to legacy
  return false
}

/**
 * Determine the native mode type
 */
export function getNativeModeType(args: string[]): NativeModeType {
  // If --local-engine flag is set, use local QueryEngine
  if (args.includes('--local-engine')) {
    return 'local-engine'
  }

  // If server URL is provided, use REST mode
  if (hasExplicitServerArg(args)) {
    return 'rest'
  }

  // REST-backed commands use REST mode by default
  const firstCommand = getFirstCommand(args)
  if (firstCommand && NATIVE_REST_COMMANDS.has(firstCommand)) {
    return 'rest'
  }

  // Default to local engine for --native flag
  if (args.includes('--native') || args.includes('--packages-native')) {
    return 'local-engine'
  }

  return 'rest'
}

/**
 * Get the first non-flag command from args
 */
export function getFirstCommand(args: string[]): string | undefined {
  for (const arg of args) {
    if (!arg.startsWith('-')) {
      return arg
    }
  }
  return undefined
}

/**
 * Parse native mode configuration from arguments
 */
export function parseNativeConfig(args: string[]): NativeModeConfig {
  const rawArgs = getUserArgs(args)
  const useNative = shouldUseNativeMode(rawArgs)
  const type = getNativeModeType(rawArgs)
  const command = getFirstCommand(rawArgs)

  // Extract server URL
  let serverUrl: string | undefined
  const serverIndex = rawArgs.indexOf('--server')
  if (serverIndex !== -1 && rawArgs[serverIndex + 1]) {
    serverUrl = rawArgs[serverIndex + 1]
  } else if (rawArgs.some(arg => arg.startsWith('--server='))) {
    serverUrl = rawArgs.find(arg => arg.startsWith('--server='))?.split('=')[1]
  }

  // Extract auth token
  let authToken: string | undefined
  const tokenIndex = rawArgs.indexOf('--token')
  if (tokenIndex !== -1 && rawArgs[tokenIndex + 1]) {
    authToken = rawArgs[tokenIndex + 1]
  } else if (rawArgs.includes('--auth-token') && rawArgs[rawArgs.indexOf('--auth-token') + 1]) {
    authToken = rawArgs[rawArgs.indexOf('--auth-token') + 1]
  }

  // Check environment variable
  if (!authToken && process.env.CCLOCAL_API_KEY) {
    authToken = process.env.CCLOCAL_API_KEY
  }

  return {
    useNative,
    type,
    serverUrl,
    authToken,
    command,
    rawArgs,
  }
}
