/**
 * Tests for the MCP bridge adapter
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MCPBridgeAdapter, type LegacyMCPClient } from './mcpBridgeAdapter.js'
import type { MCPManager, MCPServerRecord, MCPServerConfig } from '@cclocal/core/mcp'

/**
 * Create a minimal MCPManager mock for testing
 */
function createMockManager(): MCPManager {
  const servers = new Map<string, MCPServerRecord>()

  return {
    registerServer(registration) {
      const record: MCPServerRecord = {
        name: registration.name,
        config: registration.config,
        status: 'registered',
        tools: (registration.tools ?? []).map((t) => ({
          ...t,
          registeredName: `mcp__${registration.name}__${t.name}`,
        })),
        updatedAt: Date.now(),
      }
      servers.set(record.name, record)
      return record
    },
    listServers() {
      return Array.from(servers.values())
    },
    getServer(name: string) {
      return servers.get(name)
    },
    async connectServer(name: string) {
      const record = servers.get(name)
      if (!record) throw new Error(`MCP server "${name}" not found`)
      const updated: MCPServerRecord = { ...record, status: 'connected', updatedAt: Date.now() }
      servers.set(name, updated)
      return updated
    },
    async disconnectServer(name: string) {
      const record = servers.get(name)
      if (!record) throw new Error(`MCP server "${name}" not found`)
      const updated: MCPServerRecord = { ...record, status: 'disconnected', tools: [], updatedAt: Date.now() }
      servers.set(name, updated)
      return updated
    },
    async removeServer() { return true },
    setServerStatus(name, status, lastError) {
      const record = servers.get(name)
      if (!record) throw new Error(`MCP server "${name}" not found`)
      const updated: MCPServerRecord = { ...record, status, lastError, updatedAt: Date.now() }
      servers.set(name, updated)
      return updated
    },
    setServerTools(name, tools) {
      const record = servers.get(name)
      if (!record) throw new Error(`MCP server "${name}" not found`)
      const updated: MCPServerRecord = { ...record, tools, updatedAt: Date.now() }
      servers.set(name, updated)
      return updated
    },
    async callTool() { return { content: 'mock' } },
    async listResources() { return [] },
    async readResource() { return { content: 'mock' } },
    validateServerConfig() {},
  } as unknown as MCPManager
}

/**
 * Create a minimal store mock
 */
function createMockStore() {
  let state: any = { mcp: { clients: [], tools: [], resources: {}, commands: [], pluginReconnectKey: 0 } }

  return {
    getState: () => state,
    setState: (updater: (prev: any) => any) => {
      state = updater(state)
    },
  }
}

