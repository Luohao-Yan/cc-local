/**
 * Thinking Message Renderer
 *
 * Renders assistant thinking/reasoning messages with collapsible display.
 */

import chalk from 'chalk'
import type { AssistantThinkingMessage } from './types.js'

/**
 * Render thinking message
 */
export function renderThinkingMessage(msg: AssistantThinkingMessage, width: number = 80): string {
  const lines: string[] = []

  // Thinking indicator
  const prefix = msg.isRedacted
    ? chalk.dim('💭 [Redacted]')
    : chalk.dim('💭 Thinking')

  lines.push(prefix)

  // Content (if not redacted)
  if (msg.content && !msg.isRedacted) {
    const wrappedContent = wrapText(msg.content, width - 4)
    const contentLines = wrappedContent.split('\n')

    for (const line of contentLines) {
      lines.push(chalk.dim(`   ${line}`))
    }
  }

  // Streaming indicator
  if (msg.isStreaming) {
    lines.push(chalk.dim('   ▌'))
  }

  return lines.join('\n')
}

/**
 * Render thinking summary (collapsed)
 */
export function renderThinkingSummary(msg: AssistantThinkingMessage): string {
  if (msg.isRedacted) {
    return chalk.dim('💭 [Redacted thinking]')
  }

  const preview = msg.content ? msg.content.slice(0, 50) : ''
  const suffix = msg.content && msg.content.length > 50 ? '...' : ''

  return chalk.dim(`💭 Thinking: "${preview}${suffix}"`)
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
