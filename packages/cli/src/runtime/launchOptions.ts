import { existsSync, readFileSync } from 'fs'
import { getRawUserOptionValue } from './routeContext.js'

export interface RootLaunchOptions {
  model?: string
  authToken?: string
  systemPrompt?: string
  cwd?: string
  workspace?: string
  print?: string
  text?: string
  sessionId?: string
  name?: string
  maxTurns?: number
  maxThinkingTokens?: number
  fallbackModel?: string
  settings?: string[]
  forkSession?: boolean
  outputFormat?: 'text' | 'json' | 'stream-json'
  inputFormat?: 'text' | 'stream-json'
  includePartialMessages?: boolean
  replayUserMessages?: boolean
  sessionPersistence?: boolean
  jsonSchema?: string
  thinking?: 'enabled' | 'adaptive' | 'disabled'
  teammateMode?: 'auto' | 'tmux' | 'in-process'
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  allowDangerouslySkipPermissions?: boolean
  allowedTools?: string
  disallowedTools?: string
  mcpConfig?: string[]
  strictMcpConfig?: boolean
  systemPromptFile?: string
  appendSystemPrompt?: string
  appendSystemPromptFile?: string
  [key: string]: any
}

export function buildEffectiveRootOptions(options: RootLaunchOptions, rawArgs: string[]): RootLaunchOptions {
  const settings = loadSettingsFromOptions(options)
  const rawPrint = getRawUserOptionValue(rawArgs, '--print')

  return {
    ...options,
    model: options.model || getStringSetting(settings, 'model'),
    authToken: options.authToken || getStringSetting(settings, 'authToken') || getStringSetting(settings, 'apiToken'),
    systemPrompt: options.systemPrompt || getStringSetting(settings, 'systemPrompt'),
    cwd: getRawUserOptionValue(rawArgs, '--cwd') || options.workspace || getStringSetting(settings, 'workspace') || options.cwd,
    print: options.print || options.text || rawPrint || getRawUserOptionValue(rawArgs, '--text'),
    sessionId: options.sessionId || getRawUserOptionValue(rawArgs, '--session-id'),
    name: options.name || getRawUserOptionValue(rawArgs, '--name') || getRawUserOptionValue(rawArgs, '-n') || getStringSetting(settings, 'name'),
    maxTurns: options.maxTurns ?? parseOptionalIntegerOption(getRawUserOptionValue(rawArgs, '--max-turns')),
    maxThinkingTokens: options.maxThinkingTokens ?? parseOptionalIntegerOption(getRawUserOptionValue(rawArgs, '--max-thinking-tokens')),
    fallbackModel: options.fallbackModel || getRawUserOptionValue(rawArgs, '--fallback-model') || getStringSetting(settings, 'fallbackModel'),
  }
}

export function loadSettingsFromOptions(options: { settings?: string[] } = {}): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const value of options.settings || []) {
    Object.assign(merged, readJsonFileOrString(value, '--settings'))
  }
  return merged
}

export function getStringSetting(settings: Record<string, unknown>, key: string): string | undefined {
  const value = settings[key]
  return typeof value === 'string' ? value : undefined
}

function parseOptionalIntegerOption(value?: string): number | undefined {
  return value === undefined ? undefined : parseIntegerOption(value)
}

function parseIntegerOption(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received "${value}".`)
  }
  return parsed
}

function readJsonFileOrString(value: string, flagName: string): Record<string, unknown> {
  const raw = existsSync(value) ? readFileSync(value, 'utf-8') : value
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('expected a JSON object')
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    throw new Error(`Invalid ${flagName} value "${value}": ${error instanceof Error ? error.message : String(error)}`)
  }
}
