/**
 * User Text Message Renderer
 *
 * Renders user input messages with optional image attachments.
 */

import chalk from 'chalk'
import type { UserTextMessage } from './types.js'

/**
 * Render user text message
 */
export function renderUserTextMessage(msg: UserTextMessage, width: number = 80): string {
  const lines: string[] = []

  // User indicator
  const prefix = chalk.green('You: ')

  // Word wrap content
  const wrappedContent = wrapText(msg.content, width - prefix.length)

  // Add prefix to first line
  const contentLines = wrappedContent.split('\n')
  lines.push(prefix + contentLines[0])

  // Add continuation lines with alignment
  for (let i = 1; i < contentLines.length; i++) {
    lines.push(' '.repeat(prefix.length) + contentLines[i])
  }

  // Image indicators
  if (msg.images && msg.images.length > 0) {
    lines.push(chalk.dim(`   [${msg.images.length} image${msg.images.length > 1 ? 's' : ''} attached]`))
  }

  return lines.join('\n')
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
