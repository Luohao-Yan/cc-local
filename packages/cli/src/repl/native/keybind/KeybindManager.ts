/**
 * Keybind Manager for Native REPL
 *
 * Manages keyboard shortcut bindings with:
 * - Context-aware key routing (Global, Chat, Confirmation, etc.)
 * - Default bindings matching Ink UI behavior
 * - User customization support
 * - Conflict detection
 * - Chord support (e.g., ctrl+x ctrl+e)
 */

import type { KeybindingContextName, ParsedKeystroke, Chord, KeybindingBlock } from '../../../keybindings/types.js'
import { DEFAULT_BINDINGS } from '../../../keybindings/defaultBindings.js'
import { parseKeystroke } from '../../../keybindings/parser.js'

/**
 * Keybinding action handler
 */
export type KeybindHandler = (action: string) => void

/**
 * Keybind manager options
 */
export interface KeybindManagerOptions {
  /** Custom bindings to overlay on defaults */
  customBindings?: KeybindingBlock[]
  /** Enable chord timeout (ms) */
  chordTimeout?: number
}

/**
 * Resolved binding entry
 */
interface ResolvedBinding {
  context: KeybindingContextName
  key: string
  action: string
  parsed: Chord
}

/**
 * Keybind Manager class
 */
export class KeybindManager {
  private bindings: ResolvedBinding[] = []
  private handlers: Map<string, KeybindHandler> = new Map()
  private activeContexts: Set<KeybindingContextName> = new Set(['Global'])
  private chordState: { prefix: ParsedKeystroke; timestamp: number } | null = null
  private chordTimeout: number

  constructor(options: KeybindManagerOptions = {}) {
    this.chordTimeout = options.chordTimeout ?? 1000
    this.loadBindings(options.customBindings)
  }

  /**
   * Load and resolve bindings from defaults + custom
   */
  private loadBindings(custom?: KeybindingBlock[]): void {
    this.bindings = []

    // Load defaults
    for (const block of DEFAULT_BINDINGS) {
      for (const [key, action] of Object.entries(block.bindings)) {
        if (action !== null) {
          this.bindings.push({
            context: block.context,
            key,
            action,
            parsed: this.parseChord(key),
          })
        }
      }
    }

    // Overlay custom bindings (last wins)
    if (custom) {
      for (const block of custom) {
        for (const [key, action] of Object.entries(block.bindings)) {
          if (action === null) {
            // Remove binding
            this.bindings = this.bindings.filter(
              (b) => !(b.context === block.context && b.key === key),
            )
          } else {
            // Add/replace binding
            this.bindings = this.bindings.filter(
              (b) => !(b.context === block.context && b.key === key),
            )
            this.bindings.push({
              context: block.context,
              key,
              action,
              parsed: this.parseChord(key),
            })
          }
        }
      }
    }
  }

  /**
   * Parse a chord string into parsed keystrokes
   */
  private parseChord(key: string): Chord {
    return key.split(' ').map((k) => parseKeystroke(k))
  }

  /**
   * Register an action handler
   */
  on(action: string, handler: KeybindHandler): () => void {
    this.handlers.set(action, handler)
    return () => this.handlers.delete(action)
  }

  /**
   * Set the active contexts (ordered by priority)
   */
  setContexts(contexts: KeybindingContextName[]): void {
    this.activeContexts = new Set(['Global', ...contexts])
  }

  /**
   * Process a key event and dispatch matching action
   */
  processKey(key: ParsedKeystroke): boolean {
    const now = Date.now()

    // Check for chord continuation
    if (this.chordState && now - this.chordState.timestamp < this.chordTimeout) {
      const match = this.findChordMatch(this.chordState.prefix, key)
      this.chordState = null

      if (match) {
        this.dispatchAction(match.action)
        return true
      }
    }

    // Look for single-key or chord-prefix matches
    const singleMatch = this.findSingleMatch(key)
    const chordPrefix = this.findChordPrefix(key)

    if (singleMatch && !chordPrefix) {
      this.dispatchAction(singleMatch.action)
      return true
    }

    if (chordPrefix) {
      // Start chord state
      this.chordState = { prefix: key, timestamp: now }

      if (singleMatch) {
        // Ambiguous: dispatch single match but also set chord timer
        // After timeout, the single match was the right call
        this.dispatchAction(singleMatch.action)
        return true
      }

      return true // Key consumed, waiting for chord completion
    }

    this.chordState = null
    return false
  }

