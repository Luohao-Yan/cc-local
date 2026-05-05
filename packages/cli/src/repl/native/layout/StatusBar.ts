/**
 * Status Bar Component
 *
 * Displays status information at the bottom of the screen:
 * - Model name
 * - Current mode (auto/plan)
 * - Token usage
 * - Cost
 * - Working directory
 * - Task count
 */

import chalk from 'chalk'
import type { TerminalLayout } from './TerminalLayout.js'

export interface StatusBarInfo {
  model?: string
  mode?: 'default' | 'auto' | 'plan'
  tokenPercent?: number
  tokenUsed?: number
  tokenLimit?: number
  costUsd?: number
  cwd?: string
  taskCount?: number
  isProcessing?: boolean
}

/**
 * Render status bar content
 */
export function renderStatusBar(info: StatusBarInfo, width: number): string {
  const parts: string[] = []

  // Model
  if (info.model) {
    parts.push(chalk.cyan(`📦 ${info.model}`))
  }

  // Mode
  if (info.mode && info.mode !== 'default') {
    const modeColor = info.mode === 'auto' ? chalk.green : chalk.yellow
    parts.push(modeColor(`[${info.mode.toUpperCase()}]`))
  }

  // Token usage
  if (info.tokenPercent !== undefined) {
    const percent = info.tokenPercent
    let tokenColor: typeof chalk.green
    if (percent < 50) {
      tokenColor = chalk.green
    } else if (percent < 80) {
      tokenColor = chalk.yellow
    } else {
      tokenColor = chalk.red
    }
    parts.push(tokenColor(`📊 ${percent.toFixed(0)}%`))
  }

  // Cost
  if (info.costUsd !== undefined && info.costUsd > 0) {
    parts.push(chalk.magenta(`💰 $${info.costUsd.toFixed(3)}`))
  }

  // Task count
  if (info.taskCount && info.taskCount > 0) {
    parts.push(chalk.blue(`🔄 ${info.taskCount}`))
  }

  // Processing indicator
  if (info.isProcessing) {
    parts.push(chalk.yellow('⏳ Processing...'))
  }

  // Join parts
  const leftContent = parts.join(' ')

  // Directory (right-aligned)
  let rightContent = ''
  if (info.cwd) {
    const dirName = info.cwd.split('/').pop() || info.cwd
    rightContent = chalk.dim(`📁 ${dirName}`)
  }

  // Calculate spacing
  const leftLength = stripAnsi(leftContent).length
  const rightLength = stripAnsi(rightContent).length
  const spacing = Math.max(0, width - leftLength - rightLength - 2)

  return leftContent + ' '.repeat(spacing) + rightContent
}

/**
 * Render compact status line (for inline use)
 */
export function renderCompactStatus(info: StatusBarInfo): string {
  const parts: string[] = []

  if (info.model) {
    parts.push(chalk.cyan(info.model))
  }

  if (info.mode && info.mode !== 'default') {
    parts.push(chalk.yellow(`[${info.mode}]`))
  }

  if (info.tokenPercent !== undefined) {
    parts.push(chalk.dim(`${info.tokenPercent.toFixed(0)}%`))
  }

  return parts.join(' ')
}

/**
 * Strip ANSI escape codes from string
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * Update and draw status bar
 */
export function updateStatusBar(
  layout: TerminalLayout,
  info: StatusBarInfo
): void {
  const region = layout.getRegion('statusBar')
  if (region.height === 0) return

  const content = renderStatusBar(info, region.width)
  layout.drawInRegion('statusBar', content)
}
