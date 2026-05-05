/**
 * Native REPL enhancement modules
 *
 * These modules provide rich terminal output for the packages-native
 * REPL path (--native flag), bringing it closer to the Ink UI.
 */

// Core rendering
export { renderMarkdown, renderCodeBlock, renderDiff, renderInlineDiff, renderStatusLine, renderPrompt, spinnerFrame } from './renderer.js'
export { renderToolUse, renderToolResult } from './toolRenderer.js'
export { enableBracketedPaste, disableBracketedPaste, processInput } from './multilineInput.js'
export { createCompleter } from './completer.js'
export { createModeManager } from './modeManager.js'
export { askPermissionEnhanced } from './permissionDialog.js'

// Layout system (Phase 1)
export { TerminalLayout, createTerminalLayout, type LayoutConfig, type LayoutRegion, type LayoutRegionName } from './layout/TerminalLayout.js'
export { renderStatusBar, renderCompactStatus, updateStatusBar, type StatusBarInfo } from './layout/StatusBar.js'

// Screen buffer (Phase 1)
export { ScreenBuffer, createScreenBuffer, type BufferMessage, type ScreenBufferOptions } from './ScreenBuffer.js'

// Event system (Phase 1)
export { EventEmitter, createEventEmitter, parseKeyEvent, formatKeyEvent, keyMatches, type KeyEvent, type ResizeEvent, type NativeReplEvents } from './EventEmitter.js'

// Message system (Phase 2)
export * from './messages/index.js'
