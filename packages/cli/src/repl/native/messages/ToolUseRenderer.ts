/**
 * Tool Use Message Renderer
 *
 * Renders tool use messages with input preview and execution status.
 */

import chalk from 'chalk'
import { renderToolUse } from '../toolRenderer.js'
import type { AssistantToolUseMessage } from './types.js'

/**
 * Render tool use message
 */
export function renderToolUseMessage(msg: AssistantToolUseMessage, width: number = 80): string {
  const lines: string[] = []

  // Use the shared tool renderer (verbose=false for compact display)
  const toolLine = renderToolUse(msg.toolName, msg.input, false)
  lines.push(toolLine)

  // Execution status
  if (msg.isExecuting) {
    lines.push(chalk.dim('   ⏳ Executing...'))
  } else if (msg.duration !== undefined) {
    lines.push(chalk.dim(`   ✓ Completed in ${msg.duration}ms`))
  }

  return lines.join('\n')
}

/**
 * Render tool use summary (for grouped display)
 */
export function renderToolUseSummary(toolName: string, input: Record<string, unknown>): string {
  const summary = getToolSummary(toolName, input)
  return chalk.yellow(`🔧 ${toolName}`) + chalk.dim(` ${summary}`)
}

/**
 * Get one-line summary of tool input
 */
function getToolSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'bash':
      return input.command ? `"${String(input.command).slice(0, 30)}"` : ''
    case 'file_read':
    case 'read':
      return input.file_path ? String(input.file_path) : ''
    case 'file_write':
    case 'write':
      return input.file_path ? `→ ${String(input.file_path)}` : ''
    case 'file_edit':
    case 'edit':
      return input.file_path ? `✏ ${String(input.file_path)}` : ''
    case 'glob':
      return input.pattern ? String(input.pattern) : ''
    case 'grep':
      return input.pattern ? `"${String(input.pattern)}"` : ''
    case 'web_fetch':
      return input.url ? String(input.url).slice(0, 40) : ''
    case 'web_search':
      return input.query ? `"${String(input.query)}"` : ''
    case 'agent':
      return input.description ? String(input.description).slice(0, 40) : ''
    case 'task_create':
    case 'task_update':
      return input.subject ? String(input.subject) : ''
    default:
      return ''
  }
}

/**
 * Render tool use with result preview
 */
export function renderToolUseWithResult(
  toolName: string,
  input: Record<string, unknown>,
  resultPreview?: string
): string {
  const lines: string[] = []

  // Tool name and summary
  const summary = getToolSummary(toolName, input)
  lines.push(chalk.yellow(`🔧 ${toolName}`) + (summary ? chalk.dim(` ${summary}`) : ''))

  // Result preview
  if (resultPreview) {
    const truncated = resultPreview.slice(0, 100)
    lines.push(chalk.dim(`   → ${truncated}${resultPreview.length > 100 ? '...' : ''}`))
  }

  return lines.join('\n')
}
