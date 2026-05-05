/**
 * Permission Dialog Renderer
 *
 * Renders permission request dialogs for the Native REPL.
 * Provides per-tool-type formatting with colored borders and input previews.
 */

import chalk from 'chalk'
import { renderDiff, renderCodeBlock } from '../renderer.js'
import type {
  PermissionRequest,
  PermissionDecision,
  BashPermissionRequest,
  FileEditPermissionRequest,
  FileWritePermissionRequest,
  FilesystemPermissionRequest,
  WebFetchPermissionRequest,
  ExitPlanModePermissionRequest,
} from './PermissionTypes.js'

/**
 * Tool-specific display configuration
 */
const TOOL_DISPLAY: Record<string, { icon: string; label: string; color: (s: string) => string }> = {
  bash: { icon: '$', label: 'Bash Command', color: chalk.yellow },
  powershell: { icon: '>', label: 'PowerShell', color: chalk.yellow },
  file_edit: { icon: '✏', label: 'File Edit', color: chalk.blue },
  file_write: { icon: '✎', label: 'File Write', color: chalk.magenta },
  file_read: { icon: '📖', label: 'File Read', color: chalk.dim },
  glob: { icon: '🔍', label: 'Glob Search', color: chalk.cyan },
  grep: { icon: '🔍', label: 'Grep Search', color: chalk.cyan },
  web_fetch: { icon: '🌐', label: 'Web Fetch', color: chalk.green },
  web_search: { icon: '🔎', label: 'Web Search', color: chalk.green },
  notebook_edit: { icon: '📓', label: 'Notebook Edit', color: chalk.blue },
  enter_plan_mode: { icon: '📋', label: 'Enter Plan Mode', color: chalk.cyan },
  exit_plan_mode: { icon: '✓', label: 'Exit Plan Mode', color: chalk.cyan },
  skill: { icon: '⚡', label: 'Skill', color: chalk.yellow },
  ask_user_question: { icon: '❓', label: 'Question', color: chalk.magenta },
}

/** Dialog border width (for visual framing) */
const BORDER_WIDTH = 50

/**
 * Render a permission dialog and return the display string
 */
export function renderPermissionDialog(req: PermissionRequest): string {
  const lines: string[] = []
  const display = TOOL_DISPLAY[req.toolName] ?? { icon: '🔧', label: req.toolName, color: chalk.white }

  // Header
  lines.push('')
  lines.push(chalk.bold(`┌─ ${display.icon} ${display.label} ─${'─'.repeat(Math.max(0, BORDER_WIDTH - display.label.length - 4))}`))

  // Tool-specific content
  switch (req.toolName) {
    case 'bash':
      lines.push(...renderBashContent(req as BashPermissionRequest))
      break
    case 'file_edit':
      lines.push(...renderFileEditContent(req as FileEditPermissionRequest))
      break
    case 'file_write':
      lines.push(...renderFileWriteContent(req as FileWritePermissionRequest))
      break
    case 'file_read':
    case 'glob':
    case 'grep':
      lines.push(...renderFilesystemContent(req as FilesystemPermissionRequest))
      break
    case 'web_fetch':
      lines.push(...renderWebFetchContent(req as WebFetchPermissionRequest))
      break
    case 'exit_plan_mode':
      lines.push(...renderExitPlanModeContent(req as ExitPlanModePermissionRequest))
      break
    default:
      lines.push(...renderFallbackContent(req))
      break
  }

  // Classifier info (auto mode)
  if ('classifierAutoApproved' in req && req.classifierAutoApproved) {
    lines.push(`│ ${chalk.dim(`Auto-approved (rule: ${String((req as BashPermissionRequest).classifierMatchedRule ?? 'unknown')})`)}`)
  }

  // Footer
  lines.push(chalk.bold(`└${'─'.repeat(BORDER_WIDTH + 2)}`))

  // Options
  lines.push(renderPermissionOptions())

  return lines.join('\n')
}

/**
 * Render bash command content
 */
function renderBashContent(req: BashPermissionRequest): string[] {
  const lines: string[] = []
  const input = req.input

  lines.push(`│ ${chalk.yellow.bold('Command:')}`)
  const cmdLines = renderCodeBlock(input.command, 'bash').split('\n')
  for (const line of cmdLines) {
    lines.push(`│ ${line}`)
  }

  if (input.timeout) {
    lines.push(`│ ${chalk.dim(`Timeout: ${input.timeout}ms`)}`)
  }

  return lines
}

/**
 * Render file edit content
 */
