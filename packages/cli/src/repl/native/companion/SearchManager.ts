/**
 * Search Manager for Native REPL
 *
 * Provides message search, match highlighting, and navigation
 * across the message history.
 */

import chalk from 'chalk'
import type { MessageManager } from '../messages/MessageManager.js'
import type { NativeMessage } from '../messages/types.js'

/**
 * Search match result
 */
export interface SearchMatch {
  /** Message ID containing the match */
  messageId: string
  /** Match position in the message content */
  offset: number
  /** Matched text */
  text: string
  /** Line number in message (0-based) */
  line: number
  /** Column in line (0-based) */
  column: number
}

/**
 * Search state
 */
export interface SearchState {
  /** Whether search is active */
  isActive: boolean
  /** Search pattern (string or regex) */
  pattern: string
  /** Whether pattern is regex */
  isRegex: boolean
  /** Case sensitive */
  caseSensitive: boolean
  /** All matches found */
  matches: SearchMatch[]
  /** Current match index */
  currentIndex: number
  /** Total match count */
  totalMatches: number
}

/**
 * Search Manager class
 */
export class SearchManager {
  private state: SearchState = {
    isActive: false,
    pattern: '',
    isRegex: false,
    caseSensitive: false,
    matches: [],
    currentIndex: -1,
    totalMatches: 0,
  }

  private listeners: Set<() => void> = new Set()

  /**
   * Get current search state
   */
  getState(): SearchState {
    return { ...this.state }
  }

  /**
   * Start a search
   */
  startSearch(): void {
    this.state = {
      isActive: true,
      pattern: '',
      isRegex: false,
      caseSensitive: false,
      matches: [],
      currentIndex: -1,
      totalMatches: 0,
    }
    this.notifyListeners()
  }

  /**
   * End search
   */
  endSearch(): void {
    this.state.isActive = false
    this.state.matches = []
    this.state.currentIndex = -1
    this.state.totalMatches = 0
    this.notifyListeners()
  }

  /**
   * Toggle case sensitivity
   */
  toggleCaseSensitive(): void {
    this.state.caseSensitive = !this.state.caseSensitive
    this.notifyListeners()
  }

  /**
   * Toggle regex mode
   */
  toggleRegex(): void {
    this.state.isRegex = !this.state.isRegex
    this.notifyListeners()
  }

  /**
   * Execute search across messages
   */
  search(messages: NativeMessage[], pattern: string): SearchMatch[] {
    this.state.pattern = pattern

    if (!pattern) {
      this.state.matches = []
      this.state.currentIndex = -1
      this.state.totalMatches = 0
      this.notifyListeners()
      return []
    }

    const matches: SearchMatch[] = []

    // Build regex from pattern
    let regex: RegExp
    try {
      const flags = this.state.caseSensitive ? 'g' : 'gi'
      regex = this.state.isRegex
        ? new RegExp(pattern, flags)
        : new RegExp(escapeRegex(pattern), flags)
    } catch {
      this.state.matches = []
      this.state.currentIndex = -1
      this.state.totalMatches = 0
      this.notifyListeners()
      return []
    }

    // Search through messages
    for (const msg of messages) {
      const content = getMessageContent(msg)
      if (!content) continue

      let match: RegExpExecArray | null
      const localRegex = new RegExp(regex.source, regex.flags)
      while ((match = localRegex.exec(content)) !== null) {
        const offset = match.index
        const text = match[0]

        // Calculate line and column
        const beforeMatch = content.slice(0, offset)
        const lines = beforeMatch.split('\n')
        const line = lines.length - 1
        const column = (lines[lines.length - 1] ?? '').length

        matches.push({
          messageId: msg.id,
          offset,
          text,
          line,
          column,
        })

        // Prevent infinite loop on zero-length matches
        if (text.length === 0) {
          localRegex.lastIndex++
        }
      }
    }

    this.state.matches = matches
    this.state.totalMatches = matches.length
    this.state.currentIndex = matches.length > 0 ? 0 : -1
    this.notifyListeners()

    return matches
  }

  /**
   * Navigate to next match
   */
  nextMatch(): SearchMatch | undefined {
    if (this.state.matches.length === 0) return undefined

    const newIndex =
      (this.state.currentIndex + 1) % this.state.matches.length
    this.state.currentIndex = newIndex
    this.notifyListeners()

    return this.state.matches[newIndex]
  }

  /**
   * Navigate to previous match
   */
  previousMatch(): SearchMatch | undefined {
    if (this.state.matches.length === 0) return undefined

    const newIndex =
      this.state.currentIndex <= 0
        ? this.state.matches.length - 1
        : this.state.currentIndex - 1
    this.state.currentIndex = newIndex
    this.notifyListeners()

    return this.state.matches[newIndex]
  }

  /**
   * Get current match
   */
  getCurrentMatch(): SearchMatch | undefined {
    if (this.state.currentIndex < 0) return undefined
    return this.state.matches[this.state.currentIndex]
  }

  /**
   * Check if search is active
   */
  isActive(): boolean {
    return this.state.isActive
  }

  /**
   * Render search status bar
   */
  renderSearchBar(): string {
    if (!this.state.isActive) return ''

    const modeFlags = [
      this.state.caseSensitive ? 'Aa' : 'aa',
      this.state.isRegex ? '.*' : '""',
    ].join(' ')

    const matchInfo =
      this.state.totalMatches > 0
        ? `${this.state.currentIndex + 1}/${this.state.totalMatches}`
        : 'No matches'

    const noMatchStyle =
      this.state.totalMatches === 0 && this.state.pattern.length > 0
        ? chalk.red
        : chalk.dim

    return (
      `${chalk.dim('/')} ${this.state.pattern} ${chalk.dim('▌')} ` +
      `${noMatchStyle(matchInfo)} ` +
      `${chalk.dim(modeFlags)} ` +
      `${chalk.dim('↵ next  Esc cancel')}`
    )
  }

  /**
   * Highlight matches in content string
   */
  highlightMatches(content: string, messageId: string): string {
    if (!this.state.isActive || this.state.pattern.length === 0) return content

    const currentMatch = this.getCurrentMatch()
    const isCurrentMessage = currentMatch?.messageId === messageId

    let regex: RegExp
    try {
      const flags = this.state.caseSensitive ? 'g' : 'gi'
      regex = this.state.isRegex
        ? new RegExp(this.state.pattern, flags)
        : new RegExp(escapeRegex(this.state.pattern), flags)
    } catch {
      return content
    }

    return content.replace(regex, (match, offset) => {
      const isCurrentMatch =
        isCurrentMessage &&
        currentMatch &&
        offset === currentMatch.offset &&
        match === currentMatch.text

      if (isCurrentMatch) {
        return chalk.bgYellow.black(match)
      }
      return chalk.yellow(match)
    })
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

/**
 * Get text content from a message
 */
function getMessageContent(msg: NativeMessage): string | null {
  switch (msg.type) {
    case 'user_text':
    case 'assistant_text':
    case 'assistant_thinking':
    case 'system':
      return msg.content
    case 'assistant_tool_use':
      return JSON.stringify(msg.input)
    case 'user_tool_result':
      return typeof msg.content === 'string' ? msg.content : null
    default:
      return null
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Create a search manager instance
 */
export function createSearchManager(): SearchManager {
  return new SearchManager()
}
