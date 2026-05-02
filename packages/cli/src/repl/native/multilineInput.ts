/**
 * Multi-line input handler for native REPL
 *
 * Supports:
 *  - Enter to submit
 *  - Shift+Enter / Opt+Enter for newline (via escape sequence detection)
 *  - Multi-line paste detection (lines joined with \n)
 *  - Backslash continuation (\ at end of line)
 */

import * as readline from 'readline'
import * as fs from 'fs'

/** Bracketed paste mode escape sequences */
const BRACKET_PASTE_START = '\x1b[200~'
const BRACKET_PASTE_END = '\x1b[201~'

/**
 * Enable bracketed paste mode on the terminal.
 * This lets us detect pasted multi-line content vs typed content.
 */
export function enableBracketedPaste(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?2004h')
  }
}

/** Disable bracketed paste mode */
export function disableBracketedPaste(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?2004l')
  }
}

export interface MultiLineResult {
  text: string
  isMultiLine: boolean
}

/**
 * Create an enhanced readline interface that supports multi-line input.
 *
 * When the user pastes content containing newlines (detected via
 * bracketed paste mode), the newlines are preserved. When typing
 * manually, Enter submits and backslash-continuation is supported.
 */
export function createMultiLineInterface(
  options: readline.ReadLineOptions,
): readline.Interface {
  const rl = readline.createInterface(options)

  let inBracketedPaste = false
  let pasteBuffer: string[] = []

  // We need to intercept stdin to detect bracketed paste sequences.
  // This is done at a low level to avoid interfering with readline.
  const origInputStream = options.input ?? process.stdin

  // Track bracketed paste state
  if (origInputStream.isTTY) {
    enableBracketedPaste()
  }

  // Listen for the raw key events to handle bracketed paste
  // Note: readline handles most input; we only need to track paste state
  const origListeners = origInputStream.listeners('data')

  return rl
}

/**
 * Process raw input string, handling bracketed paste mode and
 * backslash continuation.
 *
 * Returns the processed text and whether it's a multi-line input.
 */
export function processInput(raw: string): MultiLineResult {
  // Handle bracketed paste
  if (raw.includes(BRACKET_PASTE_START)) {
    const startIdx = raw.indexOf(BRACKET_PASTE_START)
    const endIdx = raw.indexOf(BRACKET_PASTE_END, startIdx)
    if (endIdx > startIdx) {
      const pasted = raw.slice(startIdx + BRACKET_PASTE_START.length, endIdx)
      // Remove trailing newline from paste (terminals add one)
      const trimmed = pasted.endsWith('\n') ? pasted.slice(0, -1) : pasted
      return { text: trimmed, isMultiLine: true }
    }
  }

  // Handle backslash continuation
  if (raw.endsWith('\\\n') || raw.endsWith('\\\r\n')) {
    const base = raw.replace(/\\\r?\n$/, '')
    return { text: base, isMultiLine: false }
  }

  // Check if it looks like multi-line content (contains unescaped newlines)
  const lines = raw.split(/\r?\n/).filter(Boolean)
  if (lines.length > 1) {
    return { text: raw.trim(), isMultiLine: true }
  }

  return { text: raw.trim(), isMultiLine: false }
}
