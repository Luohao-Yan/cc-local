/**
 * Message Manager
 *
 * Manages the message list for Native REPL with grouping, collapsing,
 * and virtual scrolling support.
 */

import type { NativeMessage } from './types.js'

/**
 * Message group configuration
 */
interface MessageGroup {
  id: string
  messages: NativeMessage[]
  collapsed: boolean
  label?: string
}

/**
 * Message Manager options
 */
export interface MessageManagerOptions {
  /** Maximum messages to keep in memory */
  maxMessages?: number
  /** Enable message grouping */
  enableGrouping?: boolean
  /** Auto-collapse threshold for tool uses */
  collapseThreshold?: number
}

/**
 * Message Manager class
 */
export class MessageManager {
  private messages: NativeMessage[] = []
  private groups: MessageGroup[] = []
  private messageHeightCache: Map<string, number> = new Map()
  private options: Required<MessageManagerOptions>

  constructor(options: MessageManagerOptions = {}) {
    this.options = {
      maxMessages: options.maxMessages ?? 1000,
      enableGrouping: options.enableGrouping ?? true,
      collapseThreshold: options.collapseThreshold ?? 3,
    }
  }

  /**
   * Add a message
   */
  add(message: NativeMessage): void {
    this.messages.push(message)

    // Auto-group consecutive tool uses
    if (this.options.enableGrouping) {
      this.updateGroups()
    }

    // Trim old messages if needed
    if (this.messages.length > this.options.maxMessages) {
      this.trimMessages()
    }
  }

  /**
   * Add multiple messages
   */
  addMany(messages: NativeMessage[]): void {
    for (const msg of messages) {
      this.messages.push(msg)
    }

    if (this.options.enableGrouping) {
      this.updateGroups()
    }

    if (this.messages.length > this.options.maxMessages) {
      this.trimMessages()
    }
  }

  /**
   * Update an existing message
   */
  update(id: string, updates: Partial<NativeMessage>): NativeMessage | undefined {
    const index = this.messages.findIndex((m) => m.id === id)
    if (index === -1) return undefined

    const message = this.messages[index]
    this.messages[index] = { ...message, ...updates } as NativeMessage

    // Invalidate height cache
    this.messageHeightCache.delete(id)

    return this.messages[index]
  }

  /**
   * Remove a message by ID
   */
  remove(id: string): boolean {
    const index = this.messages.findIndex((m) => m.id === id)
    if (index === -1) return false

    this.messages.splice(index, 1)
    this.messageHeightCache.delete(id)

    if (this.options.enableGrouping) {
      this.updateGroups()
    }

    return true
  }

  /**
   * Get all messages
   */
  getAll(): NativeMessage[] {
    return [...this.messages]
  }

  /**
   * Get message by ID
   */
  get(id: string): NativeMessage | undefined {
    return this.messages.find((m) => m.id === id)
  }

  /**
   * Get messages in visible range
   */
  getVisible(startIndex: number, count: number): NativeMessage[] {
    return this.messages.slice(startIndex, startIndex + count)
  }

  /**
   * Get message count
   */
  getCount(): number {
    return this.messages.length
  }

  /**
   * Find messages by type
   */
  findByType<T extends NativeMessage['type']>(type: T): NativeMessage[] {
    return this.messages.filter((m) => m.type === type)
  }

  /**
   * Search messages by content
   */
  search(query: string | RegExp): NativeMessage[] {
    const regex = typeof query === 'string' ? new RegExp(query, 'gi') : query

    return this.messages.filter((msg) => {
      switch (msg.type) {
        case 'user_text':
        case 'assistant_text':
        case 'assistant_thinking':
        case 'system':
          return regex.test(msg.content)
        case 'assistant_tool_use':
          return regex.test(msg.toolName) || JSON.stringify(msg.input).match(regex)
        case 'user_tool_result':
          return (
            regex.test(msg.toolName) ||
            (typeof msg.content === 'string' && regex.test(msg.content))
          )
        default:
          return false
      }
    })
  }

  /**
   * Toggle message collapse state
   */
  toggleCollapse(id: string): boolean {
    const message = this.get(id)
    if (!message) return false

    message.collapsed = !message.collapsed
    this.messageHeightCache.delete(id)

    return message.collapsed
  }

  /**
   * Collapse all messages
   */
  collapseAll(): void {
    for (const msg of this.messages) {
      msg.collapsed = true
    }
    this.messageHeightCache.clear()
  }

  /**
   * Expand all messages
   */
  expandAll(): void {
    for (const msg of this.messages) {
      msg.collapsed = false
    }
    this.messageHeightCache.clear()
  }

  /**
   * Get message groups
   */
  getGroups(): MessageGroup[] {
    return [...this.groups]
  }

  /**
   * Toggle group collapse
   */
  toggleGroupCollapse(groupId: string): boolean {
    const group = this.groups.find((g) => g.id === groupId)
    if (!group) return false

    group.collapsed = !group.collapsed

    // Update messages in group
    for (const msg of group.messages) {
      msg.collapsed = group.collapsed
      this.messageHeightCache.delete(msg.id)
    }

    return group.collapsed
  }

  /**
   * Get estimated height for a message
   */
  getMessageHeight(id: string, renderer: (msg: NativeMessage) => number): number {
    if (this.messageHeightCache.has(id)) {
      return this.messageHeightCache.get(id)!
    }

    const message = this.get(id)
    if (!message) return 0

    const height = renderer(message)
    this.messageHeightCache.set(id, height)

    return height
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = []
    this.groups = []
    this.messageHeightCache.clear()
  }

  /**
   * Get last N messages
   */
  getLast(count: number): NativeMessage[] {
    return this.messages.slice(-count)
  }

  /**
   * Get last message
   */
  getLastMessage(): NativeMessage | undefined {
    return this.messages[this.messages.length - 1]
  }

  /**
   * Update message groups
   */
  private updateGroups(): void {
    this.groups = []

    let currentGroup: MessageGroup | null = null
    let consecutiveToolCount = 0

    for (const msg of this.messages) {
      if (msg.type === 'assistant_tool_use') {
        consecutiveToolCount++

        // Start grouping after threshold
        if (consecutiveToolCount >= this.options.collapseThreshold) {
          if (!currentGroup) {
            currentGroup = {
              id: `group-${msg.id}`,
              messages: [],
              collapsed: true,
              label: 'Tool Calls',
            }
            this.groups.push(currentGroup)
          }
          currentGroup.messages.push(msg)
          msg.hidden = true // Hide from main list when grouped
        } else {
          currentGroup = null
        }
      } else {
        consecutiveToolCount = 0
        currentGroup = null
      }
    }
  }

  /**
   * Trim old messages
   */
  private trimMessages(): void {
    const removeCount = this.messages.length - this.options.maxMessages
    if (removeCount > 0) {
      const removed = this.messages.splice(0, removeCount)

      // Clear cache for removed messages
      for (const msg of removed) {
        this.messageHeightCache.delete(msg.id)
      }
    }
  }
}

/**
 * Create a message manager instance
 */
export function createMessageManager(options?: MessageManagerOptions): MessageManager {
  return new MessageManager(options)
}
