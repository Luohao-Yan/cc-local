/**
 * Terminal Layout Manager
 *
 * Manages screen regions for the Native REPL:
 * - Content area (scrollable message history)
 * - Input area (fixed at bottom)
 * - Status bar (optional)
 * - Overlay (modal dialogs)
 *
 * Uses ANSI escape codes for cursor positioning and screen manipulation.
 */

import * as readline from 'readline'
import chalk from 'chalk'

export interface LayoutConfig {
  /** Terminal height override (default: process.stdout.rows) */
  height?: number
  /** Terminal width override (default: process.stdout.columns) */
  width?: number
  /** Status bar height (0 = hidden) */
  statusBarHeight?: number
  /** Input area height (minimum 1) */
  inputHeight?: number
  /** Show borders between regions */
  showBorders?: boolean
}

export interface LayoutRegion {
  /** Start row (0-indexed) */
  startRow: number
  /** End row (exclusive */
  endRow: number
  /** Start column (0-indexed) */
  startCol: number
  /** End column (exclusive) */
  endCol: number
  /** Region height */
  height: number
  /** Region width */
  width: number
}

export type LayoutRegionName = 'content' | 'input' | 'statusBar' | 'overlay'

/**
 * Terminal Layout Manager
 *
 * Provides a structured layout for terminal-based UI with:
 * - Scrollable content area
 * - Fixed input area at bottom
 * - Optional status bar
 * - Modal overlay support
 */
export class TerminalLayout {
  private config: Required<LayoutConfig>
  private currentHeight: number
  private currentWidth: number
  private resizeHandler?: () => void

  constructor(config: LayoutConfig = {}) {
    this.config = {
      height: config.height ?? process.stdout.rows ?? 24,
      width: config.width ?? process.stdout.columns ?? 80,
      statusBarHeight: config.statusBarHeight ?? 1,
      inputHeight: config.inputHeight ?? 3,
      showBorders: config.showBorders ?? false,
    }
    this.currentHeight = this.config.height
    this.currentWidth = this.config.width
  }

  /**
   * Initialize layout and start listening for resize events
   */
  init(): void {
    this.setupResizeHandler()
    this.clear()
  }

  /**
   * Cleanup and stop listening for resize events
   */
  destroy(): void {
    if (this.resizeHandler) {
      process.stdout.off('resize', this.resizeHandler)
      this.resizeHandler = undefined
    }
  }

  /**
   * Get current terminal dimensions
   */
  getDimensions(): { height: number; width: number } {
    return {
      height: this.currentHeight,
      width: this.currentWidth,
    }
  }

  /**
   * Get region bounds by name
   */
  getRegion(name: LayoutRegionName): LayoutRegion {
    const { height, width, statusBarHeight, inputHeight } = this.config

    switch (name) {
      case 'content':
        // Content area: from top to input area (and status bar if visible)
        const contentStartRow = 0
        const contentEndRow = height - inputHeight - statusBarHeight
        return {
          startRow: contentStartRow,
          endRow: Math.max(contentStartRow, contentEndRow),
          startCol: 0,
          endCol: width,
          height: Math.max(0, contentEndRow - contentStartRow),
          width: width,
        }

      case 'input':
        // Input area: fixed at bottom
        const inputStartRow = height - inputHeight
        return {
          startRow: inputStartRow,
          endRow: height,
          startCol: 0,
          endCol: width,
          height: inputHeight,
          width: width,
        }

      case 'statusBar':
        // Status bar: just above input area
        if (statusBarHeight === 0) {
          return {
            startRow: 0, endRow: 0, startCol: 0, endCol: 0, height: 0, width: 0,
          }
        }
        const statusStartRow = height - inputHeight - statusBarHeight
        return {
          startRow: statusStartRow,
          endRow: height - inputHeight,
          startCol: 0,
          endCol: width,
          height: statusBarHeight,
          width: width,
        }

      case 'overlay':
        // Overlay: full screen
        return {
          startRow: 0,
          endRow: height,
          startCol: 0,
          endCol: width,
          height: height,
          width: width,
        }
    }
  }

  /**
   * Clear the entire screen
   */
  clear(): void {
    process.stdout.write('\x1b[2J') // Clear entire screen
    process.stdout.write('\x1b[H')  // Move cursor to home
  }

  /**
   * Clear a specific region
   */
  clearRegion(name: LayoutRegionName): void {
    const region = this.getRegion(name)
    if (region.height === 0) return

    for (let row = region.startRow; row < region.endRow; row++) {
      this.setCursorPosition(row, 0)
      process.stdout.write('\x1b[K') // Clear line from cursor to end
    }
  }

