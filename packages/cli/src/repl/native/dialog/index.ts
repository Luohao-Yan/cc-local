/**
 * Dialog System Index
 *
 * Exports permission dialogs, modal manager, and picker dialogs
 * for the Native REPL.
 */

// Permission types
export * from './PermissionTypes.js'

// Permission rendering
export {
  renderPermissionDialog,
  parsePermissionInput,
  renderPermissionResult,
} from './PermissionRenderer.js'

// Modal manager
export {
  ModalManager,
  createModalManager,
} from './ModalManager.js'
export type {
  ModalDialog,
  DialogType,
  DialogOption,
  DialogResult,
} from './ModalManager.js'

// Picker dialogs
export {
  createPickerState,
  filterPickerItems,
  pickerMoveUp,
  pickerMoveDown,
  pickerSelect,
  renderPicker,
  createModelPicker,
  createHistoryPicker,
  createQuickOpen,
  createGlobalSearch,
} from './PickerDialogs.js'
export type {
  PickerItem,
  PickerState,
} from './PickerDialogs.js'
