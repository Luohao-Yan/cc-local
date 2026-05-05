/**
 * Screen Buffer
 *
 * Manages a scrollable message buffer for the terminal UI.
 * Implements double buffering with:
 * - Visible area (what's currently on screen)
 * - Scroll history (messages that have scrolled off)
 *
 * Features:
 * - Virtual scrolling with large message history
 * - Message caching and incremental updates
 * - Terminal height adaptation
 * - Search and navigation
 */

import chalk from 'chalk'

export interface BufferMessage {
  /** Unique message ID */
  id: string
  /** Message content (can be multi-line) */
  content: string
  /** Message type for styling */
  type: 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result' | 'error' | 'thinking'
  /** Timestamp */
  timestamp: number
  /** Whether message is collapsed */
  collapsed?: boolean
  /** Whether message is hidden */
  hidden?: boolean
  /** Custom height (number of lines) */
  customHeight?: number
}

export interface ScreenBufferOptions {
  /** Maximum messages to keep in history */
  maxHistory?: number
  /** Maximum lines per message before truncation */
  maxLinesPerMessage?: number
  /** Whether to show line numbers */
  showLineNumbers?: boolean
}

/**
 * Screen Buffer for virtual scrolling
 */
export class ScreenBuffer {
  private messages: BufferMessage[] = []
  private messageHeights: Map<string, number> = new Map()
  private scrollOffset = 0
  private visibleHeight = 24
  private options: Required<ScreenBufferOptions>

  constructor(options: ScreenBufferOptions = {}) {
    this.options = {
      maxHistory: options.maxHistory ?? 1000,
      maxLinesPerMessage: options.maxLinesPerMessage ?? 50,
      showLineNumbers: options.showLineNumbers ?? false,
    }
  }

  /**
   * Add a message to the buffer
   */
  addMessage(message: BufferMessage): void {
    // Calculate height
    const height = this.calculateMessageHeight(message)
    this.messageHeights.set(message.id, height)

    // Add to messages
    this.messages.push(message)

    // Trim history if needed
    if (this.messages.length > this.options.maxHistory) {
      const removed = this.messages.shift()
      if (removed) {
        this.messageHeights.delete(removed.id)
      }
    }

    // Auto-scroll to bottom if at bottom
    if (this.isAtBottom()) {
      this.scrollToBottom()
    }
  }

  /**
   * Update an existing message
   */
  updateMessage(id: string, updates: Partial<BufferMessage>): void {
    const index = this.messages.findIndex(m => m.id === id)
    if (index === -1) return

    this.messages[index] = { ...this.messages[index]!, ...updates }

    // Recalculate height
    this.messageHeights.set(id, this.calculateMessageHeight(this.messages[index]!))
  }

  /**
   * Remove a message
   */
  removeMessage(id: string): void {
    const index = this.messages.findIndex(m => m.id === id)
    if (index === -1) return

    this.messages.splice(index, 1)
    this.messageHeights.delete(id)
  }

  /**
   * Get all messages
   */
  getMessages(): BufferMessage[] {
    return [...this.messages]
  }

  /**
   * Get visible messages for current viewport
   */
  getVisibleMessages(): BufferMessage[] {
    const result: BufferMessage[] = []
    let currentHeight = 0
    let messageIndex = 0

    // Start from scroll offset
    let totalHeight = 0
    for (const message of this.messages) {
      const height = this.messageHeights.get(message.id) ?? 1
      if (totalHeight + height > this.scrollOffset) {
        // This message is in viewport
        if (currentHeight < this.visibleHeight) {
          result.push(message)
          currentHeight += height
        } else {
          break
        }
      }
      totalHeight += height
      messageIndex++
    }

    return result
  }

  /**
   * Render visible content to string
   */
  render(): string {
    const lines: string[] = []
    const visibleMessages = this.getVisibleMessages()

    for (const message of visibleMessages) {
      if (message.hidden) continue

      const messageLines = this.renderMessage(message)
      lines.push(...messageLines)

      // Limit to visible height
      if (lines.length >= this.visibleHeight) {
        break
      }
    }

    // Pad to fill visible height
    while (lines.length < this.visibleHeight) {
      lines.push('')
    }

    return lines.slice(0, this.visibleHeight).join('\n')
  }

