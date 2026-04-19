/**
 * 简化版 REPL - 命令行交互
 */

import * as readline from 'readline'
import type { CCLocalClient } from '../client/CCLocalClient.js'
import type { StreamEvent } from '@cclocal/shared'

interface LaunchReplOptions {
  model?: string
}

export async function launchRepl(client: CCLocalClient, options: LaunchReplOptions = {}): Promise<void> {
  console.log('\n🚀 CCLocal Interactive Mode')
  if (options.model) {
    console.log(`Model override: ${options.model}`)
  }
  console.log('Type your message and press Enter. Press Ctrl+C to exit.\n')

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  let currentResponse = ''
  let isGenerating = false

  // 设置消息处理
  const handleMessage = (event: StreamEvent) => {
    switch (event.type) {
      case 'stream_start':
        isGenerating = true
        currentResponse = ''
        process.stdout.write('\n🤖 ')
        break

      case 'stream_delta':
        if (event.delta?.type === 'text' && event.delta.text) {
          currentResponse += event.delta.text
          process.stdout.write(event.delta.text)
        }
        break

      case 'stream_end':
        isGenerating = false
        process.stdout.write('\n\n')
        promptUser()
        break

      case 'error':
        isGenerating = false
        console.error('\n❌ Error:', event.error)
        promptUser()
        break
    }
  }

  client.onMessage(handleMessage)

  const promptUser = () => {
    rl.question('You: ', (input) => {
      const trimmed = input.trim()
      if (!trimmed) {
        promptUser()
        return
      }

      if (trimmed === 'exit' || trimmed === 'quit') {
        console.log('\n👋 Goodbye!')
        rl.close()
        client.disconnect()
        process.exit(0)
      }

      void client.sendMessage(trimmed, { model: options.model }).catch((error) => {
        isGenerating = false
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error))
        promptUser()
      })
      // 等待响应，不立即提示
    })
  }

  promptUser()

  // 保持进程运行
  return new Promise(() => {
    // 永不 resolve，直到用户退出
  })
}
