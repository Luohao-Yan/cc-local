/**
 * Vim Mode Integration for Native REPL
 *
 * Provides a simplified Vim mode that works with readline.
 * Full Vim support requires raw terminal input which is not
 * available in standard readline mode.
 */

import {
  type VimState,
  type PersistentState,
  type CommandState,
  type Operator,
  type FindType,
  type TextObjScope,
  type RecordedChange,
  createInitialVimState,
  createInitialPersistentState,
  OPERATORS,
  SIMPLE_MOTIONS,
  FIND_KEYS,
  TEXT_OBJ_SCOPES,
  TEXT_OBJ_TYPES,
  MAX_VIM_COUNT,
} from './types.js'

// Re-export types
export {
  type VimState,
  type PersistentState,
  type CommandState,
  type Operator,
  type FindType,
  type TextObjScope,
  type RecordedChange,
  createInitialVimState,
  createInitialPersistentState,
  OPERATORS,
  SIMPLE_MOTIONS,
  FIND_KEYS,
  TEXT_OBJ_SCOPES,
  TEXT_OBJ_TYPES,
  MAX_VIM_COUNT,
}

/**
 * Vim mode manager for terminal input
 *
 * This is a simplified Vim mode that works with line-based input.
 * It tracks the current mode and provides basic navigation.
 */
export class VimModeManager {
  private state: VimState
  private persistentState: PersistentState
  private modeListeners: ((mode: 'INSERT' | 'NORMAL') => void)[] = []

  constructor() {
    this.state = createInitialVimState()
    this.persistentState = createInitialPersistentState()
  }

  /**
   * Get current mode
   */
  getMode(): 'INSERT' | 'NORMAL' {
    return this.state.mode
  }

  /**
   * Get current command state (for NORMAL mode)
   */
  getCommandState(): CommandState | null {
    if (this.state.mode === 'NORMAL') {
      return this.state.command
    }
    return null
  }

  /**
   * Switch to INSERT mode
   */
  enterInsertMode(): void {
    if (this.state.mode === 'NORMAL') {
      this.state = { mode: 'INSERT', insertedText: '' }
      this.notifyModeChange('INSERT')
    }
  }

  /**
   * Switch to NORMAL mode
   */
  enterNormalMode(): void {
    if (this.state.mode === 'INSERT') {
      // Record the inserted text for dot-repeat
      if (this.state.insertedText) {
        this.persistentState.lastChange = {
          type: 'insert',
          text: this.state.insertedText,
        }
      }
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      this.notifyModeChange('NORMAL')
    }
  }

  /**
   * Toggle between INSERT and NORMAL mode
   */
  toggleMode(): void {
    if (this.state.mode === 'INSERT') {
      this.enterNormalMode()
    } else {
      this.enterInsertMode()
    }
  }

