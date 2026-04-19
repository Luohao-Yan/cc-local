#!/usr/bin/env bun
/**
 * CCLocal Server - HTTP + WebSocket 服务端入口
 */

import { Server } from './api/server.js'
import { WebSocketManager } from './ws/WebSocketManager.js'
import { SessionManager } from './sessions/SessionManager.js'
import { AuthManager } from './auth/AuthManager.js'
import { mcpManager } from '@cclocal/core'

const DEFAULT_PORT = 5678
const DEFAULT_HOST = '127.0.0.1'

async function main() {
  const port = parseInt(process.env.CCLOCAL_PORT || String(DEFAULT_PORT), 10)
  const host = process.env.CCLOCAL_HOST || DEFAULT_HOST

  console.log(`🚀 CCLocal Server v1.0.0`)
  console.log(`   Starting server on ${host}:${port}...`)

  // 初始化组件
  const authManager = new AuthManager()
  const sessionManager = new SessionManager()
  const wsManager = new WebSocketManager({ authManager, sessionManager })
  const authSummary = authManager.getAuthSummary()

  // 创建 HTTP 服务器
  const server = new Server({
    port,
    host,
    authManager,
    sessionManager,
    wsManager,
    mcpManager,
  })

  // 启动服务器
  await server.start()

  console.log(`✅ Server ready at http://${host}:${port}`)
  console.log(`   WebSocket endpoint: ws://${host}:${port}/ws`)
  console.log(`   API token source: ${authSummary.configuredApiKey ? 'CCLOCAL_API_KEY' : 'ephemeral startup token'}`)
  console.log(`   API token: ${authManager.getServerToken()}`)
  console.log(`   Loopback browser origins: ${authSummary.allowLoopbackOrigins ? 'enabled' : 'disabled'}`)
  if (authSummary.allowedOrigins.length > 0) {
    console.log(`   Allowed origins: ${authSummary.allowedOrigins.join(', ')}`)
  }

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...')
    await server.stop()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('❌ Server failed to start:', error)
  process.exit(1)
})
