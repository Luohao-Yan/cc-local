/**
 * Picker Dialogs for Native REPL
 *
 * Implements searchable, navigable selection dialogs:
 * - ModelPicker: Switch between models
 * - HistoryPicker: Browse and select from command history
 * - QuickOpen: Open recent files
 * - GlobalSearch: Search across messages
 */

import chalk from 'chalk'
import type { ModalDialog, DialogOption, DialogResult } from './ModalManager.js'

/**
 * Picker item (generic)
 */
export interface PickerItem {
  /** Unique ID */
  id: string
  /** Display label */
  label: string
  /** Optional description */
  description?: string
  /** Optional detail text */
  detail?: string
  /** Whether the item is selected */
  selected?: boolean
}

/**
 * Picker state
 */
export interface PickerState {
  /** Filter/query string */
  query: string
  /** Current cursor position */
  cursorIndex: number
  /** Scroll offset */
  scrollOffset: number
  /** All items */
  items: PickerItem[]
  /** Filtered items */
  filteredItems: PickerItem[]
  /** Whether the picker is active */
  isActive: boolean
}

/**
 * Create a base picker state
 */
export function createPickerState(items: PickerItem[]): PickerState {
  return {
    query: '',
    cursorIndex: 0,
    scrollOffset: 0,
    items,
    filteredItems: items,
    isActive: true,
  }
}

/**
 * Filter picker items by query
 */
export function filterPickerItems(state: PickerState, query: string): PickerState {
  const filtered = query
    ? state.items.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          (item.description?.toLowerCase().includes(q) ?? false)
        )
      })
    : state.items

  return {
    ...state,
    query,
    filteredItems: filtered,
    cursorIndex: Math.min(state.cursorIndex, Math.max(0, filtered.length - 1)),
    scrollOffset: 0,
  }
}

/**
 * Move cursor up in picker
 */
export function pickerMoveUp(state: PickerState): PickerState {
  if (state.cursorIndex <= 0) return state
  return { ...state, cursorIndex: state.cursorIndex - 1 }
}

/**
 * Move cursor down in picker
 */
export function pickerMoveDown(state: PickerState, maxVisible: number = 10): PickerState {
  if (state.cursorIndex >= state.filteredItems.length - 1) return state
  return { ...state, cursorIndex: state.cursorIndex + 1 }
}

/**
 * Select current item in picker
 */
export function pickerSelect(state: PickerState): PickerItem | undefined {
  return state.filteredItems[state.cursorIndex]
}

/**
 * Render a picker dialog
 */
export function renderPicker(
  title: string,
  state: PickerState,
  maxVisible: number = 10,
): string {
  const lines: string[] = []
  const width = 60

  // Header
  lines.push('')
  lines.push(chalk.bold(`╔═ ${title} ═${'═'.repeat(Math.max(0, width - title.length - 4))}`))

  // Search bar
  const searchPrompt = `${chalk.dim('Search:')} ${state.query}${chalk.dim('▌')}`
  lines.push(`║ ${searchPrompt}`)

  // Items
  if (state.filteredItems.length === 0) {
    lines.push(`║ ${chalk.dim('No matches found')}`)
  } else {
    // Calculate scroll window
    let scrollStart = state.scrollOffset
    let scrollEnd = scrollStart + maxVisible

    if (state.cursorIndex >= scrollEnd) {
      scrollEnd = state.cursorIndex + 1
      scrollStart = scrollEnd - maxVisible
    }
    if (state.cursorIndex < scrollStart) {
      scrollStart = state.cursorIndex
      scrollEnd = scrollStart + maxVisible
    }

    const visibleItems = state.filteredItems.slice(scrollStart, scrollEnd)

    for (let i = 0; i < visibleItems.length; i++) {
      const item = visibleItems[i]!
      const globalIndex = scrollStart + i
      const isCursor = globalIndex === state.cursorIndex

      const prefix = isCursor ? chalk.cyan.bold('❯') : ' '
      const label = isCursor ? chalk.cyan.bold(item.label) : item.label
      const desc = item.description
        ? isCursor
          ? chalk.dim(` ${item.description}`)
          : chalk.dim(` ${item.description}`)
        : ''

      lines.push(`║ ${prefix} ${label}${desc}`)
    }

    // Scroll indicator
    if (state.filteredItems.length > maxVisible) {
      const total = state.filteredItems.length
      const current = state.cursorIndex + 1
      lines.push(`║ ${chalk.dim(`── ${current}/${total} ──`)}`)
    }
  }

  // Footer
  lines.push(`║ ${chalk.dim('↑↓ navigate  Enter select  Esc cancel  Type to filter')}`)
  lines.push(chalk.bold(`╚${'═'.repeat(width + 2)}`))

  return lines.join('\n')
}