  /**
   * Handle key input in NORMAL mode
   *
   * Returns true if the key was consumed, false otherwise.
   */
  handleNormalKey(key: string): { consumed: boolean; action?: string } {
    if (this.state.mode !== 'NORMAL') {
      return { consumed: false }
    }

    const cmd = this.state.command

    // Handle idle state
    if (cmd.type === 'idle') {
      // Switch to INSERT mode
      if (key === 'i' || key === 'a' || key === 'o' || key === 'O') {
        this.enterInsertMode()
        return { consumed: true, action: 'enter-insert' }
      }

      // Simple motions
      if (SIMPLE_MOTIONS.has(key)) {
        return { consumed: true, action: `motion:${key}` }
      }

      // Start count
      if (/[1-9]/.test(key)) {
        this.state = {
          mode: 'NORMAL',
          command: { type: 'count', digits: key },
        }
        return { consumed: true }
      }

      // Start operator
      if (key in OPERATORS) {
        this.state = {
          mode: 'NORMAL',
          command: { type: 'operator', op: OPERATORS[key as keyof typeof OPERATORS], count: 1 },
        }
        return { consumed: true }
      }

      // Find motion
      if (FIND_KEYS.has(key)) {
        this.state = {
          mode: 'NORMAL',
          command: { type: 'find', find: key as FindType, count: 1 },
        }
        return { consumed: true }
      }

      // Other commands
      switch (key) {
        case 'g':
          this.state = { mode: 'NORMAL', command: { type: 'g', count: 1 } }
          return { consumed: true }
        case 'r':
          this.state = { mode: 'NORMAL', command: { type: 'replace', count: 1 } }
          return { consumed: true }
        case '>':
        case '<':
          this.state = { mode: 'NORMAL', command: { type: 'indent', dir: key, count: 1 } }
          return { consumed: true }
        case 'x':
          return { consumed: true, action: 'delete-char' }
        case 'p':
          return { consumed: true, action: 'paste-after' }
        case 'P':
          return { consumed: true, action: 'paste-before' }
        case 'u':
          return { consumed: true, action: 'undo' }
        case '.':
          return { consumed: true, action: 'repeat' }
        case '~':
          return { consumed: true, action: 'toggle-case' }
        case 'J':
          return { consumed: true, action: 'join-lines' }
        case 'G':
          return { consumed: true, action: 'goto-last-line' }
        case '$':
          return { consumed: true, action: 'goto-line-end' }
        case '0':
          return { consumed: true, action: 'goto-line-start' }
      }

      return { consumed: false }
    }

    // Handle count state
    if (cmd.type === 'count') {
      if (/[0-9]/.test(key)) {
        const newDigits = cmd.digits + key
        const count = Math.min(parseInt(newDigits, 10), MAX_VIM_COUNT)
        this.state = { mode: 'NORMAL', command: { type: 'count', digits: String(count) } }
        return { consumed: true }
      }

      // Non-digit ends count, try to handle as command
      const count = parseInt(cmd.digits, 10)

      if (key === 'G') {
        this.state = { mode: 'NORMAL', command: { type: 'idle' } }
        return { consumed: true, action: `goto-line:${count}` }
      }

      // Reset to idle for unrecognized input
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      return { consumed: false }
    }

    // Handle operator state
    if (cmd.type === 'operator') {
      // Double operator = line operation (dd, cc, yy)
      const opFirstChar = cmd.op[0]
      if (key === opFirstChar) {
        this.state = { mode: 'NORMAL', command: { type: 'idle' } }
        return { consumed: true, action: `${cmd.op}-line` }
      }

      // Motion
      if (SIMPLE_MOTIONS.has(key)) {
        this.state = { mode: 'NORMAL', command: { type: 'idle' } }
        return { consumed: true, action: `${cmd.op}-motion:${key}` }
      }

      // Find
      if (FIND_KEYS.has(key)) {
        this.state = {
          mode: 'NORMAL',
          command: { type: 'operatorFind', op: cmd.op, count: cmd.count, find: key as FindType },
        }
        return { consumed: true }
      }

      // Text object scope
      if (key in TEXT_OBJ_SCOPES) {
        this.state = {
          mode: 'NORMAL',
          command: {
            type: 'operatorTextObj',
            op: cmd.op,
            count: cmd.count,
            scope: TEXT_OBJ_SCOPES[key as keyof typeof TEXT_OBJ_SCOPES],
          },
        }
        return { consumed: true }
      }

      // Cancel
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      return { consumed: false }
    }

    // Handle find state
    if (cmd.type === 'find') {
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      return { consumed: true, action: `find:${cmd.find}:${key}` }
    }

    // Handle operatorFind state
    if (cmd.type === 'operatorFind') {
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      return { consumed: true, action: `${cmd.op}-find:${cmd.find}:${key}` }
    }

    // Handle operatorTextObj state
    if (cmd.type === 'operatorTextObj') {
      if (TEXT_OBJ_TYPES.has(key)) {
        this.state = { mode: 'NORMAL', command: { type: 'idle' } }
        return { consumed: true, action: `${cmd.op}-textobj:${cmd.scope}:${key}` }
      }
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      return { consumed: false }
    }

    // Handle replace state
    if (cmd.type === 'replace') {
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      if (key) {
        return { consumed: true, action: `replace:${key}` }
      }
      return { consumed: false }
    }

    // Handle indent state
    if (cmd.type === 'indent') {
      if (key === cmd.dir) {
        this.state = { mode: 'NORMAL', command: { type: 'idle' } }
        return { consumed: true, action: `indent:${cmd.dir}` }
      }
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      return { consumed: false }
    }

    // Handle g state
    if (cmd.type === 'g') {
      if (key === 'g') {
        this.state = { mode: 'NORMAL', command: { type: 'idle' } }
        return { consumed: true, action: 'goto-first-line' }
      }
      if (key === 'j' || key === 'k') {
        this.state = { mode: 'NORMAL', command: { type: 'idle' } }
        return { consumed: true, action: `motion:g${key}` }
      }
      this.state = { mode: 'NORMAL', command: { type: 'idle' } }
      return { consumed: false }
    }

    return { consumed: false }
  }

