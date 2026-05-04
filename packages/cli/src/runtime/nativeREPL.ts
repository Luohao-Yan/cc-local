/**
 * Native REPL - Packages-Native 独立交互式 REPL
 *
 * 提供完整的交互式体验：
 * - 输入处理和历史记录
 * - 斜杠命令支持
 * - 流式响应显示
 * - 取消和中断功能
 * - 多行输入支持
 */

import * as readline from 'readline'
import { NativeBridgeAdapter, type NativeQueryOptions } from '../bridge/nativeBridgeAdapter.js'
import { handleSlashCommandSimple, type SlashCommandResult } from '../runtime/slashCommands.js'
import { loadNativeConfig, saveNativeConfig, type NativeConfig } from '../runtime/configLoader.js'
import type { Message, StreamEvent } from '@cclocal/shared'

export interface NativeREPLProps {
  adapter: NativeBridgeAdapter
  model?: string
  cwd?: string
  sessionId?: string
  maxTurns?: number
}

interface REPLState {
  cwd: string
  history: string[]
  historyIndex: number
  pendingMessage: string
  isProcessing: boolean
  currentSessionId?: string
  abortController?: AbortController
}

/**
 * Native REPL 类 - 独立的交互式 REPL 实现
 */
export class NativeREPL {
  private adapter: NativeBridgeAdapter
  private rl: readline.Interface | null = null
  private state: REPLState
  private config: NativeConfig

  constructor(props: NativeREPLProps) {
    this.adapter = props.adapter
    // 同步加载配置（初始化时）
    this.config = {
      model: props.model,
      maxTurns: props.maxTurns,
      recentPrompts: [],
    }
    this.state = {
      cwd: props.cwd || process.cwd(),
      history: [],
      historyIndex: -1,
      pendingMessage: '',
      isProcessing: false,
      currentSessionId: props.sessionId,
    }
  }

  /**
   * 启动 REPL
   */
  async start(): Promise<void> {
    console.log('\n🚀 CCLocal Native REPL')
    console.log('   Type /help for commands, Ctrl+C to exit\n')

    await this.adapter.initialize()
    this.setupReadline()

    // 如果有初始会话，显示信息
    if (this.state.currentSessionId) {
      console.log(`   📋 Resuming session: ${this.state.currentSessionId.slice(0, 8)}...\n`)
    }

    this.prompt()
  }