// ─── Model Picker ─────────────────────────────────────────────────────

/**
 * Create a model picker dialog
 */
export function createModelPicker(
  models: Array<{ id: string; name: string; description?: string }>,
  onResolve: (modelId: string | undefined) => void,
): ModalDialog {
  const items: PickerItem[] = models.map((m) => ({
    id: m.id,
    label: m.name,
    description: m.description,
  }))

  const state = createPickerState(items)

  return {
    id: `model-picker-${Date.now()}`,
    type: 'model-picker',
    title: 'Model Picker',
    content: renderPicker('Model Picker', state),
    dismissible: true,
    options: [],
    state: { picker: state },
    onResolve: (result: DialogResult) => {
      if (result.selectedKey === 'escape') {
        onResolve(undefined)
      } else {
        const selected = pickerSelect(state)
        onResolve(selected?.id)
      }
    },
  }
}

// ─── History Picker ────────────────────────────────────────────────────

/**
 * Create a history picker dialog
 */
export function createHistoryPicker(
  entries: Array<{ display: string; timestamp?: number }>,
  onResolve: (entry: string | undefined) => void,
): ModalDialog {
  const items: PickerItem[] = entries.map((e, i) => ({
    id: `history-${i}`,
    label: e.display.length > 60 ? e.display.slice(0, 57) + '...' : e.display,
    description: e.timestamp ? new Date(e.timestamp).toLocaleString() : undefined,
  }))

  const state = createPickerState(items)

  return {
    id: `history-picker-${Date.now()}`,
    type: 'history-picker',
    title: 'Command History',
    content: renderPicker('Command History', state),
    dismissible: true,
    options: [],
    state: { picker: state },
    onResolve: (result: DialogResult) => {
      if (result.selectedKey === 'escape') {
        onResolve(undefined)
      } else {
        const selected = pickerSelect(state)
        onResolve(selected?.label)
      }
    },
  }
}

// ─── Quick Open ────────────────────────────────────────────────────────

/**
 * Create a quick-open file dialog
 */
export function createQuickOpen(
  files: Array<{ path: string; relativePath: string }>,
  onResolve: (filePath: string | undefined) => void,
): ModalDialog {
  const items: PickerItem[] = files.map((f) => ({
    id: f.path,
    label: f.relativePath,
  }))

  const state = createPickerState(items)

  return {
    id: `quick-open-${Date.now()}`,
    type: 'quick-open',
    title: 'Quick Open',
    content: renderPicker('Quick Open', state),
    dismissible: true,
    options: [],
    state: { picker: state },
    onResolve: (result: DialogResult) => {
      if (result.selectedKey === 'escape') {
        onResolve(undefined)
      } else {
        const selected = pickerSelect(state)
        onResolve(selected?.id)
      }
    },
  }
}

// ─── Global Search ─────────────────────────────────────────────────────

/**
 * Create a global search dialog
 */
export function createGlobalSearch(
  messages: Array<{ id: string; content: string; type: string }>,
  onResolve: (messageId: string | undefined) => void,
): ModalDialog {
  const items: PickerItem[] = messages.map((m) => ({
    id: m.id,
    label:
      m.type === 'user_text'
        ? chalk.green('You: ')
        : m.type === 'assistant_text'
          ? chalk.blue('Assistant: ')
          : chalk.dim('System: '),
    description:
      m.content.length > 60 ? m.content.slice(0, 57) + '...' : m.content,
  }))

  const state = createPickerState(items)

  return {
    id: `global-search-${Date.now()}`,
    type: 'global-search',
    title: 'Search Messages',
    content: renderPicker('Search Messages', state),
    dismissible: true,
    options: [],
    state: { picker: state },
    onResolve: (result: DialogResult) => {
      if (result.selectedKey === 'escape') {
        onResolve(undefined)
      } else {
        const selected = pickerSelect(state)
        onResolve(selected?.id)
      }
    },
  }
}