  /**
   * Add inserted text (for INSERT mode)
   */
  addInsertedText(text: string): void {
    if (this.state.mode === 'INSERT') {
      this.state.insertedText += text
    }
  }

  /**
   * Get the register content
   */
  getRegister(): string {
    return this.persistentState.register
  }

  /**
   * Set the register content
   */
  setRegister(content: string, linewise: boolean = false): void {
    this.persistentState.register = content
    this.persistentState.registerIsLinewise = linewise
  }

  /**
   * Check if register is linewise
   */
  isRegisterLinewise(): boolean {
    return this.persistentState.registerIsLinewise
  }

  /**
   * Get last change for dot-repeat
   */
  getLastChange(): RecordedChange | null {
    return this.persistentState.lastChange
  }

  /**
   * Set last change
   */
  setLastChange(change: RecordedChange): void {
    this.persistentState.lastChange = change
  }

  /**
   * Get last find
   */
  getLastFind(): { type: FindType; char: string } | null {
    return this.persistentState.lastFind
  }

  /**
   * Set last find
   */
  setLastFind(type: FindType, char: string): void {
    this.persistentState.lastFind = { type, char }
  }

  /**
   * Subscribe to mode changes
   */
  onModeChange(listener: (mode: 'INSERT' | 'NORMAL') => void): () => void {
    this.modeListeners.push(listener)
    return () => {
      const index = this.modeListeners.indexOf(listener)
      if (index > -1) {
        this.modeListeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify mode change listeners
   */
  private notifyModeChange(mode: 'INSERT' | 'NORMAL'): void {
    for (const listener of this.modeListeners) {
      listener(mode)
    }
  }

  /**
   * Get mode indicator string
   */
  getModeIndicator(): string {
    if (this.state.mode === 'INSERT') {
      return '-- INSERT --'
    }

    const cmd = this.state.command
    if (cmd.type === 'idle') {
      return ''
    }

    // Build command indicator
    switch (cmd.type) {
      case 'count':
        return cmd.digits
      case 'operator':
        return cmd.op[0]
      case 'operatorCount':
        return `${cmd.op[0]}${cmd.digits}`
      case 'operatorFind':
        return `${cmd.op[0]}${cmd.find}`
      case 'operatorTextObj':
        return `${cmd.op[0]}${cmd.scope[0]}`
      case 'find':
        return cmd.find
      case 'g':
        return 'g'
      case 'operatorG':
        return `${cmd.op[0]}g`
      case 'replace':
        return 'r'
      case 'indent':
        return cmd.dir
      default:
        return ''
    }
  }
}

/**
 * Create a new Vim mode manager
 */
export function createVimModeManager(): VimModeManager {
  return new VimModeManager()
}