  /**
   * Render a single message
   */
  private renderMessage(message: BufferMessage): string[] {
    const content = message.content
    let lines = content.split('\n')

    // Apply type-specific styling
    lines = this.applyStyle(lines, message.type)

    // Truncate if needed
    if (lines.length > this.options.maxLinesPerMessage) {
      lines = [
        ...lines.slice(0, this.options.maxLinesPerMessage - 1),
        chalk.dim(`... ${lines.length - this.options.maxLinesPerMessage + 1} more lines`),
      ]
    }

    // Add line numbers if enabled
    if (this.options.showLineNumbers) {
      lines = lines.map((line, i) => chalk.dim(`${i + 1}`.padStart(3)) + ' ' + line)
    }

    return lines
  }

  /**
   * Apply styling based on message type
   */
  private applyStyle(lines: string[], type: BufferMessage['type']): string[] {
    switch (type) {
      case 'user':
        return lines.map(line => chalk.green('> ') + line)

      case 'assistant':
        return lines.map(line => line)

      case 'system':
        return lines.map(line => chalk.dim(line))

      case 'tool_use':
        return lines.map(line => chalk.yellow('🔧 ') + line)

      case 'tool_result':
        return lines.map(line => chalk.blue('📎 ') + line)

      case 'error':
        return lines.map(line => chalk.red('❌ ') + line)

      case 'thinking':
        return lines.map(line => chalk.dim(chalk.italic(line)))

      default:
        return lines
    }
  }

  /**
   * Calculate message height (number of lines)
   */
  private calculateMessageHeight(message: BufferMessage): number {
    if (message.customHeight) {
      return message.customHeight
    }

    const lines = message.content.split('\n')
    return Math.min(lines.length, this.options.maxLinesPerMessage)
  }

  /**
   * Set visible height (terminal height)
   */
  setVisibleHeight(height: number): void {
    this.visibleHeight = height
  }

  /**
   * Get total content height
   */
  getTotalHeight(): number {
    let total = 0
    for (const message of this.messages) {
      if (!message.hidden) {
        total += this.messageHeights.get(message.id) ?? 1
      }
    }
    return total
  }

  /**
   * Scroll up by n lines
   */
  scrollUp(lines: number = 1): void {
    this.scrollOffset = Math.max(0, this.scrollOffset - lines)
  }

  /**
   * Scroll down by n lines
   */
  scrollDown(lines: number = 1): void {
    const maxOffset = Math.max(0, this.getTotalHeight() - this.visibleHeight)
    this.scrollOffset = Math.min(maxOffset, this.scrollOffset + lines)
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    const maxOffset = Math.max(0, this.getTotalHeight() - this.visibleHeight)
    this.scrollOffset = maxOffset
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    this.scrollOffset = 0
  }

  /**
   * Check if at bottom
   */
  isAtBottom(): boolean {
    const maxOffset = Math.max(0, this.getTotalHeight() - this.visibleHeight)
    return this.scrollOffset >= maxOffset
  }

  /**
   * Get current scroll offset
   */
  getScrollOffset(): number {
    return this.scrollOffset
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = []
    this.messageHeights.clear()
    this.scrollOffset = 0
  }

  /**
   * Search messages for a pattern
   */
  search(pattern: string | RegExp): { messageId: string; lineIndex: number }[] {
    const results: { messageId: string; lineIndex: number }[] = []
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gi') : pattern

    for (const message of this.messages) {
      if (message.hidden) continue

      const lines = message.content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i]!)) {
          results.push({ messageId: message.id, lineIndex: i })
        }
      }
    }

    return results
  }

  /**
   * Jump to a specific message
   */
  jumpToMessage(id: string): boolean {
    const index = this.messages.findIndex(m => m.id === id)
    if (index === -1) return false

    // Calculate offset to this message
    let offset = 0
    for (let i = 0; i < index; i++) {
      const message = this.messages[i]!
      if (!message.hidden) {
        offset += this.messageHeights.get(message.id) ?? 1
      }
    }

    this.scrollOffset = offset
    return true
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.length
  }

  /**
   * Get visible message count
   */
  getVisibleMessageCount(): number {
    return this.messages.filter(m => !m.hidden).length
  }
}

/**
 * Create a screen buffer instance
 */
export function createScreenBuffer(options?: ScreenBufferOptions): ScreenBuffer {
  return new ScreenBuffer(options)
}
