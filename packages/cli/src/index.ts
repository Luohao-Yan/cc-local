#!/usr/bin/env bun
/**
 * CCLocal CLI 客户端入口
 */

import { Command } from 'commander'
import { CCLocalClient } from './client/CCLocalClient.js'
import { launchRepl } from './repl/simpleRepl.js'

const program = new Command()

program
  .name('cclocal')
  .description('CCLocal - AI-powered development assistant')
  .version('1.0.0')
  .option('-s, --server <url>', 'Server URL', 'ws://127.0.0.1:5678')
  .option('-t, --token <token>', 'Authentication token')
  .option('--print <prompt>', 'Single prompt mode (non-interactive)')
  .option('--model <model>', 'Model to use')
  .option('--cwd <cwd>', 'Working directory', process.cwd())
  .action(async (options) => {
    // 创建客户端
    const client = new CCLocalClient({
      serverUrl: options.server,
      authToken: options.token,
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
    })

    try {
      // 连接到服务端
      await client.connect()
      console.log('✅ Connected to CCLocal Server')

      if (options.print) {
        // 单次提问模式
        await handleSinglePrompt(client, options.print, options.model)
      } else {
        // 交互式 REPL 模式
        await launchRepl(client)
      }
    } catch (error) {
      console.error('❌ Failed to connect:', error)
      process.exit(1)
    }
  })

async function handleSinglePrompt(
  client: CCLocalClient,
  prompt: string,
  model?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let response = ''

    client.onMessage((event) => {
      switch (event.type) {
        case 'stream_start':
          // 开始接收响应
          break
        case 'stream_delta':
          if (event.delta?.type === 'text_delta' && event.delta.text) {
            response += event.delta.text
            process.stdout.write(event.delta.text)
          }
          break
        case 'stream_end':
          console.log() // 换行
          resolve()
          break
        case 'error':
          reject(new Error(event.error || 'Unknown error'))
          break
      }
    })

    // 发送消息
    client.sendMessage(prompt, { model })
  })
}

program.parse()
