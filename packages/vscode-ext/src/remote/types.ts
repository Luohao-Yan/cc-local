/**
 * Remote Development Types - CCLocal VS Code Extension
 * SSH configuration, remote sessions, and teleport types
 */

// ════════════════════════════════════════════════════════════════════════════
// SSH CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * SSH connection configuration
 */
export interface SSHConfig {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Hostname or IP address */
  host: string
  /** SSH port (default: 22) */
  port: number
  /** SSH username */
  user: string
  /** Path to private key file (optional, uses agent if not provided) */
  privateKey?: string
  /** Passphrase for private key (stored securely) */
  passphrase?: string
  /** Enable SSH agent forwarding */
  agentForwarding?: boolean
  /** Connection timeout in milliseconds */
  timeout?: number
  /** Working directory on remote */
  workingDirectory?: string
  /** Environment variables to set on remote */
  environment?: Record<string, string>
  /** Custom SSH options */
  sshOptions?: Record<string, string>
  /** Last connection time */
  lastConnected?: number
  /** Whether this is a favorite */
  isFavorite?: boolean
}

/**
 * SSH config file entry (~/.ssh/config format)
 */
export interface SSHConfigEntry {
  host: string
  hostname?: string
  port?: number
  user?: string
  identityFile?: string
  forwardAgent?: boolean
  localForward?: string[]
  remoteForward?: string[]
  dynamicForward?: string[]
}

// ════════════════════════════════════════════════════════════════════════════
// REMOTE SESSION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Remote connection status
 */
export type RemoteConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting'

/**
 * Remote session information
 */
export interface RemoteSession {
  /** Unique session identifier */
  id: string
  /** SSH configuration used */
  configId: string
  /** Display name */
  name: string
  /** Connection status */
  status: RemoteConnectionStatus
  /** Connected timestamp */
  connectedAt?: number
  /** Last activity timestamp */
  lastActivity?: number
  /** Remote working directory */
  workingDirectory: string
  /** Platform of remote host */
  platform?: 'linux' | 'darwin' | 'windows'
  /** Shell type on remote */
  shell?: 'bash' | 'zsh' | 'fish' | 'sh' | 'powershell' | 'cmd'
  /** Error message if status is 'error' */
  error?: string
  /** Number of active sessions on this remote */
  sessionCount: number
  /** Bandwidth usage (bytes/sec) */
  bandwidth?: number
  /** Latency in milliseconds */
  latency?: number
}

/**
 * Remote session creation options
 */
export interface RemoteSessionCreateOptions {
  /** SSH config to use */
  config: SSHConfig
  /** Initial working directory */
  workingDirectory?: string
  /** Environment variables */
  environment?: Record<string, string>
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean
  /** Reconnect attempts */
  maxReconnectAttempts?: number
}

/**
 * Teleport operation
 */
export interface TeleportOperation {
  /** Source session ID */
  sourceSessionId: string
  /** Target remote session ID */
  targetRemoteId: string
  /** Teleport status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  /** Progress percentage */
  progress?: number
  /** Error message if failed */
  error?: string
  /** Timestamp */
  timestamp: number
}

/**
 * File transfer progress
 */
export interface FileTransferProgress {
  /** Transfer ID */
  transferId: string
  /** Source path */
  sourcePath: string
  /** Destination path */
  destinationPath: string
  /** Total bytes */
  totalBytes: number
  /** Transferred bytes */
  transferredBytes: number
  /** Transfer rate (bytes/sec) */
  rate: number
  /** Status */
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled'
  /** Error message */
  error?: string
}

// ════════════════════════════════════════════════════════════════════════════
// REMOTE EVENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Remote event types
 */
export type RemoteEventType =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting'
  | 'session_started'
  | 'session_ended'
  | 'file_transfer_started'
  | 'file_transfer_progress'
  | 'file_transfer_completed'
  | 'teleport_started'
  | 'teleport_completed'

/**
 * Remote event
 */
export interface RemoteEvent {
  type: RemoteEventType
  remoteId?: string
  sessionId?: string
  data?: unknown
  timestamp: number
}

/**
 * Remote event handler
 */
export type RemoteEventHandler = (event: RemoteEvent) => void

// ════════════════════════════════════════════════════════════════════════════
// VS CODE REMOTE INTEGRATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * VS Code remote authority info
 */
export interface VSCodeRemoteAuthority {
  /** Authority string (e.g., 'ssh-remote+my-host') */
  authority: string
  /** Remote type */
  type: 'ssh-remote' | 'dev-container' | 'wsl' | 'codespaces'
  /** Host name */
  host: string
  /** Workspace path */
  workspacePath?: string
}

/**
 * Remote workspace info
 */
export interface RemoteWorkspaceInfo {
  /** Workspace folder URI */
  uri: string
  /** Workspace name */
  name: string
  /** Remote authority */
  authority?: VSCodeRemoteAuthority
  /** Is this a trusted workspace */
  isTrusted: boolean
}

/**
 * Remote command execution result
 */
export interface RemoteCommandResult {
  /** Exit code */
  exitCode: number
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
  /** Execution time in milliseconds */
  duration: number
  /** Signal that terminated the process */
  signal?: string
  command?: string
}

// ════════════════════════════════════════════════════════════════════════════
// REMOTE STATS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Remote connection statistics
 */
export interface RemoteStats {
  /** Total configured remotes */
  totalConfigured: number
  /** Currently connected */
  totalConnected: number
  /** Total remote sessions */
  totalSessions: number
  /** Connections by status */
  byStatus: Record<RemoteConnectionStatus, number>
  /** Total bandwidth (bytes/sec) */
  totalBandwidth: number
  /** Average latency (ms) */
  averageLatency: number
  /** Total data transferred (bytes) */
  totalDataTransferred: number
}
