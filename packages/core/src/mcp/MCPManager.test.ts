import { describe, expect, it } from 'vitest'
import { MCPManager } from './MCPManager.js'

describe('MCPManager', () => {
  it('registers, updates, and removes MCP servers', async () => {
    const manager = new MCPManager({ now: () => 100 })

    const record = manager.registerServer({
      name: 'filesystem',
      config: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
      },
    })

    expect(record.status).toBe('registered')
    expect(manager.listServers()).toHaveLength(1)

    const connected = manager.setServerStatus('filesystem', 'connected')
    expect(connected.status).toBe('connected')

    const withTools = manager.setServerTools('filesystem', [{
      name: 'read_file',
      description: 'Read a file from disk',
    }])
    expect(withTools.tools).toHaveLength(1)

    expect(await manager.removeServer('filesystem')).toBe(true)
    expect(manager.listServers()).toHaveLength(0)
  })

  it('validates stdio config and syncs connected tools into the registry', async () => {
    const registered = new Map<string, unknown>()
    const manager = new MCPManager({
      toolRegistry: {
        register(tool) {
          registered.set(tool.name, tool)
        },
        unregister(name) {
          registered.delete(name)
        },
        has(name) {
          return registered.has(name)
        },
      },
      syncToolsToRegistry: true,
      connectionFactory: async () => ({
        async listTools() {
          return [{
            name: 'read_file',
            description: 'Read a file from disk',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
              },
            },
          }]
        },
        async callTool(name) {
          return {
            content: `called:${name}`,
          }
        },
        async close() {},
      }),
    })

    manager.registerServer({
      name: 'filesystem',
      config: {
        type: 'stdio',
        command: 'npx',
      },
    })

    const connected = await manager.connectServer('filesystem')
    expect(connected.status).toBe('connected')
    expect(registered.has('mcp__filesystem__read_file')).toBe(true)

    const result = await manager.callTool('filesystem', 'read_file', { path: '/tmp/demo' })
    expect(result).toEqual({ content: 'called:read_file' })

    const disconnected = await manager.disconnectServer('filesystem')
    expect(disconnected.status).toBe('disconnected')
    expect(registered.has('mcp__filesystem__read_file')).toBe(false)
  })

  it('rejects invalid stdio config and marks connection failures', async () => {
    const manager = new MCPManager({
      connectionFactory: async () => {
        throw new Error('spawn failed')
      },
    })

    expect(() => manager.registerServer({
      name: 'broken',
      config: {
        type: 'stdio',
        command: '',
      },
    })).toThrow('stdio MCP server requires a non-empty command')

    manager.registerServer({
      name: 'failing',
      config: {
        type: 'stdio',
        command: 'npx',
      },
    })

    const failed = await manager.connectServer('failing')
    expect(failed.status).toBe('failed')
    expect(failed.lastError).toBe('spawn failed')
  })

  it('applies namespace and tool policy when syncing tools', async () => {
    const registered = new Map<string, unknown>()
    const manager = new MCPManager({
      toolRegistry: {
        register(tool) {
          registered.set(tool.name, tool)
        },
        unregister(name) {
          registered.delete(name)
        },
        has(name) {
          return registered.has(name)
        },
      },
      syncToolsToRegistry: true,
      connectionFactory: async () => ({
        async listTools() {
          return [
            { name: 'read_file', description: 'Read file' },
            { name: 'delete_file', description: 'Delete file' },
          ]
        },
        async callTool(name) {
          return { content: `called:${name}` }
        },
        async close() {},
      }),
    })

    manager.registerServer({
      name: 'filesystem',
      config: {
        type: 'stdio',
        command: 'npx',
        namespace: 'local_fs',
        allowedTools: ['read_file'],
      },
    })

    const connected = await manager.connectServer('filesystem')
    expect(connected.tools.map((tool) => tool.name)).toEqual(['read_file'])
    expect(connected.tools[0]?.registeredName).toBe('mcp__local_fs__read_file')
    expect(registered.has('mcp__local_fs__read_file')).toBe(true)
    expect(registered.has('mcp__local_fs__delete_file')).toBe(false)

    await manager.disconnectServer('filesystem')
  })

  it('supports sse config validation and disables sync when requested', async () => {
    const registered = new Map<string, unknown>()
    const manager = new MCPManager({
      toolRegistry: {
        register(tool) {
          registered.set(tool.name, tool)
        },
        unregister(name) {
          registered.delete(name)
        },
        has(name) {
          return registered.has(name)
        },
      },
      syncToolsToRegistry: true,
      connectionFactory: async () => ({
        async listTools() {
          return [{ name: 'search_docs', description: 'Search docs' }]
        },
        async callTool(name) {
          return { content: `called:${name}` }
        },
        async close() {},
      }),
    })

    manager.registerServer({
      name: 'docs',
      config: {
        type: 'sse',
        url: 'http://127.0.0.1:8080/sse',
        syncToolsToRegistry: false,
      },
    })

    const connected = await manager.connectServer('docs')
    expect(connected.status).toBe('connected')
    expect(registered.size).toBe(0)

    await manager.disconnectServer('docs')
  })

  it('supports http config validation and connection lifecycle', async () => {
    const manager = new MCPManager({
      connectionFactory: async () => ({
        async listTools() {
          return [{ name: 'search_docs', description: 'Search docs' }]
        },
        async callTool(name) {
          return { content: `called:${name}` }
        },
        async close() {},
      }),
    })

    manager.registerServer({
      name: 'remote-docs',
      config: {
        type: 'http',
        url: 'http://127.0.0.1:8080/mcp',
      },
    })

    const connected = await manager.connectServer('remote-docs')
    expect(connected.status).toBe('connected')
    expect(connected.tools.map((tool) => tool.name)).toEqual(['search_docs'])

    const disconnected = await manager.disconnectServer('remote-docs')
    expect(disconnected.status).toBe('disconnected')
  })

  it('supports MCP resources when the connector exposes them', async () => {
    const manager = new MCPManager({
      connectionFactory: async () => ({
        async listTools() {
          return []
        },
        async callTool(name) {
          return { content: `called:${name}` }
        },
        async listResources() {
          return [{
            uri: 'file:///demo.txt',
            name: 'demo',
            mimeType: 'text/plain',
          }]
        },
        async readResource(uri) {
          return { content: `resource:${uri}` }
        },
        async close() {},
      }),
    })

    manager.registerServer({
      name: 'resources',
      config: {
        type: 'stdio',
        command: 'demo-mcp',
      },
    })

    await manager.connectServer('resources')
    await expect(manager.listResources('resources')).resolves.toEqual([{
      uri: 'file:///demo.txt',
      name: 'demo',
      mimeType: 'text/plain',
    }])
    await expect(manager.readResource('resources', 'file:///demo.txt')).resolves.toEqual({
      content: 'resource:file:///demo.txt',
    })
  })
})