function renderFileEditContent(req: FileEditPermissionRequest): string[] {
  const lines: string[] = []
  const input = req.input

  lines.push(`│ ${chalk.blue.bold('File:')} ${input.file_path}`)

  // Show diff preview
  if (req.diffPreview) {
    lines.push('│')
    const diffLines = req.diffPreview.split('\n').slice(0, 15)
    for (const line of diffLines) {
      lines.push(`│ ${line}`)
    }
  } else {
    // Inline diff
    lines.push('│')
    lines.push(`│ ${chalk.red('- ' + truncate(input.old_string, 60))}`)
    lines.push(`│ ${chalk.green('+ ' + truncate(input.new_string, 60))}`)
  }

  return lines
}

/**
 * Render file write content
 */
function renderFileWriteContent(req: FileWritePermissionRequest): string[] {
  const lines: string[] = []
  const input = req.input

  lines.push(`│ ${chalk.magenta.bold('File:')} ${input.file_path}`)

  const contentLines = input.content.split('\n')
  const lineCount = contentLines.length
  lines.push(`│ ${chalk.dim(`${lineCount} lines`)}`)

  // Show first few lines
  if (contentLines.length > 0) {
    lines.push('│')
    const previewLines = contentLines.slice(0, 5)
    for (const line of previewLines) {
      lines.push(`│ ${chalk.dim(truncate(line, BORDER_WIDTH - 4))}`)
    }
    if (contentLines.length > 5) {
      lines.push(`│ ${chalk.dim(`... (${contentLines.length - 5} more lines)`)}`)
    }
  }

  return lines
}

/**
 * Render filesystem permission content
 */
function renderFilesystemContent(req: FilesystemPermissionRequest): string[] {
  const lines: string[] = []
  const input = req.input

  if (input.file_path) {
    lines.push(`│ ${chalk.cyan.bold('Path:')} ${input.file_path}`)
  }
  if (input.pattern) {
    lines.push(`│ ${chalk.cyan.bold('Pattern:')} ${input.pattern}`)
  }
  if (input.path) {
    lines.push(`│ ${chalk.cyan.bold('In:')} ${input.path}`)
  }

  return lines
}

/**
 * Render web fetch content
 */
function renderWebFetchContent(req: WebFetchPermissionRequest): string[] {
  const lines: string[] = []
  const input = req.input

  lines.push(`│ ${chalk.green.bold('URL:')} ${input.url}`)
  if (input.prompt) {
    lines.push(`│ ${chalk.dim(truncate(input.prompt, 60))}`)
  }

  return lines
}

/**
 * Render exit plan mode content
 */
function renderExitPlanModeContent(req: ExitPlanModePermissionRequest): string[] {
  const lines: string[] = []

  if (req.planContent) {
    lines.push(`│ ${chalk.cyan.bold('Plan for review:')}`)
    lines.push('│')
    const planLines = req.planContent.split('\n').slice(0, 20)
    for (const line of planLines) {
      lines.push(`│ ${chalk.dim(truncate(line, BORDER_WIDTH - 4))}`)
    }
    if (req.planContent.split('\n').length > 20) {
      lines.push(`│ ${chalk.dim('... (scroll for more)')}`)
    }
  }

  return lines
}

/**
 * Render fallback content for unknown tool types
 */
function renderFallbackContent(req: PermissionRequest): string[] {
  const lines: string[] = []

  lines.push(`│ ${chalk.white.bold('Tool:')} ${req.toolName}`)

  const inputStr = JSON.stringify(req.input, null, 2)
  const previewLines = inputStr.split('\n').slice(0, 8)
  lines.push('│')
  for (const line of previewLines) {
    lines.push(`│ ${chalk.dim(truncate(line, BORDER_WIDTH - 4))}`)
  }

  return lines
}

/**
 * Render permission choice options
 */
function renderPermissionOptions(): string {
  return (
    `  ${chalk.green('[y]')} Allow  ` +
    `${chalk.blue('[d]')} Allow + don't ask again  ` +
    `${chalk.red('[n]')} Deny (default)`
  )
}

/**
 * Parse user input into a permission decision
 */
export function parsePermissionInput(input: string): PermissionDecision {
  const trimmed = input.trim().toLowerCase()

  if (trimmed === 'y' || trimmed === 'yes') {
    return { allowed: true, dontAskAgain: false }
  }

  if (trimmed === 'd') {
    return { allowed: true, dontAskAgain: true }
  }

  return { allowed: false, dontAskAgain: false }
}

/**
 * Render permission result
 */
export function renderPermissionResult(decision: PermissionDecision): string {
  if (decision.allowed) {
    if (decision.dontAskAgain) {
      return chalk.blue('✓ Allowed (persistent rule created)')
    }
    return chalk.green('✓ Allowed')
  }
  return chalk.red('✗ Denied')
}

/**
 * Truncate string to max length
 */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 3) + '...'
}