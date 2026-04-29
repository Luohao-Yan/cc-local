export type KeybindingContextName =
  | 'Global'
  | 'Chat'
  | 'Autocomplete'
  | 'Confirmation'
  | 'Help'
  | 'Transcript'
  | 'HistorySearch'
  | 'Task'
  | 'ThemePicker'
  | 'Settings'
  | 'Tabs'
  | 'Attachments'
  | 'Footer'
  | 'MessageSelector'
  | 'DiffDialog'
  | 'ModelPicker'
  | 'Select'
  | 'Plugin'

export type KeybindingAction = string

export interface ParsedKeystroke {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
  super: boolean
}

export type Chord = ParsedKeystroke[]

export interface ParsedBinding {
  chord: Chord
  action: string | null
  context: KeybindingContextName
}

export interface KeybindingBlock {
  context: KeybindingContextName
  bindings: Record<string, string | null>
}
