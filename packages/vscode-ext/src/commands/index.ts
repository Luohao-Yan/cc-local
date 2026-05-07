/**
 * Commands Module - CCLocal VS Code Extension
 * Central exports for all command-related functionality
 */

// Command Registry
export {
  type CommandDefinition,
  type CommandDependencies,
  chatCommands,
  editCommands,
  navigationCommands,
  modelCommands,
  utilityCommands,
  allCommands,
  registerAllCommands,
} from './registry'

// Keyboard Shortcuts
export {
  registerKeyboardShortcuts,
  showCommandPalette,
  registerCommandPalette,
  type PaletteCommand,
} from './keyboard'
