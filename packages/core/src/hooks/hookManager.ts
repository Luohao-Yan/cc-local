/**
 * Hook System - Pre/post tool execution hooks
 *
 * Allows users to register scripts that run before or after tool calls.
 * Hooks can modify inputs, block execution, or transform outputs.
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export type HookEvent = 'pre_tool' | 'post_tool' | 'pre_query' | 'post_query' | 'stop' | 'session_start' | 'session_end'

export interface HookConfig {
  event: HookEvent
  command: string
  timeout?: number
  enabled?: boolean
}

export interface HookResult {
  exitCode: number
  stdout: string
  stderr: string
  blocked?: boolean
  modifiedInput?: unknown
}

const HOOKS_DIR = join(homedir(), '.cclocal', 'hooks')
const HOOKS_FILE = join(HOOKS_DIR, 'hooks.json')

let hooksCache: HookConfig[] | null = null

function loadHooks(): HookConfig[] {
  if (hooksCache) return hooksCache
  try {
    if (existsSync(HOOKS_FILE)) {
      hooksCache = JSON.parse(readFileSync(HOOKS_FILE, 'utf-8'))
    } else {
      hooksCache = []
    }
  } catch {
    hooksCache = []
  }
  return hooksCache!
}

function saveHooks(hooks: HookConfig[]): void {
  if (!existsSync(HOOKS_DIR)) {
    mkdirSync(HOOKS_DIR, { recursive: true })
  }
  writeFileSync(HOOKS_FILE, JSON.stringify(hooks, null, 2), 'utf-8')
  hooksCache = hooks
}

export function listHooks(event?: HookEvent): HookConfig[] {
  const hooks = loadHooks()
  return event ? hooks.filter((h) => h.event === event) : hooks
}

export function registerHook(hook: HookConfig): void {
  const hooks = loadHooks()
  hooks.push({ ...hook, enabled: hook.enabled ?? true })
  saveHooks(hooks)
}

export function removeHook(event: HookEvent, command: string): boolean {
  const hooks = loadHooks()
  const index = hooks.findIndex((h) => h.event === event && h.command === command)
  if (index !== -1) {
    hooks.splice(index, 1)
    saveHooks(hooks)
    return true
  }
  return false
}

export async function executeHooks(
  event: HookEvent,
  context: {
    toolName?: string
    input?: unknown
    output?: unknown
    sessionId?: string
  }
): Promise<HookResult[]> {
  const hooks = loadHooks().filter((h) => h.event === event && h.enabled !== false)
  const results: HookResult[] = []

  for (const hook of hooks) {
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      CCLOCAL_HOOK_EVENT: event,
      CCLOCAL_SESSION_ID: context.sessionId ?? '',
    }
    if (context.toolName) env.CCLOCAL_TOOL_NAME = context.toolName
    if (context.input) env.CCLOCAL_TOOL_INPUT = JSON.stringify(context.input)
    if (context.output) env.CCLOCAL_TOOL_OUTPUT = JSON.stringify(context.output)

    try {
      const result = execSync(hook.command, {
        encoding: 'utf-8',
        timeout: hook.timeout ?? 5000,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      results.push({
        exitCode: 0,
        stdout: result.toString(),
        stderr: '',
        blocked: result.toString().includes('BLOCK'),
      })
    } catch (error: any) {
      results.push({
        exitCode: error.status ?? 1,
        stdout: error.stdout?.toString() ?? '',
        stderr: error.stderr?.toString() ?? '',
        blocked: error.status !== 0,
      })
    }
  }

  return results
}