/**
 * History Manager for Native REPL
 *
 * Provides history navigation and search for terminal input.
 * Wraps the existing history system with a stateful manager.
 */

import {
  getHistory,
  makeHistoryReader,
  getTimestampedHistory,
  addToHistory,
} from '../../../history.js'
import type { HistoryEntry } from '../../../utils/config.js'

/**
 * History navigation state
 */
export interface HistoryNavigationState {
  /** Current input before history navigation */
  originalInput: string
  /** Current history index (-1 means not navigating) */
  currentIndex: number
  /** Loaded history entries */
  entries: HistoryEntry[]
  /** Whether history is loaded */
  isLoading: boolean
  /** Whether we're in search mode */
  isSearching: boolean
  /** Search query */
  searchQuery: string
  /** Current search match */
  searchMatch: HistoryEntry | undefined
  /** Search reader generator */
  searchReader: AsyncGenerator<HistoryEntry> | null
}

/**
 * History Manager class
 */
export class HistoryManager {
  private state: HistoryNavigationState = {
    originalInput: '',
    currentIndex: -1,
    entries: [],
    isLoading: false,
    isSearching: false,
    searchQuery: '',
    searchMatch: undefined,
    searchReader: null,
  }

  private loaded = false

  /**
   * Get current state
   */
  getState(): HistoryNavigationState {
    return { ...this.state }
  }

  /**
   * Load history entries (lazy)
   */
  async loadHistory(): Promise<void> {
    if (this.loaded) return

    this.state.isLoading = true
    this.state.entries = []

    try {
      for await (const entry of getHistory()) {
        this.state.entries.push(entry)
      }
      this.loaded = true
    } finally {
      this.state.isLoading = false
    }
  }

  /**
   * Add entry to history
   */
  addToHistory(entry: HistoryEntry | string): void {
    addToHistory(entry)
    // Reset navigation state
    this.state.currentIndex = -1
    this.state.originalInput = ''
    // Invalidate cache
    this.loaded = false
  }

  /**
   * Start history navigation (Up arrow)
   * Returns the previous history entry, or original input if at top.
   */
  async navigateUp(currentInput: string): Promise<string | null> {
    await this.loadHistory()

    if (this.state.entries.length === 0) {
      return null
    }

    // Save original input if starting navigation
    if (this.state.currentIndex === -1) {
      this.state.originalInput = currentInput
    }

    // Move to previous entry (older)
    const newIndex = this.state.currentIndex + 1

    if (newIndex >= this.state.entries.length) {
      // At the oldest entry, stay there
      return null
    }

    this.state.currentIndex = newIndex
    return this.state.entries[newIndex]?.display ?? null
  }

  /**
   * Navigate to next history entry (Down arrow)
   * Returns the next entry, or original input if at bottom.
   */
  async navigateDown(): Promise<string | null> {
    if (this.state.currentIndex === -1) {
      return null
    }

    // Move to next entry (newer)
    const newIndex = this.state.currentIndex - 1

    if (newIndex < 0) {
      // Back to original input
      this.state.currentIndex = -1
      return this.state.originalInput
    }

    this.state.currentIndex = newIndex
    return this.state.entries[newIndex]?.display ?? null
  }

  /**
   * Cancel history navigation
   */
  cancelNavigation(): string {
    const original = this.state.originalInput
    this.state.currentIndex = -1
    this.state.originalInput = ''
    return original
  }

  /**
   * Check if navigating history
   */
  isNavigating(): boolean {
    return this.state.currentIndex !== -1
  }

  /**
   * Start history search mode
   */
  startSearch(): void {
    this.state.isSearching = true
    this.state.searchQuery = ''
    this.state.searchMatch = undefined
    this.state.searchReader = makeHistoryReader()
  }

  /**
   * Update search query and find next match
   */
  async searchNext(query: string): Promise<HistoryEntry | undefined> {
    if (!this.state.isSearching || !this.state.searchReader) {
      return undefined
    }

    this.state.searchQuery = query

    if (query.length === 0) {
      this.state.searchMatch = undefined
      return undefined
    }

    // Search for next match
    while (true) {
      const item = await this.state.searchReader.next()
      if (item.done) {
        return undefined
      }

      const entry = item.value
      if (entry.display.toLowerCase().includes(query.toLowerCase())) {
        this.state.searchMatch = entry
        return entry
      }
    }
  }

  /**
   * Find next match for current query
   */
  async findNext(): Promise<HistoryEntry | undefined> {
    return this.searchNext(this.state.searchQuery)
  }

  /**
   * Accept current search match
   */
  acceptSearch(): HistoryEntry | undefined {
    const match = this.state.searchMatch
    this.endSearch()
    return match
  }

  /**
   * Cancel search mode
   */
  cancelSearch(): void {
    this.endSearch()
  }

  /**
   * End search mode
   */
  private endSearch(): void {
    if (this.state.searchReader) {
      void this.state.searchReader.return(undefined)
    }
    this.state.isSearching = false
    this.state.searchQuery = ''
    this.state.searchMatch = undefined
    this.state.searchReader = null
  }

  /**
   * Check if searching
   */
  isSearchingHistory(): boolean {
    return this.state.isSearching
  }

  /**
   * Get current search query
   */
  getSearchQuery(): string {
    return this.state.searchQuery
  }

  /**
   * Get current search match
   */
  getSearchMatch(): HistoryEntry | undefined {
    return this.state.searchMatch
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.cancelNavigation()
    this.cancelSearch()
  }
}

/**
 * Create a history manager instance
 */
export function createHistoryManager(): HistoryManager {
  return new HistoryManager()
}