  /**
   * Set cursor position (0-indexed)
   */
  setCursorPosition(row: number, col: number): void {
    // Clamp to valid range
    const safeRow = Math.max(0, Math.min(row, this.currentHeight - 1))
    const safeCol = Math.max(0, Math.min(col, this.currentWidth - 1))
    process.stdout.write(`\x1b[${safeRow + 1};${safeCol + 1}H`)
  }

  /**
   * Draw content in a region
   */
  drawInRegion(name: LayoutRegionName, content: string | string[]): void {
    const region = this.getRegion(name)
    if (region.height === 0) return

    const lines = Array.isArray(content) ? content : content.split('\n')

    // Limit lines to region height
    const maxLines = Math.min(lines.length, region.height)

    for (let i = 0; i < maxLines; i++) {
      const row = region.startRow + i
      const line = lines[i] ?? ''
      // Truncate line to region width
      const truncatedLine = line.slice(0, region.width)

      this.setCursorPosition(row, region.startCol)
      process.stdout.write(truncatedLine)

      // Clear rest of line if needed
      if (truncatedLine.length < region.width) {
        process.stdout.write('\x1b[K')
      }
    }
  }

  /**
   * Draw a border line at a specific row
   */
  drawBorder(row: number, style: 'single' | 'double' = 'single'): void {
    this.setCursorPosition(row, 0)
    const char = style === 'double' ? '═' : '─'
    const line = char.repeat(this.currentWidth)
    process.stdout.write(chalk.dim(line))
  }

  /**
   * Draw status bar
   */
  drawStatusBar(content: string): void {
    if (this.config.statusBarHeight === 0) return

    const region = this.getRegion('statusBar')
    const paddedContent = content.padEnd(region.width).slice(0, region.width)

    this.setCursorPosition(region.startRow, 0)
    process.stdout.write(chalk.bgGray.black(paddedContent))
  }

  /**
   * Draw input prompt
   */
  drawInputPrompt(prompt: string, inputValue: string): void {
    const region = this.getRegion('input')

    // Clear input area
    this.clearRegion('input')

    // Draw prompt
    this.setCursorPosition(region.startRow, 0)
    process.stdout.write(chalk.green(prompt))

    // Draw input value
    this.setCursorPosition(region.startRow + 1, 0)
    process.stdout.write(inputValue)

    // Position cursor at end of input
    this.setCursorPosition(region.startRow + 1, inputValue.length)
  }

  /**
   * Enable alternate screen buffer (for full-screen apps)
   */
  enableAlternateBuffer(): void {
    process.stdout.write('\x1b[?1049h')
  }

  /**
   * Disable alternate screen buffer
   */
  disableAlternateBuffer(): void {
    process.stdout.write('\x1b[?1049l')
  }

  /**
   * Hide cursor
   */
  hideCursor(): void {
    process.stdout.write('\x1b[?25l')
  }

  /**
   * Show cursor
   */
  showCursor(): void {
    process.stdout.write('\x1b[?25h')
  }

  /**
   * Save cursor position
   */
  saveCursor(): void {
    process.stdout.write('\x1b[s')
  }

  /**
   * Restore cursor position
   */
  restoreCursor(): void {
    process.stdout.write('\x1b[u')
  }

  /**
   * Scroll content area up by n lines
   */
  scrollUp(n: number = 1): void {
    const region = this.getRegion('content')
    if (region.height === 0) return

    // Set scroll region
    process.stdout.write(`\x1b[${region.startRow + 1};${region.endRow}r`)
    // Scroll up
    process.stdout.write(`\x1b[${n}S`)
    // Reset scroll region to full screen
    process.stdout.write('\x1b[r')
  }

  /**
   * Scroll content area down by n lines
   */
  scrollDown(n: number = 1): void {
    const region = this.getRegion('content')
    if (region.height === 0) return

    // Set scroll region
    process.stdout.write(`\x1b[${region.startRow + 1};${region.endRow}r`)
    // Scroll down
    process.stdout.write(`\x1b[${n}T`)
    // Reset scroll region to full screen
    process.stdout.write('\x1b[r')
  }

  /**
   * Setup resize handler
   */
  private setupResizeHandler(): void {
    this.resizeHandler = () => {
      this.currentHeight = process.stdout.rows ?? this.config.height
      this.currentWidth = process.stdout.columns ?? this.config.width
    }
    process.stdout.on('resize', this.resizeHandler)
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config }
    this.currentHeight = this.config.height
    this.currentWidth = this.config.width
  }
}

/**
 * Create a terminal layout instance
 */
export function createTerminalLayout(config?: LayoutConfig): TerminalLayout {
  return new TerminalLayout(config)
}
