/**
 * Input Modules Index
 *
 * Exports input-related utilities for Native REPL.
 */

export { HistoryManager, createHistoryManager } from './HistoryManager.js'
export type { HistoryNavigationState } from './HistoryManager.js'

export { InputBuffer, createInputBuffer } from './InputBuffer.js'
export type { BufferEntry, InputBufferOptions } from './InputBuffer.js'