  /**
   * 设置 readline 接口
   */
  private setupReadline(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '',
      historySize: 100,
      removeHistoryDuplicates: true,
    })

    // 处理输入
    this.rl.on('line', async (line) => {
      await this.handleInput(line)
    })

    // 处理关闭
    this.rl.on('close', () => {
      this.cleanup()
    })

    // 处理信号
    process.on('SIGINT', () => {
      if (this.state.isProcessing) {
        this.cancelGeneration()
      } else {
        this.exit()
      }
    })
  }

  /**
   * 显示提示符
   */
  private prompt(): void {
    if (this.rl) {
      this.rl.prompt()
      process.stdout.write('> ')
    }
  }

  /**
   * 处理用户输入
   */
  private async handleInput(line: string): Promise<void> {
    const input = line.trim()

    if (!input) {
      this.prompt()
      return
    }

    // 检查是否是斜杠命令
    if (input.startsWith('/')) {
      await this.handleSlashCommand(input)
      return
    }

    // 普通消息
    await this.sendMessage(input)
  }

  /**
   * 处理斜杠命令
   */
  private async handleSlashCommand(input: string): Promise<void> {
    const result = await handleSlashCommandSimple(input, {
      sessionId: this.state.currentSessionId,
      cwd: this.state.cwd,
      model: this.config.model,
    })

    switch (result.type) {
      case 'help':
        this.printHelp()
        break

      case 'clear':
        console.clear()
        break

      case 'rename':
        if (result.newName) {
          console.log(`Session renamed to: ${result.newName}`)
        }
        break

      case 'model':
        if (result.model) {
          this.config.model = result.model
          console.log(`Model changed to: ${result.model}`)
        } else {
          console.log(`Current model: ${this.config.model || 'default'}`)
        }
        break

      case 'cwd':
        if (result.cwd) {
          this.state.cwd = result.cwd
          console.log(`Working directory: ${result.cwd}`)
        } else {
          console.log(`Current directory: ${this.state.cwd}`)
        }
        break

      case 'exit':
        this.exit()
        return

      case 'unknown':
        console.log(result.message || `Unknown command: ${input}`)
        console.log('Type /help for available commands')
        break

      default:
        if (result.message) {
          console.log(result.message)
        }
    }

    this.prompt()
  }

  /**
   * 发送消息到后端
   */
  private async sendMessage(content: string): Promise<void> {
    if (this.state.isProcessing) {
      console.log('⏳ Already processing... press Ctrl+C to cancel')
      this.prompt()
      return
    }

    this.state.isProcessing = true
    this.state.abortController = new AbortController()

    // 添加到历史
    this.addToHistory(content)

    try {
      console.log() // 空行

      const messages: Message[] = [{
        id: crypto.randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: content }],
        timestamp: Date.now(),
      }]

      const options: NativeQueryOptions = {
        messages,
        model: this.config.model,
        maxTurns: this.config.maxTurns,
        sessionId: this.state.currentSessionId,
      }

      // 流式处理响应
      for await (const event of this.adapter.query(options)) {
        if (this.state.abortController?.signal.aborted) {
          break
        }

        this.handleStreamEvent(event)
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('\n   ⚠️ Cancelled')
      } else {
        console.log(`\n   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    } finally {
      this.state.isProcessing = false
      this.state.abortController = undefined
      this.prompt()
    }
  }

  /**
   * 处理流事件
   */
  private handleStreamEvent(event: StreamEvent): void {
    switch (event.type) {
      case 'stream_start':
        console.log() // 空行开始响应
        break

      case 'stream_delta':
        if (event.delta?.type === 'text' && event.delta.text) {
          process.stdout.write(event.delta.text)
        }
        break

      case 'stream_end':
        console.log() // 结束响应行
        break

      case 'tool_use':
        if (event.name) {
          console.log(`   🔧 Tool: ${event.name}`)
        }
        break

      case 'tool_result':
        if (event.result?.content) {
          const preview = typeof event.result.content === 'string'
            ? event.result.content.slice(0, 100)
            : JSON.stringify(event.result.content).slice(0, 100)
          console.log(`   📎 Result: ${preview}...`)
        }
        break

      case 'error':
        console.log(`   ❌ Error: ${event.error}`)
        break
    }
  }

  /**
   * 取消当前生成
   */
  private cancelGeneration(): void {
    if (this.state.abortController) {
      this.state.abortController.abort()
      this.adapter.cancel()
      console.log('\n   ⚠️ Cancelling...')
    }
  }

  /**
   * 添加到历史
   */
  private addToHistory(input: string): void {
    if (!this.state.history.includes(input)) {
      this.state.history.unshift(input)
      if (this.state.history.length > 50) {
        this.state.history.pop()
      }
      // 异步保存（不阻塞）
      saveNativeConfig({ recentPrompts: this.state.history.slice(0, 10) }).catch(() => {})
    }
  }

  /**
   * 打印帮助
   */
  private printHelp(): void {
    console.log(`
📚 Available Commands:

  /help, /?       - Show this help
  /clear          - Clear conversation history
  /rename <name>  - Rename current session
  /model <name>   - Change model (or show current)
  /cwd <path>     - Change working directory
  /exit, /quit    - Exit the session

⌨️  Keyboard Shortcuts:

  Ctrl+C          - Cancel current generation or exit
  Up/Down         - Navigate history (in supported terminals)
`)
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
  }

  /**
   * 退出 REPL
   */
  exit(): void {
    console.log('\n👋 Goodbye!\n')
    this.cleanup()
    process.exit(0)
  }
}

/**
 * 运行独立 REPL 模式
 */
export async function runNativeREPL(props: NativeREPLProps): Promise<void> {
  const repl = new NativeREPL(props)
  await repl.start()
}

/**
 * 运行简化 REPL（无 Ink 依赖的纯 Node.js 版本）
 */
export async function runSimpleREPL(props: NativeREPLProps): Promise<void> {
  return runNativeREPL(props)
}