describe('MCPBridgeAdapter', () => {
  let mcpManager: MCPManager
  let store: ReturnType<typeof createMockStore>

  beforeEach(() => {
    mcpManager = createMockManager()
    store = createMockStore()
  })

  describe('connectAll', () => {
    it('connects all registered servers', async () => {
      mcpManager.registerServer({
        name: 'test-server',
        config: { type: 'stdio', command: 'test-cmd' },
        tools: [{ name: 'test-tool', description: 'A test tool' }],
      })

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      await adapter.connectAll()

      const server = mcpManager.getServer('test-server')
      expect(server?.status).toBe('connected')

      // Store should have been updated with client info
      const clients = store.getState().mcp.clients as LegacyMCPClient[]
      expect(clients.length).toBe(1)
      expect(clients[0].name).toBe('test-server')
      expect(clients[0].type).toBe('connected')
    })

    it('skips already connected servers', async () => {
      mcpManager.registerServer({
        name: 'already-connected',
        config: { type: 'stdio', command: 'test-cmd' },
      })
      await mcpManager.connectServer('already-connected')

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      await adapter.connectAll()

      const clients = store.getState().mcp.clients as LegacyMCPClient[]
      expect(clients.length).toBe(1)
      expect(clients[0].type).toBe('connected')
    })
  })

  describe('syncState', () => {
    it('maps connected servers to legacy connected clients', () => {
      mcpManager.registerServer({
        name: 'connected-srv',
        config: { type: 'sse', url: 'http://localhost:3001' },
        tools: [{ name: 'tool1', description: 'Tool 1' }],
      })
      mcpManager.setServerStatus('connected-srv', 'connected')

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      adapter.syncState()

      const clients = store.getState().mcp.clients as LegacyMCPClient[]
      expect(clients.length).toBe(1)
      expect(clients[0].type).toBe('connected')
    })

    it('maps failed servers to legacy failed clients with error', () => {
      mcpManager.registerServer({
        name: 'failed-srv',
        config: { type: 'http', url: 'http://bad-url' },
      })
      mcpManager.setServerStatus('failed-srv', 'failed', 'Connection refused')

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      adapter.syncState()

      const clients = store.getState().mcp.clients as LegacyMCPClient[]
      const failed = clients.find((c) => c.name === 'failed-srv')
      expect(failed).toBeDefined()
      expect(failed!.type).toBe('failed')
      expect(failed!.error).toBe('Connection refused')
    })

    it('maps disconnected servers to legacy disabled clients', () => {
      mcpManager.registerServer({
        name: 'disconnected-srv',
        config: { type: 'stdio', command: 'cmd' },
      })
      mcpManager.setServerStatus('disconnected-srv', 'disconnected')

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      adapter.syncState()

      const clients = store.getState().mcp.clients as LegacyMCPClient[]
      const disabled = clients.find((c) => c.name === 'disconnected-srv')
      expect(disabled).toBeDefined()
      expect(disabled!.type).toBe('disabled')
    })

    it('syncs MCP tools to store for legacy useMergedTools', () => {
      mcpManager.registerServer({
        name: 'tool-srv',
        config: { type: 'stdio', command: 'cmd' },
        tools: [
          { name: 'read_file', description: 'Read a file' },
          { name: 'write_file', description: 'Write a file' },
        ],
      })
      mcpManager.setServerStatus('tool-srv', 'connected')

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      adapter.syncState()

      const tools = store.getState().mcp.tools as any[]
      expect(tools.length).toBe(2)
      expect(tools[0].name).toContain('mcp__tool-srv__')
      expect(tools[1].name).toContain('mcp__tool-srv__')
    })

    it('does not include tools from non-connected servers', () => {
      mcpManager.registerServer({
        name: 'offline-srv',
        config: { type: 'stdio', command: 'cmd' },
        tools: [{ name: 'offline-tool', description: 'Offline tool' }],
      })
      // Server stays in 'registered' status

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      adapter.syncState()

      const tools = store.getState().mcp.tools as any[]
      expect(tools.length).toBe(0)
    })
  })

  describe('toggleServer', () => {
    it('disconnects a connected server', async () => {
      mcpManager.registerServer({
        name: 'toggle-srv',
        config: { type: 'stdio', command: 'cmd' },
      })
      await mcpManager.connectServer('toggle-srv')

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      await adapter.toggleServer('toggle-srv')

      const server = mcpManager.getServer('toggle-srv')
      expect(server?.status).toBe('disconnected')
    })

    it('connects a disconnected server', async () => {
      mcpManager.registerServer({
        name: 'toggle-srv',
        config: { type: 'stdio', command: 'cmd' },
      })

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      await adapter.toggleServer('toggle-srv')

      const server = mcpManager.getServer('toggle-srv')
      expect(server?.status).toBe('connected')
    })
  })

  describe('reconnectServer', () => {
    it('disconnects then reconnects a server', async () => {
      mcpManager.registerServer({
        name: 'reconnect-srv',
        config: { type: 'stdio', command: 'cmd' },
      })
      await mcpManager.connectServer('reconnect-srv')

      const adapter = new MCPBridgeAdapter({ mcpManager, store } as any)
      await adapter.reconnectServer('reconnect-srv')

      const server = mcpManager.getServer('reconnect-srv')
      expect(server?.status).toBe('connected')
    })
  })
})