/**
 * Tests for SSH Manager
 */

import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest'
import { SSHManager } from './SSHManager.js'
import { spawn } from 'child_process'

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

describe('SSHManager', () => {
  let manager: SSHManager

  const createMockProcess = (options: {
    stdout?: string
    stderr?: string
    exitCode?: number
    delay?: number
  } = {}) => {
    const { stdout = '', stderr = '', exitCode = 0, delay = 10 } = options

    let killed = false

    return {
      stdout: {
        on: vi.fn((event: string, callback: (data: Buffer) => void) => {
          if (event === 'data' && stdout) {
            setTimeout(() => callback(Buffer.from(stdout)), delay)
          }
        }),
      },
      stderr: {
        on: vi.fn((event: string, callback: (data: Buffer) => void) => {
          if (event === 'data' && stderr) {
            setTimeout(() => callback(Buffer.from(stderr)), delay)
          }
        }),
      },
      on: vi.fn((event: string, callback: (code: number | null, signal: string | null) => void) => {
        if (event === 'close') {
          setTimeout(() => {
            if (!killed) callback(exitCode, null)
          }, delay)
        }
        if (event === 'error') {
          // No error by default
        }
      }),
      kill: vi.fn(() => {
        killed = true
      }),
    }
  }

  beforeEach(() => {
    manager = new SSHManager()
    vi.clearAllMocks()

    // Default mock for successful connections
    ;(spawn as Mock).mockImplementation((cmd: string, args: string[]) => {
      return createMockProcess({ stdout: 'connected\n' })
    })
  })

  afterEach(async () => {
    await manager.disconnectAll()
  })

  describe('connect', () => {
    it('creates a new SSH session', async () => {
      const config = {
        host: 'example.com',
        username: 'testuser',
        port: 22,
      }

      const session = await manager.connect(config)

      expect(session.id).toBeDefined()
      expect(session.config).toEqual(config)
      expect(session.status).toBe('connected')
      expect(session.createdAt).toBeLessThanOrEqual(Date.now())
    })

    it('rejects invalid connection', async () => {
      const config = {
        host: 'invalid-host-that-does-not-exist.test',
        username: 'testuser',
        timeout: 1000,
      }

      // Mock spawn to simulate failure
      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stderr: 'Connection refused',
        exitCode: 255,
      }))

      await expect(manager.connect(config)).rejects.toThrow()
    })
  })

  describe('disconnect', () => {
    it('disconnects an existing session', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      await manager.disconnect(session.id)

      const retrieved = manager.getSession(session.id)
      expect(retrieved).toBeUndefined()
    })

    it('handles disconnecting non-existent session', async () => {
      // Should not throw
      await manager.disconnect('non-existent')
    })
  })

  describe('execute', () => {
    it('executes command on remote host', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      // Mock for execute call
      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stdout: '/home/test\n',
        exitCode: 0,
      }))

      const result = await manager.execute(session.id, 'pwd')

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('/home/test')
    })

    it('rejects execution on disconnected session', async () => {
      await expect(
        manager.execute('non-existent', 'echo hello')
      ).rejects.toThrow('SSH session not connected')
    })

    it('supports cwd option', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stdout: '/home/test\n',
        exitCode: 0,
      }))

      await manager.execute(session.id, 'pwd', { cwd: '/home/test' })

      // Verify spawn was called with cd command
      const lastCall = (spawn as Mock).mock.calls.at(-1)
      expect(lastCall).toBeDefined()
      const args = lastCall[1] as string[]
      expect(args.some(a => a.includes('cd /home/test'))).toBe(true)
    })

    it('supports env option', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stdout: 'test_value\n',
        exitCode: 0,
      }))

      await manager.execute(session.id, 'echo $MY_VAR', {
        env: { MY_VAR: 'test_value' },
      })

      // Verify spawn was called with env
      const lastCall = (spawn as Mock).mock.calls.at(-1)
      expect(lastCall).toBeDefined()
      const opts = lastCall[2] as { env?: Record<string, string> }
      expect(opts?.env?.MY_VAR).toBe('test_value')
    })

    it('handles timeout', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      // Mock spawn that never completes
      const mockProc = createMockProcess({ delay: 10000 })
      ;(spawn as Mock).mockReturnValueOnce(mockProc)

      await expect(
        manager.execute(session.id, 'sleep 100', { timeout: 50 })
      ).rejects.toThrow('timeout')

      expect(mockProc.kill).toHaveBeenCalled()
    })
  })

  describe('file transfer', () => {
    it('uploads file to remote host', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stdout: '',
        exitCode: 0,
      }))

      await manager.uploadFile(session.id, '/local/file.txt', '/remote/file.txt')
    })

    it('downloads file from remote host', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stdout: '',
        exitCode: 0,
      }))

      await manager.downloadFile(session.id, '/remote/file.txt', '/local/file.txt')
    })

    it('rejects transfer on disconnected session', async () => {
      await expect(
        manager.uploadFile('non-existent', '/local', '/remote')
      ).rejects.toThrow('SSH session not connected')

      await expect(
        manager.downloadFile('non-existent', '/remote', '/local')
      ).rejects.toThrow('SSH session not connected')
    })
  })

  describe('tunnel', () => {
    it('creates port forwarding tunnel', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      // Mock for tunnel process
      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stdout: '',
        stderr: '',
        exitCode: 0,
        delay: 100,
      }))

      const { tunnelId } = await manager.createTunnel(session.id, 8080, 80)

      expect(tunnelId).toContain(session.id)
      expect(tunnelId).toContain('8080')
      expect(tunnelId).toContain('80')
    })

    it('cleans up tunnels on disconnect', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({
        stdout: '',
        delay: 100,
      }))

      await manager.createTunnel(session.id, 8080, 80)
      await manager.disconnect(session.id)

      // Verify no sessions left
      expect(manager.listSessions()).toHaveLength(0)
    })
  })

  describe('session management', () => {
    it('lists all sessions', async () => {
      const s1 = await manager.connect({ host: 'host1.com', username: 'user' })
      const s2 = await manager.connect({ host: 'host2.com', username: 'user' })

      const sessions = manager.listSessions()

      expect(sessions).toHaveLength(2)
      expect(sessions.map(s => s.id)).toContain(s1.id)
      expect(sessions.map(s => s.id)).toContain(s2.id)
    })

    it('gets session by id', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      const retrieved = manager.getSession(session.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(session.id)
    })

    it('returns undefined for non-existent session', () => {
      const session = manager.getSession('non-existent')
      expect(session).toBeUndefined()
    })

    it('disconnects all sessions', async () => {
      await manager.connect({ host: 'host1.com', username: 'user' })
      await manager.connect({ host: 'host2.com', username: 'user' })

      await manager.disconnectAll()

      expect(manager.listSessions()).toHaveLength(0)
    })
  })

  describe('buildSSHArgs', () => {
    it('includes port when specified', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
        port: 2222,
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({ stdout: 'test\n' }))

      await manager.execute(session.id, 'echo test')

      const lastCall = (spawn as Mock).mock.calls.at(-1)
      const args = lastCall[1] as string[]
      expect(args).toContain('-p')
      expect(args).toContain('2222')
    })

    it('includes private key when specified', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
        privateKey: '/path/to/key',
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({ stdout: 'test\n' }))

      await manager.execute(session.id, 'echo test')

      const lastCall = (spawn as Mock).mock.calls.at(-1)
      const args = lastCall[1] as string[]
      expect(args).toContain('-i')
      expect(args).toContain('/path/to/key')
    })

    it('disables strict host checking', async () => {
      const session = await manager.connect({
        host: 'example.com',
        username: 'testuser',
      })

      ;(spawn as Mock).mockReturnValueOnce(createMockProcess({ stdout: 'test\n' }))

      await manager.execute(session.id, 'echo test')

      const lastCall = (spawn as Mock).mock.calls.at(-1)
      const args = lastCall[1] as string[]
      expect(args).toContain('StrictHostKeyChecking=no')
    })
  })
})
