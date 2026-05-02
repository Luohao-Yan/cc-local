/**
 * Native REPL enhancement modules
 *
 * These modules provide rich terminal output for the packages-native
 * REPL path (--native flag), bringing it closer to the legacy Ink UI.
 */

export { renderMarkdown, renderCodeBlock, renderDiff, renderInlineDiff, renderStatusLine, renderPrompt, spinnerFrame } from './renderer.js'
export { renderToolUse, renderToolResult } from './toolRenderer.js'
export { enableBracketedPaste, disableBracketedPaste, processInput } from './multilineInput.js'
export { askPermissionEnhanced } from './permissionDialog.js'
export { createCompleter } from './completer.js'
export { createModeManager } from './modeManager.js'
export type { InteractionMode, ModeState } from './modeManager.js'
export type { PermissionChoice } from './permissionDialog.js'
export type { DiffOptions, StatusLineInfo } from './renderer.js'
