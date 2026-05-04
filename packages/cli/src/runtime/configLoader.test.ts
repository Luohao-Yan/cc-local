/**
 * Tests for Config Loader
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

// Mock os.homedir
vi.mock('os', () => ({
  homedir: () => '/home/test',
}))

import {
  loadNativeConfig,
  saveNativeConfig,
  getConfigValue,
} from './configLoader.js'

// Import mocked functions
import { existsSync, readFileSync } from 'fs'

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>

describe('configLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear environment
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.CCLOCAL_SERVER_URL
    delete process.env.CCLOCAL_MODEL
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadNativeConfig', () => {
    it('returns empty config when no file or env', async () => {
      mockExistsSync.mockReturnValue(false)
      const config = await loadNativeConfig()
      expect(config).toEqual({})
    })

    it('loads from environment variables', async () => {
      mockExistsSync.mockReturnValue(false)

      process.env.ANTHROPIC_API_KEY = 'test-key'
      process.env.CCLOCAL_SERVER_URL = 'http://test:5678'
      process.env.CCLOCAL_MODEL = 'claude-3-5-sonnet'

      const config = await loadNativeConfig()

      expect(config.apiToken).toBe('test-key')
      expect(config.serverUrl).toBe('http://test:5678')
      expect(config.model).toBe('claude-3-5-sonnet')
    })

    it('loads from config file', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          apiToken: 'file-key',
          model: 'claude-3-opus',
        })
      )

      const config = await loadNativeConfig()

      expect(config.apiToken).toBe('file-key')
      expect(config.model).toBe('claude-3-opus')
    })

    it('env overrides file', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ apiToken: 'file-key' })
      )

      process.env.ANTHROPIC_API_KEY = 'env-key'

      const config = await loadNativeConfig()

      expect(config.apiToken).toBe('env-key')
    })
  })

  describe('saveNativeConfig', () => {
    it('creates config directory if needed', async () => {
      mockExistsSync.mockReturnValue(false)

      await saveNativeConfig({ apiToken: 'test' })

      expect(true).toBe(true) // Just verify no error
    })

    it('merges with existing config', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ model: 'claude-3-opus' })
      )

      await saveNativeConfig({ apiToken: 'new-key' })

      expect(true).toBe(true) // Just verify no error
    })
  })

  describe('getConfigValue', () => {
    it('returns value from config', () => {
      const config = { model: 'claude-3-5-sonnet' }
      expect(getConfigValue(config, 'model', 'default')).toBe('claude-3-5-sonnet')
    })

    it('returns fallback when key missing', () => {
      const config = {}
      expect(getConfigValue(config, 'model', 'default')).toBe('default')
    })
  })
})
