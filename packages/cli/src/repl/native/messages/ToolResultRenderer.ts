/**
 * Tool Result Message Renderer
 *
 * Renders tool result messages with formatting based on result type.
 */

import chalk from 'chalk'
import type { UserToolResultMessage } from './types.js'

/**
 * Maximum result preview length
 */
const MAX_PREVIEW_LENGTH = 200

/**
 * Maximum line count before truncation
 */
const MAX_LINES = 10

/**
 * Render tool result message
 */
export function renderToolResultMessage(msg: UserToolResultMessage, width: number = 80): string {
  const lines: string[] = []

  // Result header
  const isError = msg.isError ?? false
  const statusIcon = isError ? '✗' : '✓'
  const statusColor = isError ? chalk.red : chalk.green

  lines.push(statusColor(`${statusIcon} Tool Result (${msg.toolName})`))

  // Special status indicators
  if (msg.isRejected) {
    lines.push(chalk.yellow('   ⚠ Tool was rejected by user'))
    return lines.join('\n')
  }

  if (msg.isCanceled) {
    lines.push(chalk.yellow('   ⚠ Tool was canceled'))
    return lines.join('\n')
  }

  // Content rendering
  if (typeof msg.content === 'string') {
    lines.push(...formatTextContent(msg.content, width, isError))
  } else if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block.type === 'text') {
        lines.push(...formatTextContent(block.text, width, isError))
      } else if (block.type === 'image') {
        lines.push(chalk.dim(`   [Image attachment]`))
      }
    }
  }

  return lines.join('\n')
}

/**
 * Render tool result summary (for collapsed display)
 */
export function renderToolResultSummary(msg: UserToolResultMessage): string {
  const statusIcon = msg.isError ? '✗' : '✓'
  const statusColor = msg.isError ? chalk.red : chalk.green

  if (msg.isRejected) {
    return chalk.yellow(`${statusIcon} ${msg.toolName} (rejected)`)
  }

  if (msg.isCanceled) {
    return chalk.yellow(`${statusIcon} ${msg.toolName} (canceled)`)
  }

  const preview = getContentPreview(msg.content)
  return statusColor(`${statusIcon} ${msg.toolName}`) + chalk.dim(` → ${preview}`)
}

/**
 * Format text content with wrapping and truncation
 */
function formatTextContent(text: string, width: number, isError: boolean): string[] {
  const lines: string[] = []
  const textLines = text.split('\n')

  const colorFn = isError ? chalk.red : chalk.dim

  // Limit lines
  const limitedLines = textLines.slice(0, MAX_LINES)
  const hasMore = textLines.length > MAX_LINES

  for (const line of limitedLines) {
    // Wrap long lines
    if (line.length > width - 4) {
      const wrapped = wrapText(line, width - 4)
      for (const wrappedLine of wrapped.split('\n')) {
        lines.push(colorFn(`   ${wrappedLine}`))
      }
    } else {
      lines.push(colorFn(`   ${line}`))
    }
  }

  if (hasMore) {
    lines.push(colorFn(`   ... (${textLines.length - MAX_LINES} more lines)`))
  }

  return lines
}

/**
 * Get short preview of content
 */
function getContentPreview(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === 'string') {
    return content.slice(0, MAX_PREVIEW_LENGTH) + (content.length > MAX_PREVIEW_LENGTH ? '...' : '')
  }

  const textParts: string[] = []
  for (const block of content) {
    if (block.type === 'text' && block.text) {
      textParts.push(block.text)
    }
  }

  const combined = textParts.join('\n')
  return combined.slice(0, MAX_PREVIEW_LENGTH) + (combined.length > MAX_PREVIEW_LENGTH ? '...' : '')
}

/**
 * Wrap text to specified width
 */
function wrapText(text: string, width: number): string {
  if (width <= 0) return text

  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word
    } else if (currentLine.length + 1 + word.length <= width) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines.join('\n')
}
