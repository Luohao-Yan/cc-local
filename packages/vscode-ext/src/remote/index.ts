/**
 * Remote Module - CCLocal VS Code Extension
 * SSH connections, remote sessions, and teleport operations
 */

// Types
export type {
  SSHConfig,
  SSHConfigEntry,
  RemoteSession,
  RemoteSessionCreateOptions,
  RemoteConnectionStatus,
  TeleportOperation,
  FileTransferProgress,
  RemoteEventType,
  RemoteEvent,
  RemoteEventHandler,
  VSCodeRemoteAuthority,
  RemoteWorkspaceInfo,
  RemoteCommandResult,
  RemoteStats,
} from './types.js'

// Manager
export {
  RemoteSessionManager,
  getRemoteSessionManager,
  disposeRemoteSessionManager,
} from './RemoteSessionManager.js'

// Panel
export { RemotePanelProvider } from './RemotePanelProvider.js'
