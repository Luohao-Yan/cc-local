/**
 * Modal Dialog Manager
 *
 * Manages modal dialog stack for the Native REPL.
 * Supports multiple concurrent dialogs, keyboard navigation,
 * and dialog-specific key bindings.
 */

import chalk from 'chalk'

/**
 * Dialog types
 */
export type DialogType =
  | 'permission'
  | 'model-picker'
  | 'history-picker'
  | 'quick-open'
  | 'global-search'
  | 'help'
  | 'settings'
  | 'confirm'

/**
 * Base dialog configuration
 */
export interface ModalDialog {
  /** Unique dialog ID */
  id: string
  /** Dialog type */
  type: DialogType
  /** Dialog title */
  title: string
  /** Dialog content (pre-rendered string) */
  content: string
  /** Available options/choices */
  options: DialogOption[]
  /** Default option index */
  defaultOption?: number
  /** Whether the dialog can be dismissed with Escape */
  dismissible?: boolean
  /** Custom key bindings for this dialog */
  keyBindings?: Record<string, (dialog: ModalDialog) => void>
  /** Dialog-specific state */
  state?: Record<string, unknown>
  /** Callback when dialog is resolved */
  onResolve?: (result: DialogResult) => void
}

/**
 * Dialog option/choice
 */
export interface DialogOption {
  /** Option key (single character) */
  key: string
  /** Display label */
  label: string
  /** Option description */
  description?: string
  /** Whether this is the default choice */
  isDefault?: boolean
  /** Color for display */
  color?: (s: string) => string
}

/**
 * Dialog result
 */
export interface DialogResult {
  /** Dialog ID */
  dialogId: string
  /** Selected option key */
  selectedKey: string
  /** Additional result data */
  data?: Record<string, unknown>
}

/**
 * Modal Dialog Manager class
 */
export class ModalManager {
  private dialogStack: ModalDialog[] = []
  private listeners: Set<() => void> = new Set()

  /**
   * Push a dialog onto the stack
   */
  push(dialog: ModalDialog): void {
    this.dialogStack.push(dialog)
    this.notifyListeners()
  }

  /**
   * Pop the top dialog and resolve it
   */
  pop(result?: DialogResult): ModalDialog | undefined {
    const dialog = this.dialogStack.pop()
    if (dialog && result) {
      result.dialogId = dialog.id
      dialog.onResolve?.(result)
    }
    this.notifyListeners()
    return dialog
  }

  /**
   * Remove a specific dialog by ID
   */
  remove(dialogId: string): boolean {
    const index = this.dialogStack.findIndex((d) => d.id === dialogId)
    if (index === -1) return false

    this.dialogStack.splice(index, 1)
    this.notifyListeners()
    return true
  }

  /**
   * Get the current (top) dialog
   */
  getCurrent(): ModalDialog | undefined {
    return this.dialogStack[this.dialogStack.length - 1]
  }

  /**
   * Check if any dialog is active
   */
  isActive(): boolean {
    return this.dialogStack.length > 0
  }

  /**
   * Get all active dialogs
   */
  getAll(): ModalDialog[] {
    return [...this.dialogStack]
  }

  /**
   * Get dialog count
   */
  getCount(): number {
    return this.dialogStack.length
  }

  /**
   * Clear all dialogs
   */
  clear(): void {
    this.dialogStack = []
    this.notifyListeners()
  }

  /**
   * Handle key input for the current dialog
   */
  handleKey(key: string): boolean {
    const dialog = this.getCurrent()
    if (!dialog) return false

    // Check custom key bindings first
    if (dialog.keyBindings && key in dialog.keyBindings) {
      dialog.keyBindings[key]!(dialog)
      return true
    }

    // Check options
    const option = dialog.options.find((o) => o.key === key.toLowerCase())
    if (option) {
      const result: DialogResult = {
        dialogId: dialog.id,
        selectedKey: option.key,
      }
      this.pop(result)
      return true
    }

    // Escape dismisses dismissible dialogs
    if (key === 'escape' && dialog.dismissible !== false) {
      this.pop({ dialogId: dialog.id, selectedKey: 'escape' })
      return true
    }

    // Enter selects default option
    if (key === 'return' || key === 'enter') {
      const defaultOpt =
        dialog.options.find((o) => o.isDefault) ??
        dialog.options[dialog.defaultOption ?? 0]
      if (defaultOpt) {
        this.pop({ dialogId: dialog.id, selectedKey: defaultOpt.key })
        return true
      }
    }

    return false
  }

  /**
   * Render the current dialog
   */
  render(): string {
    const dialog = this.getCurrent()
    if (!dialog) return ''

    const lines: string[] = []
    const width = 50

    // Top border
    lines.push('')
    lines.push(chalk.bold(`╔═ ${dialog.title} ═${'═'.repeat(Math.max(0, width - dialog.title.length - 4))}`))

    // Content
    const contentLines = dialog.content.split('\n')
    for (const line of contentLines) {
      lines.push(`║ ${line}`)
    }

    // Options
    if (dialog.options.length > 0) {
      lines.push('║')
      const optionStr = dialog.options
        .map((o) => {
          const colorFn = o.color ?? chalk.white
          const bracket = typeof colorFn === 'function' && 'bold' in colorFn
            ? (colorFn as { bold: (s: string) => string }).bold(`[${o.key}]`)
            : colorFn(`[${o.key}]`)
          return `${bracket} ${o.label}`
        })
        .join('  ')
      lines.push(`║ ${optionStr}`)
    }

    // Dismiss hint
    if (dialog.dismissible !== false) {
      lines.push(`║ ${chalk.dim('Esc to dismiss')}`)
    }

    // Bottom border
    lines.push(chalk.bold(`╚${'═'.repeat(width + 2)}`))

    return lines.join('\n')
  }

  /**
   * Subscribe to dialog changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Wait for a specific dialog to resolve
   */
  waitForDialog(dialogId: string): Promise<DialogResult> {
    return new Promise((resolve) => {
      const dialog = this.dialogStack.find((d) => d.id === dialogId)
      if (dialog) {
        const originalResolve = dialog.onResolve
        dialog.onResolve = (result: DialogResult) => {
          originalResolve?.(result)
          resolve(result)
        }
      }
    })
  }

  /**
   * Show a simple confirm dialog
   */
  confirm(title: string, message: string, defaultYes: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      const id = `confirm-${Date.now()}`
      const dialog: ModalDialog = {
        id,
        type: 'confirm',
        title,
        content: message,
        dismissible: true,
        options: [
          { key: 'y', label: 'Yes', isDefault: defaultYes, color: chalk.green },
          { key: 'n', label: 'No', isDefault: !defaultYes, color: chalk.red },
        ],
        onResolve: (result) => {
          resolve(result.selectedKey === 'y')
        },
      }
      this.push(dialog)
    })
  }

  /**
   * Show a help dialog
   */
  showHelp(helpContent: string): void {
    this.push({
      id: `help-${Date.now()}`,
      type: 'help',
      title: 'Keyboard Shortcuts',
      content: helpContent,
      dismissible: true,
      options: [],
    })
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

/**
 * Create a modal manager instance
 */
export function createModalManager(): ModalManager {
  return new ModalManager()
}
