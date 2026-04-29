/** SSH remote session factory (SSH_REMOTE feature). */

export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

export interface SSHSession {
  remoteCwd: string
  createManager: (opts: {
    onMessage?: (msg: unknown) => void
    [key: string]: unknown
  }) => {
    disconnect?: () => void
    [key: string]: unknown
  }
}

export async function createSSHSession(
  _args: {
    host: string
    cwd: string
    localVersion?: string
    permissionMode?: unknown
    dangerouslySkipPermissions?: boolean
    extraCliArgs?: string[]
    [key: string]: unknown
  },
  _options?: {
    onProgress?: (msg: string) => void
    [key: string]: unknown
  },
): Promise<SSHSession> {
  return {
    remoteCwd: _args.cwd,
    createManager: () => ({}),
  }
}

export function createLocalSSHSession(_args: {
  cwd: string
  permissionMode?: unknown
  dangerouslySkipPermissions?: boolean
  [key: string]: unknown
}): SSHSession {
  return {
    remoteCwd: _args.cwd,
    createManager: () => ({}),
  }
}
