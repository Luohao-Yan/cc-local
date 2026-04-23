import type { Tool } from '@cclocal/shared'

export type PermissionMode = 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions'

export interface PermissionPolicy {
  mode?: PermissionMode
  allowedTools?: string[]
  blockedTools?: string[]
}

export interface PermissionDecision {
  allowed: boolean
  reason?: string
}

const HIGH_RISK_TOOLS = new Set([
  'bash',
  'file_write',
  'file_edit',
])

const EDIT_TOOLS = new Set([
  'file_write',
  'file_edit',
])

function normalizeToolName(toolName: string): string {
  if (toolName.startsWith('mcp__')) {
    return toolName
  }
  return toolName
}

function matchesToolPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*' || pattern === toolName) {
    return true
  }
  if (pattern.endsWith('*')) {
    return toolName.startsWith(pattern.slice(0, -1))
  }
  return false
}

function matchesAny(toolName: string, patterns?: string[]): boolean {
  return Boolean(patterns?.some((pattern) => matchesToolPattern(toolName, pattern)))
}

export function decideToolPermission(toolName: string, policy: PermissionPolicy = {}): PermissionDecision {
  const name = normalizeToolName(toolName)
  const mode = policy.mode || 'default'

  if (mode === 'bypassPermissions') {
    return { allowed: true }
  }

  if (matchesAny(name, policy.blockedTools)) {
    return {
      allowed: false,
      reason: `Tool "${name}" is blocked by policy`,
    }
  }

  if (matchesAny(name, policy.allowedTools)) {
    return { allowed: true }
  }

  if (policy.allowedTools && policy.allowedTools.length > 0) {
    return {
      allowed: false,
      reason: `Tool "${name}" is not in the allowed tools list`,
    }
  }

  if (mode === 'dontAsk' && HIGH_RISK_TOOLS.has(name)) {
    return {
      allowed: false,
      reason: `Tool "${name}" requires approval in dontAsk mode`,
    }
  }

  if (mode === 'acceptEdits' && HIGH_RISK_TOOLS.has(name) && !EDIT_TOOLS.has(name)) {
    return {
      allowed: false,
      reason: `Tool "${name}" is not an edit tool and requires approval in acceptEdits mode`,
    }
  }

  return { allowed: true }
}

export function filterToolsByPermission(tools: Tool[], policy: PermissionPolicy = {}): Tool[] {
  return tools.filter((tool) => decideToolPermission(tool.name, policy).allowed)
}
