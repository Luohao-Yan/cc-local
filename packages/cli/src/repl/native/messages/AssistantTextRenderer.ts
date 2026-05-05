/**
 * Assistant Text Message Renderer
 *
 * Renders assistant response messages with markdown formatting.
 */

import chalk from 'chalk'
import { renderMarkdown } from '../renderer.js'
import type { AssistantTextMessage } from './types.js'

/**
 * Render assistant text message
 */
export function renderAssistantTextMessage(msg: AssistantTextMessage, width: number = 80): string {
  const lines: string[] = []

  // Assistant indicator
  lines.push(chalk.blue('Assistant:'))

  // Empty line
  lines.push('')

  // Render markdown content
  if (msg.content) {
    const rendered = renderMarkdown(msg.content)
    lines.push(rendered)
  }

  // Streaming indicator
  if (msg.isStreaming) {
    lines.push(chalk.dim('▌')) // Cursor indicator
  }

  return lines.join('\n')
}

/**
 * Render streaming text (partial)
 */
export function renderStreamingText(content: string, isComplete: boolean): string {
  const lines: string[] = []

  if (content) {
    lines.push(renderMarkdown(content))
  }

  if (!isComplete) {
    lines.push(chalk.dim('▌'))
  }

  return lines.join('\n')
}
