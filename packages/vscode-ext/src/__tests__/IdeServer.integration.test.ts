/**
 * IdeServer Integration Tests
 * Tests actual WebSocket server startup, lock file creation, and client connection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IdeServer } from '../IdeServer.js'
import WebSocket from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('IdeServer Integration', () => {
  let server: IdeServer
  let connectedEvents: number[] = []
  let disconnectedEvents: number[] = []
  let messages: string[] = []
  let errors: string[] = []

  beforeEach(() => {
    connectedEvents = []
    disconnectedEvents = []
    messages = []
    errors = []

    server = new IdeServer(['/test/workspace'], {
      onClientConnected: () => connectedEvents.push(Date.now()),
      onClientDisconnected: () => disconnectedEvents.push(Date.now()),
      onMessage: (line) => messages.push(line),
      onError: (err) => errors.push(err.message),
    })
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('server lifecycle', () => {
    it('should start and listen on a random port', async () => {
      await server.start()

      const port = server.getPort()
      expect(port).toBeGreaterThan(0)
      expect(port).toBeLessThan(65536)
    })

    it('should return a non-empty auth token', async () => {
      await server.start()

      const token = server.getAuthToken()
      expect(token).toBeDefined()
      expect(token.length).toBeGreaterThan(0)
    })

    it('should report no client connected initially', async () => {
      await server.start()
      expect(server.isClientConnected()).toBe(false)
    })

    it('should start and stop cleanly', async () => {
      await server.start()
      const port = server.getPort()
      expect(port).toBeGreaterThan(0)

      await server.stop()
      // After stop, port should still return the last known value
      expect(server.getPort()).toBe(port)
    })
  })

  describe('lock file', () => {
    it('should create lock file on start', async () => {
      await server.start()

      const port = server.getPort()
      const lockPath = path.join(os.homedir(), '.claude', 'ide', `${port}.lock`)

      expect(fs.existsSync(lockPath)).toBe(true)

      const content = JSON.parse(fs.readFileSync(lockPath, 'utf-8'))
      expect(content.workspaceFolders).toEqual(['/test/workspace'])
      expect(content.pid).toBe(process.pid)
      expect(content.ideName).toBe('VS Code')
      expect(content.transport).toBe('ws')
      expect(content.authToken).toBeDefined()
      expect(typeof content.runningInWindows).toBe('boolean')
    })

    it('should delete lock file on stop', async () => {
      await server.start()
      const port = server.getPort()
      const lockPath = path.join(os.homedir(), '.claude', 'ide', `${port}.lock`)

      expect(fs.existsSync(lockPath)).toBe(true)

      await server.stop()

      // Lock file should be cleaned up
      expect(fs.existsSync(lockPath)).toBe(false)
    })
  })

  describe('WebSocket connection', () => {
    it('should accept WebSocket connection with valid auth', async () => {
      await server.start()
      const port = server.getPort()
      const token = server.getAuthToken()

      const ws = new WebSocket(
        `ws://127.0.0.1:${port}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          resolve()
        })
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      // Wait for server to register client
      await new Promise(r => setTimeout(r, 100))
      expect(server.isClientConnected()).toBe(true)
      expect(connectedEvents.length).toBe(1)

      ws.close()
    })

    it('should reject WebSocket connection with invalid auth', async () => {
      await server.start()
      const port = server.getPort()

      const ws = new WebSocket(
        `ws://127.0.0.1:${port}`,
        { headers: { Authorization: 'Bearer invalid-token' } },
      )

      await new Promise<void>((resolve) => {
        ws.on('close', () => {
          resolve()
        })
        ws.on('error', () => {
          resolve()
        })
        setTimeout(() => resolve(), 5000)
      })

      expect(server.isClientConnected()).toBe(false)
    })

    it('should receive messages from connected client', async () => {
      await server.start()
      const port = server.getPort()
      const token = server.getAuthToken()

      const ws = new WebSocket(
        `ws://127.0.0.1:${port}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      // Send a message from client
      const testMsg = JSON.stringify({ type: 'assistant', content: 'hello' })
      ws.send(testMsg)

      // Wait for server to process
      await new Promise(r => setTimeout(r, 200))
      expect(messages.length).toBeGreaterThanOrEqual(1)
      expect(messages[0]).toContain('assistant')

      ws.close()
    })

    it('should send messages to connected client', async () => {
      await server.start()
      const port = server.getPort()
      const token = server.getAuthToken()

      const ws = new WebSocket(
        `ws://127.0.0.1:${port}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      const received: string[] = []

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      ws.on('message', (data: Buffer) => {
        received.push(data.toString())
      })

      // Send from server to client
      const sent = server.send({ type: 'ping', timestamp: Date.now() })
      expect(sent).toBe(true)

      await new Promise(r => setTimeout(r, 200))
      expect(received.length).toBeGreaterThanOrEqual(1)
      expect(received[0]).toContain('ping')

      ws.close()
    })

    it('should handle sendUserMessage format', async () => {
      await server.start()
      const port = server.getPort()
      const token = server.getAuthToken()

      const ws = new WebSocket(
        `ws://127.0.0.1:${port}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      const received: string[] = []

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      ws.on('message', (data: Buffer) => {
        received.push(data.toString())
      })

      const sent = server.sendUserMessage('Hello Claude')
      expect(sent).toBe(true)

      await new Promise(r => setTimeout(r, 200))
      expect(received.length).toBeGreaterThanOrEqual(1)

      const parsed = JSON.parse(received[0].trim())
      expect(parsed.type).toBe('user')
      expect(parsed.message.role).toBe('user')
      expect(parsed.message.content).toBe('Hello Claude')

      ws.close()
    })

    it('should detect client disconnection', async () => {
      await server.start()
      const port = server.getPort()
      const token = server.getAuthToken()

      const ws = new WebSocket(
        `ws://127.0.0.1:${port}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      expect(server.isClientConnected()).toBe(true)

      ws.close()

      await new Promise(r => setTimeout(r, 200))
      expect(server.isClientConnected()).toBe(false)
      expect(disconnectedEvents.length).toBe(1)
    })
  })
})
