/**
 * Remote Session Manager - CCLocal VS Code Extension
 * Manages SSH connections, remote sessions, and teleport operations
 */

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type {
  SSHConfig,
  RemoteSession,
  RemoteSessionCreateOptions,
  RemoteEventHandler,
  RemoteEvent,
  RemoteStats,
  TeleportOperation,
  FileTransferProgress,
  RemoteCommandResult,
  RemoteConnectionStatus,
} from './types.js'

// ════════════════════════════════════════════════════════════════════════════
// REMOTE SESSION MANAGER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Manages remote SSH connections and sessions
 */
export class RemoteSessionManager implements vscode.Disposable {
  private readonly context: vscode.ExtensionContext
  private readonly outputChannel: vscode.LogOutputChannel

  /** Configured SSH connections */
  private readonly configs: Map<string, SSHConfig> = new Map()

  /** Active remote sessions */
  private readonly sessions: Map<string, RemoteSession> = new Map()

  /** Event handlers */
  private readonly handlers: Set<RemoteEventHandler> = new Set()

  /** Connection attempts */
  private readonly reconnectAttempts: Map<string, number> = new Map()

  /** Disposed flag */
  private disposed = false

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.LogOutputChannel
  ) {
    this.context = context
    this.outputChannel = outputChannel
    this.loadConfigurations()
  }

  // ─── Configuration Management ─────────────────────────────────────────────

  /**
   * Load saved SSH configurations
   */
  private loadConfigurations(): void {
    const saved = this.context.globalState.get<SSHConfig[]>('cclocal.sshConfigs', [])
    for (const config of saved) {
      this.configs.set(config.id, config)
    }
    this.outputChannel.debug(`Loaded ${saved.length} SSH configurations`)
  }

  /**
   * Save SSH configurations to global state
   */
  private async saveConfigurations(): Promise<void> {
    const configs = Array.from(this.configs.values())
    await this.context.globalState.update('cclocal.sshConfigs', configs)
  }

  /**
   * Add a new SSH configuration
   */
  async addConfiguration(config: SSHConfig): Promise<void> {
    this.configs.set(config.id, config)
    await this.saveConfigurations()
    this.outputChannel.info(`Added SSH configuration: ${config.name}`)
  }

  /**
   * Update an existing SSH configuration
   */
  async updateConfiguration(config: SSHConfig): Promise<void> {
    this.configs.set(config.id, config)
    await this.saveConfigurations()
    this.outputChannel.info(`Updated SSH configuration: ${config.name}`)
  }

  /**
   * Remove an SSH configuration
   */
  async removeConfiguration(id: string): Promise<void> {
    const config = this.configs.get(id)
    if (config) {
      // Disconnect if connected
      const session = this.getSessionByConfig(id)
      if (session) {
        await this.disconnect(session.id)
      }
      this.configs.delete(id)
      await this.saveConfigurations()
      this.outputChannel.info(`Removed SSH configuration: ${config.name}`)
    }
  }

  /**
   * Get all SSH configurations
   */
  getConfigurations(): SSHConfig[] {
    return Array.from(this.configs.values())
  }

  /**
   * Get a specific SSH configuration
   */
  getConfiguration(id: string): SSHConfig | undefined {
    return this.configs.get(id)
  }

  // ─── Connection Management ────────────────────────────────────────────────

  /**
   * Connect to a remote host
   */
  async connect(options: RemoteSessionCreateOptions): Promise<RemoteSession> {
    const { config, workingDirectory, environment, autoReconnect = true, maxReconnectAttempts = 3 } = options

    // Check if already connected
    const existing = this.getSessionByConfig(config.id)
    if (existing && existing.status === 'connected') {
      this.outputChannel.debug(`Already connected to ${config.name}`)
      return existing
    }

    const sessionId = crypto.randomUUID()
    const session: RemoteSession = {
      id: sessionId,
      configId: config.id,
      name: config.name,
      status: 'connecting',
      workingDirectory: workingDirectory || config.workingDirectory || '~',
      sessionCount: 0,
    }

    this.sessions.set(sessionId, session)
    this.emitEvent({ type: 'connecting', remoteId: sessionId, timestamp: Date.now() })

    try {
      // Simulate connection (in real implementation, use SSH client)
      await this.establishConnection(config, session)

      session.status = 'connected'
      session.connectedAt = Date.now()
      session.lastActivity = Date.now()

      // Detect remote platform and shell
      session.platform = await this.detectPlatform(sessionId)
      session.shell = await this.detectShell(sessionId)

      this.reconnectAttempts.set(sessionId, 0)

      this.emitEvent({ type: 'connected', remoteId: sessionId, timestamp: Date.now() })
      this.outputChannel.info(`Connected to ${config.name} (${sessionId})`)

      return session
    } catch (error) {
      session.status = 'error'
      session.error = error instanceof Error ? error.message : String(error)

      this.emitEvent({ type: 'error', remoteId: sessionId, data: error, timestamp: Date.now() })
      this.outputChannel.error(`Failed to connect to ${config.name}: ${error}`)

      // Attempt reconnection if enabled
      if (autoReconnect) {
        const attempts = this.reconnectAttempts.get(sessionId) || 0
        if (attempts < maxReconnectAttempts) {
          this.reconnectAttempts.set(sessionId, attempts + 1)
          this.emitEvent({ type: 'reconnecting', remoteId: sessionId, timestamp: Date.now() })
          // Wait before reconnecting
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempts + 1)))
          return this.connect(options)
        }
      }

      throw error
    }
  }

  /**
   * Disconnect from a remote host
   */
  async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    this.outputChannel.debug(`Disconnecting from ${session.name}...`)

    try {
      // Close connection (in real implementation, close SSH client)
      await this.closeConnection(sessionId)

      session.status = 'disconnected'
      this.emitEvent({ type: 'disconnected', remoteId: sessionId, timestamp: Date.now() })
      this.outputChannel.info(`Disconnected from ${session.name}`)
    } catch (error) {
      this.outputChannel.error(`Error disconnecting from ${session.name}: ${error}`)
      throw error
    }
  }

  /**
   * Disconnect all active sessions
   */
  async disconnectAll(): Promise<void> {
    const connected = Array.from(this.sessions.values())
      .filter(s => s.status === 'connected')

    await Promise.all(connected.map(s => this.disconnect(s.id)))
  }

  // ─── Session Management ───────────────────────────────────────────────────

  /**
   * Get all remote sessions
   */
  getSessions(): RemoteSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get a specific session
   */
  getSession(id: string): RemoteSession | undefined {
    return this.sessions.get(id)
  }

  /**
   * Get session by config ID
   */
  private getSessionByConfig(configId: string): RemoteSession | undefined {
    return Array.from(this.sessions.values()).find(s => s.configId === configId)
  }

  /**
   * Get connected sessions
   */
  getConnectedSessions(): RemoteSession[] {
    return this.getSessions().filter(s => s.status === 'connected')
  }

  // ─── Teleport Operations ──────────────────────────────────────────────────

  /**
   * Teleport a session to a remote host
   * This transfers the session state and messages to the remote
   */
  async teleport(sessionId: string, remoteId: string): Promise<TeleportOperation> {
    const operation: TeleportOperation = {
      sourceSessionId: sessionId,
      targetRemoteId: remoteId,
      status: 'pending',
      timestamp: Date.now(),
    }

    const session = this.sessions.get(remoteId)
    if (!session || session.status !== 'connected') {
      operation.status = 'failed'
      operation.error = 'Remote session not connected'
      return operation
    }

    try {
      operation.status = 'in_progress'
      this.emitEvent({ type: 'teleport_started', sessionId, remoteId, data: operation, timestamp: Date.now() })

      // Simulate teleport operation (in real implementation, transfer session data)
      await this.performTeleport(sessionId, remoteId)

      operation.status = 'completed'
      operation.progress = 100

      session.sessionCount++
      session.lastActivity = Date.now()

      this.emitEvent({ type: 'teleport_completed', sessionId, remoteId, data: operation, timestamp: Date.now() })
      this.outputChannel.info(`Teleported session ${sessionId} to ${session.name}`)

      return operation
    } catch (error) {
      operation.status = 'failed'
      operation.error = error instanceof Error ? error.message : String(error)
      this.outputChannel.error(`Teleport failed: ${error}`)
      throw error
    }
  }

  /**
   * Perform the actual teleport operation.
   *
   * 1:1 match with official extension's teleport logic:
   * 1. Read local session data (messages, tool results, etc.)
   * 2. Serialize session state
   * 3. Send to remote via SSH command execution
   * 4. Remote imports session and continues conversation
   * 5. Track branch for potential return
   */
  private async performTeleport(sessionId: string, remoteId: string): Promise<void> {
    const session = this.sessions.get(remoteId)
    if (!session || session.status !== 'connected') {
      throw new Error('Remote session not connected')
    }

    // 1. Locate local session data
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const sessionDir = path.join(homeDir, '.claude', 'projects')

    // 2. Read the session file
    const sessionFile = path.join(sessionDir, sessionId + '.json')
    let sessionData: string

    try {
      sessionData = await fs.promises.readFile(sessionFile, 'utf-8')
    } catch {
      // Session file may not exist in the standard location — try CLI session store
      this.outputChannel.warn(`[Teleport] Session file not found at ${sessionFile}, using empty state`)
      sessionData = JSON.stringify({ sessionId, messages: [], toolResults: [] })
    }

    // 3. Transfer session data to remote via SSH
    // Encode session data as base64 to avoid shell escaping issues
    const encodedData = Buffer.from(sessionData).toString('base64')

    // Build the remote command to import the session
    const remoteCommand = `cclocal --import-session '${encodedData}'`

    // Execute on remote via the existing connection
    const result = await this.executeRemoteCommand(
      remoteId,
      remoteCommand,
      session.workingDirectory,
    )

    if (result.exitCode !== 0) {
      throw new Error(`Remote import failed: ${result.stderr || 'Unknown error'}`)
    }

    // 4. Track the teleported branch for potential return
    const branchName = `teleport-${sessionId}-${Date.now()}`
    try {
      await this.executeRemoteCommand(
        remoteId,
        `git checkout -b ${branchName} 2>/dev/null || git checkout ${branchName}`,
        session.workingDirectory,
      )
    } catch {
      // Branch creation is optional — the remote may not be a git repo
      this.outputChannel.debug('[Teleport] Branch creation skipped (not a git repo)')
    }

    this.outputChannel.info(`[Teleport] Session ${sessionId} teleported to remote ${remoteId} on branch ${branchName}`)
  }

  /**
   * Execute a command on a remote session via SSH
   */
  private async executeRemoteCommand(
    remoteId: string,
    command: string,
    cwd?: string,
  ): Promise<RemoteCommandResult> {
    const session = this.sessions.get(remoteId)
    if (!session || session.status !== 'connected') {
      return { exitCode: 1, stdout: '', stderr: 'Not connected', command }
    }

    const config = this.configs.get(session.configId)
    if (!config) {
      return { exitCode: 1, stdout: '', stderr: 'SSH config not found', command }
    }

    // Use child_process to execute SSH command
    const { exec } = await import('child_process')
    const sshArgs = [
      '-p', String(config.port),
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
    ]
    if (config.privateKey) {
      sshArgs.push('-i', config.privateKey)
    }
    if (config.agentForwarding) {
      sshArgs.push('-o', 'ForwardAgent=yes')
    }

    const sshCommand = `ssh ${sshArgs.join(' ')} ${config.user}@${config.host} ${cwd ? `cd ${cwd} && ` : ''}${command}`

    return new Promise((resolve) => {
      exec(sshCommand, { timeout: 30000 }, (error, stdout, stderr) => {
        resolve({
          exitCode: error ? 1 : 0,
          stdout: stdout?.toString() ?? '',
          stderr: stderr?.toString() ?? '',
          command,
        })
      })
    })
  }

  /**
   * Update the skipped branch status for a teleported session.
   * Called when the user chooses to skip updating a branch after teleport.
   */
  async updateSkippedBranch(remoteId: string, branch: string, skipped: boolean): Promise<void> {
    const session = this.sessions.get(remoteId)
    if (!session) return

    // Track skipped branches in the session metadata
    if (!(session as any).skippedBranches) {
      ;(session as any).skippedBranches = new Map<string, boolean>()
    }
    ;(session as any).skippedBranches.set(branch, skipped)

    this.outputChannel.debug(`[Teleport] Branch ${branch} skipped=${skipped} on remote ${remoteId}`)
    this.emitEvent({
      type: 'teleport_branch_updated',
      sessionId: remoteId,
      remoteId,
      data: { branch, skipped },
      timestamp: Date.now(),
    })
  }

  // ─── File Operations ──────────────────────────────────────────────────────

  /**
   * Transfer a file to/from remote
   */
  async transferFile(
    sessionId: string,
    sourcePath: string,
    destinationPath: string,
    direction: 'upload' | 'download',
    onProgress?: (progress: FileTransferProgress) => void
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'connected') {
      throw new Error('Remote session not connected')
    }

    const transferId = crypto.randomUUID()
    const progress: FileTransferProgress = {
      transferId,
      sourcePath,
      destinationPath,
      totalBytes: 0,
      transferredBytes: 0,
      rate: 0,
      status: 'pending',
    }

    this.emitEvent({ type: 'file_transfer_started', remoteId: sessionId, data: progress, timestamp: Date.now() })

    try {
      progress.status = 'transferring'

      // Simulate file transfer (in real implementation, use SFTP/SCP)
      const totalBytes = 1024 * 1024 // 1MB simulated
      progress.totalBytes = totalBytes

      for (let i = 0; i <= 100; i += 10) {
        progress.transferredBytes = (totalBytes * i) / 100
        progress.rate = 512 * 1024 // 512KB/s
        onProgress?.(progress)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      progress.status = 'completed'
      progress.transferredBytes = totalBytes

      this.emitEvent({ type: 'file_transfer_completed', remoteId: sessionId, data: progress, timestamp: Date.now() })
      this.outputChannel.debug(`File transfer completed: ${sourcePath} -> ${destinationPath}`)
    } catch (error) {
      progress.status = 'failed'
      progress.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  // ─── Command Execution ────────────────────────────────────────────────────

  /**
   * Execute a command on the remote host
   */
  async executeCommand(sessionId: string, command: string, cwd?: string): Promise<RemoteCommandResult> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'connected') {
      throw new Error('Remote session not connected')
    }

    const startTime = Date.now()

    try {
      // Simulate command execution (in real implementation, use SSH exec)
      const result = await this.runRemoteCommand(sessionId, command, cwd)

      session.lastActivity = Date.now()

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
        signal: result.signal,
      }
    } catch (error) {
      throw new Error(`Command execution failed: ${error}`)
    }
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  /**
   * Get remote connection statistics
   */
  getStats(): RemoteStats {
    const sessions = this.getSessions()
    const connected = sessions.filter(s => s.status === 'connected')

    const byStatus: Record<RemoteConnectionStatus, number> = {
      disconnected: 0,
      connecting: 0,
      connected: 0,
      error: 0,
      reconnecting: 0,
    }

    for (const session of sessions) {
      byStatus[session.status]++
    }

    const totalLatency = connected.reduce((sum, s) => sum + (s.latency || 0), 0)
    const totalBandwidth = connected.reduce((sum, s) => sum + (s.bandwidth || 0), 0)

    return {
      totalConfigured: this.configs.size,
      totalConnected: connected.length,
      totalSessions: sessions.reduce((sum, s) => sum + s.sessionCount, 0),
      byStatus,
      totalBandwidth,
      averageLatency: connected.length > 0 ? totalLatency / connected.length : 0,
      totalDataTransferred: 0, // Would track actual data transferred
    }
  }

  // ─── Event Handling ───────────────────────────────────────────────────────

  /**
   * Subscribe to remote events
   */
  subscribe(handler: RemoteEventHandler): vscode.Disposable {
    this.handlers.add(handler)
    return {
      dispose: () => this.handlers.delete(handler),
    }
  }

  /**
   * Emit an event to all handlers
   */
  private emitEvent(event: RemoteEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event)
      } catch (error) {
        this.outputChannel.error(`Event handler error: ${error}`)
      }
    }
  }

  // ─── Private Implementation ──────────────────────────────────────────────

  /**
   * Establish SSH connection
   */
  private async establishConnection(config: SSHConfig, session: RemoteSession): Promise<void> {
    // In real implementation, use node-ssh or similar
    // For now, simulate connection
    await new Promise(resolve => setTimeout(resolve, 500))

    // Simulate latency measurement
    session.latency = Math.floor(Math.random() * 100) + 20
    session.bandwidth = Math.floor(Math.random() * 1024 * 1024) + 512 * 1024
  }

  /**
   * Close SSH connection
   */
  private async closeConnection(sessionId: string): Promise<void> {
    // In real implementation, close SSH client
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * Detect remote platform
   */
  private async detectPlatform(sessionId: string): Promise<'linux' | 'darwin' | 'windows'> {
    // In real implementation, run 'uname -a' or similar
    return 'linux'
  }

  /**
   * Detect remote shell
   */
  private async detectShell(sessionId: string): Promise<'bash' | 'zsh' | 'fish' | 'sh' | 'powershell' | 'cmd'> {
    // In real implementation, check $SHELL
    return 'bash'
  }

  /**
   * Run a remote command
   */
  private async runRemoteCommand(
    sessionId: string,
    command: string,
    cwd?: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string; signal?: string }> {
    // In real implementation, use SSH exec
    await new Promise(resolve => setTimeout(resolve, 100))
    return {
      exitCode: 0,
      stdout: `Executed: ${command}`,
      stderr: '',
    }
  }

  // ─── VS Code Remote Integration ───────────────────────────────────────────

  /**
   * Check if VS Code is running in a remote environment
   */
  static isVSCodeRemote(): boolean {
    return vscode.env.remoteName !== undefined
  }

  /**
   * Get current VS Code remote authority
   */
  static getVSCodeRemoteAuthority(): string | undefined {
    return vscode.env.remoteName
  }

  /**
   * Check if running in SSH remote
   */
  static isSSHRemote(): boolean {
    return vscode.env.remoteName === 'ssh-remote'
  }

  /**
   * Check if running in Dev Container
   */
  static isDevContainer(): boolean {
    return vscode.env.remoteName === 'dev-container'
  }

  /**
   * Check if running in WSL
   */
  static isWSL(): boolean {
    return vscode.env.remoteName === 'wsl'
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    // Disconnect all sessions
    void this.disconnectAll()

    // Clear handlers
    this.handlers.clear()

    // Clear sessions
    this.sessions.clear()

    this.outputChannel.debug('RemoteSessionManager disposed')
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

let instance: RemoteSessionManager | undefined

export function getRemoteSessionManager(
  context: vscode.ExtensionContext,
  outputChannel: vscode.LogOutputChannel
): RemoteSessionManager {
  if (!instance) {
    instance = new RemoteSessionManager(context, outputChannel)
  }
  return instance
}

export function disposeRemoteSessionManager(): void {
  instance?.dispose()
  instance = undefined
}
