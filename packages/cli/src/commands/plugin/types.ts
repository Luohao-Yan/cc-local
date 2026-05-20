/** Plugin command types — no shared imports yet in this checkout. */

export type ViewState =
  | { mode: 'list' }
  | { mode: 'detail'; itemId: string }
  | { mode: 'search'; query: string }
  | { mode: 'settings'; itemId: string }
  | string
  | { type: 'plugin-options'; plugin: unknown; pluginId: string }
  | { type: 'configuring-options'; schema: unknown }
  | { type: 'configuring' }
  | { type: 'confirm-project-uninstall' }
  | { type: 'confirm-data-cleanup'; size: { bytes: number; human: string } }
  | { type: 'flagged-detail'; plugin: unknown }
  | { type: 'failed-plugin-details'; plugin: unknown }
  | { type: 'mcp-detail'; client: unknown }
