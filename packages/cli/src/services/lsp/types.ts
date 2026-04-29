/** LSP server configuration for plugins. */

export interface LspServerConfig {
  [key: string]: unknown
}

export interface ScopedLspServerConfig extends LspServerConfig {
  [key: string]: unknown
}
