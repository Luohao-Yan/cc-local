/** LSP server configuration for plugins. */

export interface LspServerConfig {
  [key: string]: unknown
}

export interface ScopedLspServerConfig extends LspServerConfig {
  [key: string]: unknown
}

export type LspServerState =
  | { status: 'starting' }
  | { status: 'running'; pid?: number }
  | { status: 'stopped'; exitCode?: number }
  | { status: 'error'; error: string }