  /**
   * Find a single-key match in active contexts
   */
  private findSingleMatch(key: ParsedKeystroke): ResolvedBinding | undefined {
    // Search in reverse context priority (most specific first)
    const contextOrder = [...this.activeContexts]

    for (const context of contextOrder) {
      const match = this.bindings.find(
        (b) =>
          b.context === context &&
          b.parsed.length === 1 &&
          this.keystrokesEqual(b.parsed[0]!, key),
      )
      if (match) return match
    }

    return undefined
  }

  /**
   * Find a chord prefix match
   */
  private findChordPrefix(key: ParsedKeystroke): boolean {
    for (const context of this.activeContexts) {
      const match = this.bindings.find(
        (b) =>
          b.context === context &&
          b.parsed.length === 2 &&
          this.keystrokesEqual(b.parsed[0]!, key),
      )
      if (match) return true
    }
    return false
  }

  /**
   * Find a full chord match
   */
  private findChordMatch(prefix: ParsedKeystroke, suffix: ParsedKeystroke): ResolvedBinding | undefined {
    for (const context of this.activeContexts) {
      const match = this.bindings.find(
        (b) =>
          b.context === context &&
          b.parsed.length === 2 &&
          this.keystrokesEqual(b.parsed[0]!, prefix) &&
          this.keystrokesEqual(b.parsed[1]!, suffix),
      )
      if (match) return match
    }
    return undefined
  }

  /**
   * Dispatch an action to its handler
   */
  private dispatchAction(action: string): void {
    const handler = this.handlers.get(action)
    if (handler) {
      handler(action)
    }
  }

  /**
   * Check if two keystrokes are equal
   */
  private keystrokesEqual(a: ParsedKeystroke, b: ParsedKeystroke): boolean {
    return (
      a.key === b.key &&
      a.ctrl === b.ctrl &&
      a.shift === b.shift &&
      a.alt === b.alt &&
      a.meta === b.meta
    )
  }

  /**
   * Detect binding conflicts
   */
  detectConflicts(): Array<{ context: KeybindingContextName; key: string; actions: string[] }> {
    const conflicts: Array<{ context: KeybindingContextName; key: string; actions: string[] }> = []

    const byContext = new Map<string, string[]>()
    for (const b of this.bindings) {
      const k = `${b.context}:${b.key}`
      const list = byContext.get(k) ?? []
      list.push(b.action)
      byContext.set(k, list)
    }

    for (const [k, actions] of byContext) {
      if (actions.length > 1) {
        const [context, key] = k.split(':') as [KeybindingContextName, string]
        conflicts.push({ context, key, actions })
      }
    }

    return conflicts
  }

  /**
   * Get the display string for a shortcut action
   */
  getShortcutDisplay(action: string): string {
    const binding = this.bindings.find((b) => b.action === action)
    if (!binding) return ''
    return binding.key
  }

  /**
   * Get all bindings for a context
   */
  getBindingsForContext(context: KeybindingContextName): ResolvedBinding[] {
    return this.bindings.filter((b) => b.context === context)
  }

  /**
   * Render keybinding help
   */
  renderHelp(): string {
    const lines: string[] = []

    lines.push(chalk.bold('Keyboard Shortcuts'))
    lines.push('')

    const contexts = [...new Set(this.bindings.map((b) => b.context))]

    for (const context of contexts) {
      const contextBindings = this.bindings.filter((b) => b.context === context)
      if (contextBindings.length === 0) continue

      lines.push(chalk.bold.cyan(`  ${context}`))

      for (const b of contextBindings) {
        lines.push(`    ${chalk.dim(b.key.padEnd(22))} ${b.action}`)
      }

      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.handlers.clear()
    this.activeContexts = new Set(['Global'])
    this.chordState = null
    this.loadBindings()
  }
}

/**
 * Create a keybind manager instance
 */
export function createKeybindManager(options?: KeybindManagerOptions): KeybindManager {
  return new KeybindManager(options)
}

// Re-export chalk for renderHelp
import chalk from 'chalk'
