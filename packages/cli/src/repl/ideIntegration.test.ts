/**
 * Tests for IDE integration in native REPL
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the heavy dependencies before importing
vi.mock('../utils/ide.js', () => ({
  findAvailableIDE: vi.fn(),
  initializeIdeIntegration: vi.fn(),
  isSupportedTerminal: vi.fn(() => false),
}))

vi.mock('../utils/config.js', () => ({
  getGlobalConfig: vi.fn(() => ({})),
}))

vi.mock('../utils/envUtils.js', () => ({
  isEnvDefinedFalsy: vi.fn(() => false),
  isEnvTruthy: vi.fn(() => false),
}))

describe('IDE integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset env
    delete process.env.CLAUDE_CODE_SSE_PORT
    delete process.env.CLAUDE_CODE_AUTO_CONNECT_IDE
  })

  describe('detectAndConnectIDE', () => {
    it('returns null when auto-connect is disabled', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { getGlobalConfig } = await import('../utils/config.js')
      const { isSupportedTerminal } = await import('../utils/ide.js')

      vi.mocked(getGlobalConfig).mockReturnValue({})
      vi.mocked(isSupportedTerminal).mockReturnValue(false)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn(),
      }

      const result = await detectAndConnectIDE(false, mockManager as any)
      expect(result.ide).toBeNull()
      expect(result.mcpConfig).toBeNull()
      expect(result.metadataString).toBe('')
      expect(mockManager.registerServer).not.toHaveBeenCalled()
    })

    it('registers IDE MCP when ideFlag is true and IDE is found', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { findAvailableIDE } = await import('../utils/ide.js')

      const mockIde = {
        name: 'VS Code',
        port: 12345,
        workspaceFolders: ['/home/user/project'],
        url: 'ws://127.0.0.1:12345',
        isValid: true,
        authToken: 'test-token',
        ideRunningInWindows: false,
      }

      vi.mocked(findAvailableIDE).mockResolvedValue(mockIde as any)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn().mockResolvedValue({ status: 'connected' }),
        getServer: vi.fn().mockReturnValue(undefined),
      }

      const result = await detectAndConnectIDE(true, mockManager as any)

      expect(result.ide).toBe(mockIde)
      expect(result.mcpConfig).not.toBeNull()
      expect(result.mcpConfig!.type).toBe('ws')
      expect(result.mcpConfig!.url).toBe('ws://127.0.0.1:12345')
      expect(result.mcpConfig!.authToken).toBe('test-token')
      expect(result.metadataString).toContain('VS Code')
      expect(result.metadataString).toContain('/home/user/project')
      expect(mockManager.registerServer).toHaveBeenCalledWith({
        name: 'ide',
        config: expect.objectContaining({ type: 'ws' }),
      })
    })

    it('returns SSE config when IDE URL uses http', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { findAvailableIDE } = await import('../utils/ide.js')

      const mockIde = {
        name: 'Cursor',
        port: 54321,
        workspaceFolders: ['/home/user/other'],
        url: 'http://127.0.0.1:54321/sse',
        isValid: true,
        authToken: undefined,
        ideRunningInWindows: false,
      }

      vi.mocked(findAvailableIDE).mockResolvedValue(mockIde as any)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn().mockResolvedValue({ status: 'connected' }),
        getServer: vi.fn().mockReturnValue(undefined),
      }

      const result = await detectAndConnectIDE(true, mockManager as any)

      expect(result.mcpConfig!.type).toBe('sse')
      expect(result.mcpConfig!.url).toBe('http://127.0.0.1:54321/sse')
    })

    it('skips registration if IDE server already exists', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { findAvailableIDE } = await import('../utils/ide.js')

      const mockIde = {
        name: 'VS Code',
        port: 12345,
        workspaceFolders: ['/project'],
        url: 'ws://127.0.0.1:12345',
        isValid: true,
        ideRunningInWindows: false,
      }

      vi.mocked(findAvailableIDE).mockResolvedValue(mockIde as any)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn().mockReturnValue({ name: 'ide', status: 'connected' }),
      }

      const result = await detectAndConnectIDE(true, mockManager as any)

      expect(mockManager.registerServer).not.toHaveBeenCalled()
      expect(result.metadataString).toContain('VS Code')
    })

    it('handles connection failure gracefully', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { findAvailableIDE } = await import('../utils/ide.js')

      const mockIde = {
        name: 'Windsurf',
        port: 9999,
        workspaceFolders: ['/project'],
        url: 'ws://127.0.0.1:9999',
        isValid: true,
        ideRunningInWindows: false,
      }

      vi.mocked(findAvailableIDE).mockResolvedValue(mockIde as any)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn().mockRejectedValue(new Error('Connection refused')),
        getServer: vi.fn().mockReturnValue(undefined),
      }

      // Should not throw
      const result = await detectAndConnectIDE(true, mockManager as any)
      expect(result.ide).toBe(mockIde)
      expect(result.metadataString).toContain('Windsurf')
    })

    it('returns null when no IDE is found', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { findAvailableIDE } = await import('../utils/ide.js')

      vi.mocked(findAvailableIDE).mockResolvedValue(null)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn(),
      }

      const result = await detectAndConnectIDE(true, mockManager as any)

      expect(result.ide).toBeNull()
      expect(result.mcpConfig).toBeNull()
      expect(result.metadataString).toBe('')
    })

    it('enables auto-connect when supported terminal is detected', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { findAvailableIDE, isSupportedTerminal } = await import('../utils/ide.js')

      vi.mocked(isSupportedTerminal).mockReturnValue(true)
      vi.mocked(findAvailableIDE).mockResolvedValue(null)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn(),
      }

      // Even with ideFlag=false, auto-connect should trigger via supported terminal
      await detectAndConnectIDE(false, mockManager as any)

      // findAvailableIDE should have been called since auto-connect was enabled
      expect(findAvailableIDE).toHaveBeenCalled()
    })
  })

  describe('IDE metadata formatting', () => {
    it('includes workspace folders in metadata', async () => {
      const { detectAndConnectIDE } = await import('./ideIntegration.js')
      const { findAvailableIDE } = await import('../utils/ide.js')

      const mockIde = {
        name: 'IntelliJ IDEA',
        port: 8080,
        workspaceFolders: ['/project/a', '/project/b'],
        url: 'ws://127.0.0.1:8080',
        isValid: true,
        ideRunningInWindows: false,
      }

      vi.mocked(findAvailableIDE).mockResolvedValue(mockIde as any)

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn().mockResolvedValue({ status: 'connected' }),
        getServer: vi.fn().mockReturnValue(undefined),
      }

      const result = await detectAndConnectIDE(true, mockManager as any)

      expect(result.metadataString).toContain('IntelliJ IDEA')
      expect(result.metadataString).toContain('/project/a')
      expect(result.metadataString).toContain('/project/b')
    })
  })
})
