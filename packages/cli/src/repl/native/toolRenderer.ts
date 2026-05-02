/**
 * Per-tool text renderers for native REPL
 *
 * Replaces raw JSON output with readable summaries, matching the
 * information density of the legacy Ink UI render methods.
 */

import chalk from 'chalk'
import { renderDiff, renderCodeBlock } from './renderer.js'
import { getDisplayPath } from '../../utils/file.js'

// ─── Tool use message renderers ─────────────────────────────────────

/** Render the "tool called" summary line */
export function renderToolUse(toolName: string, input: Record<string, unknown>, verbose: boolean): string {
  const renderers: Record<string, (input: Record<string, unknown>, verbose: boolean) => string> = {
    bash: renderBashUse,
    file_read: renderFileReadUse,
    file_write: renderFileWriteUse,
    file_edit: renderFileEditUse,
    glob: renderGrepGlobUse,
    grep: renderGrepGlobUse,
    web_fetch: renderWebFetchUse,
    web_search: renderWebSearchUse,
    agent: renderAgentUse,
    task_create: renderTaskUse,
    task_update: renderTaskUse,
    notebook_edit: renderNotebookEditUse,
  }

  const renderer = renderers[toolName]
  if (renderer) return renderer(input, verbose)

  // Generic fallback
  return chalk.dim(`🔧 ${toolName}`) + (verbose ? chalk.dim(` ${truncateJson(input)}`) : '')
}

/** Render the "tool result" summary line */
export function renderToolResult(toolName: string, output: string, isError?: boolean): string {
  if (isError) {
    return chalk.red(`  ✖ ${toolName}: ${truncate(output, 200)}`)
  }

  const renderers: Record<string, (output: string) => string> = {
    bash: renderBashResult,
    file_read: renderFileReadResult,
    file_edit: renderFileEditResult,
    glob: renderSearchResult,
    grep: renderSearchResult,
  }

  const renderer = renderers[toolName]
  if (renderer) return renderer(output)

  // Generic: first line or truncated
  const first = output.split('\n')[0]
  if (first.length < 80 && output.split('\n').length <= 2) {
    return chalk.dim(`  ✔ ${first}`)
  }
  return chalk.dim(`  ✔ ${toolName}: ${truncate(output, 120)}`)
}

// ─── Per-tool renderers ─────────────────────────────────────────────

function renderBashUse(input: Record<string, unknown>, verbose: boolean): string {
  const cmd = String(input.command ?? '')
  if (verbose) {
    return chalk.dim('🔧 bash') + '\n' + renderCodeBlock(cmd, 'bash')
  }
  // Extract comment labels like "# label"
  const label = cmd.match(/#\s*(.+)/)?.[1]
  if (label) return chalk.dim('🔧 bash:') + ` ${label}`
  return chalk.dim('🔧 bash:') + ` ${truncate(cmd, 80)}`
}

function renderBashResult(output: string): string {
  const lines = output.split('\n').filter(Boolean)
  if (lines.length === 0) return chalk.dim('  ✔ (no output)')
  if (lines.length <= 3) return chalk.dim(`  ✔ ${output.trim()}`)
  return chalk.dim(`  ✔ ${lines.length} lines`) + chalk.dim.dim(` | first: ${truncate(lines[0], 60)}`)
}

function renderFileReadUse(input: Record<string, unknown>, verbose: boolean): string {
  const path = getDisplayPath(String(input.file_path ?? ''))
  const lineInfo = input.offset != null ? ` (lines ${input.offset}+${input.limit ?? ''})` : ''
  return chalk.dim('📖 read:') + ` ${path}${chalk.dim(lineInfo)}`
}

function renderFileReadResult(output: string): string {
  const lines = output.split('\n')
  if (lines.length <= 1) return chalk.dim('  ✔ (empty)')
  return chalk.dim(`  ✔ Read ${lines.length} lines`)
}

function renderFileWriteUse(input: Record<string, unknown>, verbose: boolean): string {
  const path = getDisplayPath(String(input.file_path ?? ''))
  return chalk.dim('✏️  write:') + ` ${path}`
}

function renderFileEditUse(input: Record<string, unknown>, verbose: boolean): string {
  const path = getDisplayPath(String(input.file_path ?? ''))
  return chalk.dim('📝 edit:') + ` ${path}`
}

function renderFileEditResult(output: string): string {
  // If output looks like it contains diff info, show it
  if (output.includes('+++') || output.includes('@@')) {
    return '\n' + renderDiff('', output.split('\n').filter(l => !l.startsWith('---') && !l.startsWith('+++')).join('\n')).split('\n').map(l => '  ' + l).join('\n')
  }
  return chalk.dim('  ✔ File edited')
}

function renderGrepGlobUse(input: Record<string, unknown>, verbose: boolean): string {
  const pattern = String(input.pattern ?? '')
  const path = input.path ? getDisplayPath(String(input.path)) : '.'
  return chalk.dim('🔍 search:') + ` ${chalk.bold(truncate(pattern, 40))} ${chalk.dim(`in ${path}`)}`
}

function renderWebFetchUse(input: Record<string, unknown>, verbose: boolean): string {
  const url = String(input.url ?? '')
  return chalk.dim('🌐 fetch:') + ` ${truncate(url, 80)}`
}

function renderWebSearchUse(input: Record<string, unknown>, verbose: boolean): string {
  const query = String(input.query ?? '')
  return chalk.dim('🔎 search:') + ` ${truncate(query, 80)}`
}

function renderAgentUse(input: Record<string, unknown>, verbose: boolean): string {
  const desc = String(input.description ?? input.prompt ?? '')
  return chalk.dim('🤖 agent:') + ` ${truncate(desc, 80)}`
}

function renderTaskUse(input: Record<string, unknown>, verbose: boolean): string {
  const subject = String(input.subject ?? input.description ?? '')
  return chalk.dim('📋 task:') + ` ${truncate(subject, 80)}`
}

function renderNotebookEditUse(input: Record<string, unknown>, verbose: boolean): string {
  const path = getDisplayPath(String(input.notebook_path ?? ''))
  return chalk.dim('📓 notebook:') + ` ${path}`
}

function renderSearchResult(output: string): string {
  const lines = output.split('\n').filter(Boolean)
  if (lines.length <= 5) {
    return lines.map(l => `  ${chalk.dim(l)}`).join('\n')
  }
  const fileCount = new Set(lines.map(l => l.split(':')[0])).size
  return chalk.dim(`  ✔ Found ${lines.length} matches in ${fileCount} files`)
}

// ─── Helpers ─────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 3) + '...'
}

function truncateJson(obj: unknown): string {
  return truncate(JSON.stringify(obj), 120)
}
