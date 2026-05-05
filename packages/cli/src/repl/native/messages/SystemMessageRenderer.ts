/**
 * System Message Renderer
 *
 * Renders system notifications, warnings, and error messages.
 */

import chalk from 'chalk'
import type { SystemMessage } from './types.js'

/**
 * Render system message
 */
export function renderSystemMessage(msg: SystemMessage, width: number = 80): string {
  const lines: string[] = []

  // Get style based on subtype
  const style = getSystemMessageStyle(msg.subtype)

  // Header with icon
  lines.push(style.header(`${style.icon} ${style.title}`))

  // Empty line
  lines.push('')

  // Content
  const wrappedContent = wrapText(msg.content, width - 4)
  const contentLines = wrappedContent.split('\n')

  for (const line of contentLines) {
    lines.push(style.content(`  ${line}`))
  }

  // Footer for specific types
  if (msg.subtype === 'rate_limit') {
    lines.push('')
    lines.push(style.content('  Please wait before making more requests.'))
  }

  return lines.join('\n')
}

/**
 * Render system message summary (compact)
 */
export function renderSystemMessageCompact(msg: SystemMessage): string {
  const style = getSystemMessageStyle(msg.subtype)
  const preview = msg.content.slice(0, 60)
  const suffix = msg.content.length > 60 ? '...' : ''

  return style.header(`${style.icon} ${preview}${suffix}`)
}

/**
 * Render system message as notification bar
 */
export function renderSystemMessageBar(msg: SystemMessage): string {
  const style = getSystemMessageStyle(msg.subtype)

  // Single line notification
  const preview = msg.content.slice(0, 80)
  const suffix = msg.content.length > 80 ? '...' : ''

  return style.header(`${style.icon} ${preview}${suffix}`)
}

/**
 * Get style configuration for message type
 */
function getSystemMessageStyle(subtype?: SystemMessage['subtype']): SystemMessageStyle {
  switch (subtype) {
    case 'error':
    case 'api_error':
      return {
        icon: '✗',
        title: 'Error',
        header: chalk.red.bold,
        content: chalk.red,
      }
    case 'warning':
      return {
        icon: '⚠',
        title: 'Warning',
        header: chalk.yellow.bold,
        content: chalk.yellow,
      }
    case 'rate_limit':
      return {
        icon: '⏳',
        title: 'Rate Limit',
        header: chalk.magenta.bold,
        content: chalk.magenta,
      }
    case 'info':
    default:
      return {
        icon: 'ℹ',
        title: 'Info',
        header: chalk.blue.bold,
        content: chalk.blue,
      }
  }
}

/**
 * System message style configuration
 */
interface SystemMessageStyle {
  icon: string
  title: string
  header: (text: string) => string
  content: (text: string) => string
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

/**
 * Render API error with details
 */
export function renderApiError(error: {
  type: string
  message: string
  statusCode?: number
  requestId?: string
}): string {
  const lines: string[] = []

  lines.push(chalk.red.bold('✗ API Error'))
  lines.push('')

  if (error.statusCode) {
    lines.push(chalk.red(`  Status: ${error.statusCode}`))
  }

  lines.push(chalk.red(`  Type: ${error.type}`))
  lines.push(chalk.red(`  Message: ${error.message}`))

  if (error.requestId) {
    lines.push(chalk.dim(`  Request ID: ${error.requestId}`))
  }

  return lines.join('\n')
}

/**
 * Render rate limit message with countdown
 */
export function renderRateLimitMessage(waitTimeSeconds: number): string {
  const lines: string[] = []

  lines.push(chalk.magenta.bold('⏳ Rate Limit Reached'))
  lines.push('')
  lines.push(chalk.magenta(`  Please wait ${waitTimeSeconds} seconds before continuing.`))
  lines.push('')

  // Progress bar placeholder (can be updated in real-time)
  lines.push(chalk.dim('  [                    ]'))

  return lines.join('\n')
}
