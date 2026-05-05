/**
 * Input Buffer for Native REPL
 *
 * Provides undo support for input editing.
 * Stores snapshots of input state for undo operations.
 */

/**
 * Buffer entry representing an input snapshot
 */
export interface BufferEntry {
  /** Input text */
  text: string
  /** Cursor position */
  cursorOffset: number
  /** Timestamp of the snapshot */
  timestamp: number
}

/**
 * Input buffer options
 */
export interface InputBufferOptions {
  /** Maximum buffer size */
  maxSize?: number
  /** Debounce interval in ms */
  debounceMs?: number
}

/**
 * Input Buffer class
 */
export class InputBuffer {
  private buffer: BufferEntry[] = []
  private currentIndex: number = -1
  private lastPushTime: number = 0
  private pendingPush: ReturnType<typeof setTimeout> | null = null
  private maxSize: number
  private debounceMs: number

  constructor(options: InputBufferOptions = {}) {
    this.maxSize = options.maxSize ?? 100
    this.debounceMs = options.debounceMs ?? 500
  }

  /**
   * Push a snapshot to the buffer
   */
  push(text: string, cursorOffset: number = 0): void {
    const now = Date.now()

    // Clear pending push
    if (this.pendingPush) {
      clearTimeout(this.pendingPush)
      this.pendingPush = null
    }

    // Debounce rapid changes
    if (now - this.lastPushTime < this.debounceMs) {
      this.pendingPush = setTimeout(
        () => this.push(text, cursorOffset),
        this.debounceMs,
      )
      return
    }

    this.lastPushTime = now

    // Truncate buffer after current position
    if (this.currentIndex >= 0 && this.currentIndex < this.buffer.length - 1) {
      this.buffer = this.buffer.slice(0, this.currentIndex + 1)
    }

    // Don't add duplicate entries
    const lastEntry = this.buffer[this.buffer.length - 1]
    if (lastEntry && lastEntry.text === text) {
      return
    }

    // Add new entry
    const entry: BufferEntry = {
      text,
      cursorOffset,
      timestamp: now,
    }

    this.buffer.push(entry)

    // Enforce max size
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize)
    }

    // Update current index
    this.currentIndex = this.buffer.length - 1
  }

  /**
   * Undo - go back to previous state
   */
  undo(): BufferEntry | undefined {
    if (this.currentIndex <= 0) {
      return undefined
    }

    this.currentIndex--
    return this.buffer[this.currentIndex]
  }

  /**
   * Redo - go forward to next state
   */
  redo(): BufferEntry | undefined {
    if (this.currentIndex >= this.buffer.length - 1) {
      return undefined
    }

    this.currentIndex++
    return this.buffer[this.currentIndex]
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.buffer.length - 1
  }

  /**
   * Get current entry
   */
  getCurrent(): BufferEntry | undefined {
    return this.buffer[this.currentIndex]
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = []
    this.currentIndex = -1
    this.lastPushTime = 0

    if (this.pendingPush) {
      clearTimeout(this.pendingPush)
      this.pendingPush = null
    }
  }

  /**
   * Get buffer size
   */
  getSize(): number {
    return this.buffer.length
  }

  /**
   * Get current index
   */
  getIndex(): number {
    return this.currentIndex
  }

  /**
   * Get all entries (for debugging)
   */
  getAll(): BufferEntry[] {
    return [...this.buffer]
  }
}

/**
 * Create an input buffer instance
 */
export function createInputBuffer(options?: InputBufferOptions): InputBuffer {
  return new InputBuffer(options)
}
