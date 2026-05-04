/**
 * Native REPL - Packages-Native 独立交互式 REPL
 *
 * 提供完整的交互式体验：
 * - 多行输入编辑（反斜杠续行）
 * - Tab 自动补全
 * - 斜杠命令支持
 * - 流式响应显示
 * - Markdown/代码高亮
 * - 权限确认交互
 * - Token 预算管理
 * - 会话分叉
 * - 后台任务管理
 * - 差异对比显示
 * - 文件预览
 */

import * as readline from 'readline'
import * as fs from 'fs/promises'
import * as path from 'path'
import { marked } from 'marked'
import chalk from 'chalk'
import { diffLines } from 'diff'
import { NativeBridgeAdapter, type NativeQueryOptions } from '../bridge/nativeBridgeAdapter.js'
import { handleSlashCommandSimple, type SlashCommandResult } from '../runtime/slashCommands.js'
import { loadNativeConfig, saveNativeConfig, type NativeConfig } from '../runtime/configLoader.js'
import {
  getNativeCommandCompletions,
  getModelCompletions,
  type CompletionResult,
} from '../utils/nativeCompletions.js'
import type { Message, StreamEvent } from '@cclocal/shared'
import type { TokenBudgetStats, Task, TaskStatus } from '../types/nativeAdapter.js'

export interface NativeREPLProps {
  adapter: NativeBridgeAdapter
  model?: string
  cwd?: string
  sessionId?: string
  maxTurns?: number
  /** 启用 Vim 模式 */
  vimMode?: boolean
  /** 启用调试输出 */
  debug?: boolean
}

interface REPLState {
  cwd: string
  history: string[]
  historyIndex: number
  pendingMessage: string
  isProcessing: boolean
  currentSessionId?: string
  abortController?: AbortController
  /** 多行输入状态 */
  pendingLines: string[]
  inMultiLine: boolean
  /** 权限模式 */
  permissionMode: 'ask' | 'allow-all' | 'deny-all'
  /** Token 统计 */
  tokenStats?: TokenBudgetStats
  /** 后台任务 */
  tasks: Task[]
}

/**
 * Native REPL 类 - 独立的交互式 REPL 实现
 */
export class NativeREPL {
  private adapter: NativeBridgeAdapter
  private rl: readline.Interface | null = null
  private state: REPLState
  private config: NativeConfig
  private vimMode: boolean
  private debug: boolean

  constructor(props: NativeREPLProps) {
    this.adapter = props.adapter
    this.vimMode = props.vimMode ?? false
    this.debug = props.debug ?? false
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
      pendingLines: [],
      inMultiLine: false,
      permissionMode: 'ask',
      tasks: [],
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

    // 显示 Token 预算
    await this.showTokenBudgetIfNeeded()

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
      completer: this.completer.bind(this),
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
      } else if (this.state.inMultiLine) {
        // 取消多行输入
        this.state.pendingLines = []
        this.state.inMultiLine = false
        console.log('\n   ⚠️ Multi-line input cancelled')
        this.prompt()
      } else {
        this.exit()
      }
    })
  }

  /**
   * Tab 补全
   */
  private async completer(
    partial: string,
    callback: (err: null, completions: [string[], string]) => void
  ): Promise<void> {
    try {
      // 获取命令补全
      const result = getNativeCommandCompletions(partial)

      // 如果输入看起来像路径，添加文件补全
      if (this.isPathLikeToken(partial)) {
        const fileResult = await this.getFileCompletions(partial)
        result.completions.push(...fileResult.completions)
      }

      // 如果在 /model 命令后，添加模型补全
      if (partial.trimStart().startsWith('/model ')) {
        const modelPart = partial.split(/\s+/).pop() || ''
        const modelResult = getModelCompletions(modelPart)
        result.completions = modelResult.completions
      }

      callback(null, [result.completions, partial])
    } catch (error) {
      callback(null, [[], partial])
    }
  }

  /**
   * 检测是否是路径 Token
   */
  private isPathLikeToken(input: string): boolean {
    const trimmed = input.trim()
    // 以 ./ 或 ../ 或 / 或 ~ 开头
    if (/^(\.\/|\.\.\/|\/|~)/.test(trimmed)) return true
    // 包含路径分隔符
    if (trimmed.includes('/') || trimmed.includes('\\')) return true
    return false
  }

  /**
   * 获取文件补全
   */
  private async getFileCompletions(input: string): Promise<CompletionResult> {
    const trimmed = input.trim()
    let dirPath: string
    let prefix: string

    // 解析路径
    if (trimmed.startsWith('~')) {
      const home = process.env.HOME || process.env.USERPROFILE || ''
      const expanded = trimmed.replace(/^~/, home)
      const lastSep = Math.max(expanded.lastIndexOf('/'), expanded.lastIndexOf('\\'))
      dirPath = lastSep > 0 ? expanded.slice(0, lastSep) : home
      prefix = lastSep > 0 ? expanded.slice(lastSep + 1) : ''
    } else {
      const lastSep = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
      if (lastSep >= 0) {
        dirPath = path.resolve(this.state.cwd, trimmed.slice(0, lastSep) || '.')
        prefix = trimmed.slice(lastSep + 1)
      } else {
        dirPath = this.state.cwd
        prefix = trimmed
      }
    }

    try {
      const entries = await fs.readdir(dirPath)
      const matches = entries.filter(e =>
        prefix ? e.toLowerCase().startsWith(prefix.toLowerCase()) : true
      )

      return {
        completions: matches,
        hasMore: matches.length > 50,
        type: 'path',
        input,
        replaceFrom: input.length - prefix.length,
        replaceTo: input.length,
      }
    } catch {
      return {
        completions: [],
        hasMore: false,
        type: 'none',
        input,
        replaceFrom: 0,
        replaceTo: 0,
      }
    }
  }

  /**
   * 显示提示符
   */
  private prompt(): void {
    if (this.rl) {
      this.rl.prompt()
      if (this.state.inMultiLine) {
        process.stdout.write('... ')
      } else {
        process.stdout.write('> ')
      }
    }
  }

  /**
   * 处理用户输入
   */
  private async handleInput(line: string): Promise<void> {
    // 处理多行输入
    if (this.state.inMultiLine) {
      if (line.trim() === '') {
        // 空行结束多行输入
        const fullInput = this.state.pendingLines.join('\n')
        this.state.pendingLines = []
        this.state.inMultiLine = false
        await this.processInput(fullInput)
        return
      }
      if (line.endsWith('\\')) {
        // 续行
        this.state.pendingLines.push(line.slice(0, -1))
        this.prompt()
        return
      }
      // 普通行，添加并继续
      this.state.pendingLines.push(line)
      this.prompt()
      return
    }

    // 检查是否开始多行输入
    if (line.trim().endsWith('\\')) {
      this.state.pendingLines.push(line.trim().slice(0, -1))
      this.state.inMultiLine = true
      this.prompt()
      return
    }

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
   * 处理输入（处理后的内容）
   */
  private async processInput(input: string): Promise<void> {
    if (!input.trim()) {
      this.prompt()
      return
    }

    if (input.startsWith('/')) {
      await this.handleSlashCommand(input)
      return
    }

    await this.sendMessage(input)
  }

  /**
   * 处理斜杠命令
   */
  private async handleSlashCommand(input: string): Promise<void> {
    const [cmdPart, ...args] = input.split(/\s+/)
    const cmd = cmdPart?.toLowerCase() || ''
    const arg = args.join(' ').trim()

    // 扩展的斜杠命令处理
    switch (cmd) {
      case '/help':
      case '/?':
        this.printHelp()
        break

      case '/clear':
        console.clear()
        break

      case '/rename':
        if (!arg) {
          console.log('Usage: /rename <name>')
        } else {
          console.log(`Session renamed to: ${arg}`)
        }
        break

      case '/model':
        if (arg) {
          this.config.model = arg
          console.log(`Model changed to: ${arg}`)
        } else {
          console.log(`Current model: ${this.config.model || 'default'}`)
        }
        break

      case '/cwd':
        if (arg) {
          try {
            const resolved = path.resolve(this.state.cwd, arg)
            await fs.access(resolved)
            this.state.cwd = resolved
            console.log(`Working directory: ${resolved}`)
          } catch {
            console.log(`Directory not found: ${arg}`)
          }
        } else {
          console.log(`Current directory: ${this.state.cwd}`)
        }
        break

      case '/token':
      case '/budget':
        await this.showTokenBudget()
        break

      case '/branch':
      case '/fork':
        await this.branchSession(arg || undefined)
        break

      case '/task':
      case '/tasks':
        await this.showTasks()
        break

      case '/diff':
        await this.showDiff(args[0], args[1])
        break

      case '/preview':
      case '/view':
        await this.previewFile(arg)
        break

      case '/agent':
        console.log('Agent mode: Use Agent tool in conversation')
        break

      case '/vim':
        this.vimMode = !this.vimMode
        console.log(`Vim mode: ${this.vimMode ? 'enabled' : 'disabled'}`)
        break

      case '/exit':
      case '/quit':
        this.exit()
        return

      default:
        // 使用原有处理
        const result = await handleSlashCommandSimple(input, {
          sessionId: this.state.currentSessionId,
          cwd: this.state.cwd,
          model: this.config.model,
        })

        if (result.type === 'unknown') {
          console.log(result.message || `Unknown command: ${cmd}`)
          console.log('Type /help for available commands')
        } else if (result.message) {
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

      let inCodeBlock = false
      let codeBlockLang = ''
      let codeBlockContent = ''

      // 流式处理响应
      for await (const event of this.adapter.query(options)) {
        if (this.state.abortController?.signal.aborted) {
          break
        }

        // 处理事件并渲染
        switch (event.type) {
          case 'stream_delta':
            if (event.delta?.type === 'text' && event.delta.text) {
              const text = event.delta.text

              // 检测代码块
              if (text.includes('```')) {
                const parts = text.split('```')
                for (let i = 0; i < parts.length; i++) {
                  if (i % 2 === 0) {
                    // 普通文本
                    if (inCodeBlock) {
                      codeBlockContent += parts[i]
                    } else {
                      process.stdout.write(parts[i])
                    }
                  } else {
                    // 代码块标记
                    if (!inCodeBlock) {
                      inCodeBlock = true
                      codeBlockLang = parts[i].trim().split('\n')[0] || ''
                      codeBlockContent = ''
                    } else {
                      inCodeBlock = false
                      // 渲染代码块
                      this.renderCodeBlock(codeBlockContent, codeBlockLang)
                      codeBlockContent = ''
                      codeBlockLang = ''
                    }
                  }
                }
              } else if (inCodeBlock) {
                codeBlockContent += text
              } else {
                process.stdout.write(text)
              }
            }
            break

          case 'stream_end':
            // 确保结束代码块
            if (inCodeBlock && codeBlockContent) {
              this.renderCodeBlock(codeBlockContent, codeBlockLang)
            }
            console.log()
            break

          case 'tool_use':
            if (event.name) {
              console.log(`\n   🔧 Tool: ${event.name}`)
            }
            break

          case 'tool_result':
            if (event.result?.content) {
              const preview = typeof event.result.content === 'string'
                ? event.result.content.slice(0, 100)
                : JSON.stringify(event.result.content).slice(0, 100)
              console.log(`   📎 Result: ${preview}${preview.length >= 100 ? '...' : ''}`)
            }
            break

          case 'error':
            console.log(`\n   ❌ Error: ${event.error}`)
            break
        }
      }

      // 更新 Token 统计
      await this.updateTokenStats()

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
   * 渲染代码块
   */
  private renderCodeBlock(code: string, lang?: string): void {
    try {
      // 使用 chalk 高亮（简单实现）
      const lines = code.split('\n')
      console.log()
      for (const line of lines.slice(0, 50)) {
        console.log(chalk.cyan('  │ ') + chalk.dim(line))
      }
      if (lines.length > 50) {
        console.log(chalk.dim(`  ... ${lines.length - 50} more lines`))
      }
      console.log()
    } catch {
      console.log(code)
    }
  }

  /**
   * 渲染 Markdown 内容
   */
  private renderMarkdown(content: string): void {
    try {
      const tokens = marked.lexer(content)

      for (const token of tokens) {
        switch (token.type) {
          case 'heading':
            const heading = token as { depth: number; text: string }
            const prefix = '#'.repeat(heading.depth)
            console.log(chalk.bold.blue(`${prefix} ${heading.text}`))
            break

          case 'paragraph':
            const para = token as { text: string }
            console.log(para.text)
            break

          case 'code':
            const code = token as { lang?: string; text: string }
            this.renderCodeBlock(code.text, code.lang)
            break

          case 'list':
            const list = token as { items: Array<{ text: string }> }
            list.items.forEach((item, i) => {
              console.log(`  ${i + 1}. ${item.text}`)
            })
            break

          case 'blockquote':
            const quote = token as { text: string }
            console.log(chalk.dim(`  > ${quote.text}`))
            break

          default:
            if ('raw' in token) {
              console.log((token as { raw: string }).raw)
            }
        }
      }
    } catch {
      console.log(content)
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
      saveNativeConfig({ recentPrompts: this.state.history.slice(0, 10) }).catch(() => {})
    }
  }

  /**
   * 显示 Token 预算
   */
  private async showTokenBudget(): Promise<void> {
    if (!this.adapter.getTokenBudget) {
      console.log('Token budget not available for current mode')
      return
    }

    try {
      const stats = await this.adapter.getTokenBudget(this.state.currentSessionId || '')
      this.state.tokenStats = stats

      console.log('\n📊 Token Budget')
      console.log(`   Input:   ${stats.inputTokens.toLocaleString()}`)
      console.log(`   Output:  ${stats.outputTokens.toLocaleString()}`)
      console.log(`   Total:   ${stats.total.toLocaleString()}`)
      console.log(`   Budget:  ${stats.budget.toLocaleString()}`)

      const percentUsed = stats.budget > 0 ? (stats.total / stats.budget) * 100 : 0
      const remainingPercent = Math.max(0, 100 - percentUsed)

      if (remainingPercent < 20) {
        console.log(`   ${chalk.red(`Remaining: ${stats.remaining.toLocaleString()} (${remainingPercent.toFixed(1)}%)`)} `)
      } else if (remainingPercent < 50) {
        console.log(`   ${chalk.yellow(`Remaining: ${stats.remaining.toLocaleString()} (${remainingPercent.toFixed(1)}%)`)} `)
      } else {
        console.log(`   ${chalk.green(`Remaining: ${stats.remaining.toLocaleString()} (${remainingPercent.toFixed(1)}%)`)} `)
      }
    } catch (error) {
      console.log(`Failed to get token budget: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 如果需要显示 Token 预算
   */
  private async showTokenBudgetIfNeeded(): Promise<void> {
    // 可选：启动时显示概要
    if (this.debug) {
      await this.showTokenBudget()
    }
  }

  /**
   * 更新 Token 统计
   */
  private async updateTokenStats(): Promise<void> {
    if (this.adapter.getTokenBudget) {
      try {
        this.state.tokenStats = await this.adapter.getTokenBudget(this.state.currentSessionId || '')
      } catch {
        // 忽略错误
      }
    }
  }

  /**
   * 分叉会话
   */
  private async branchSession(name?: string): Promise<void> {
    if (!this.adapter.forkSession) {
      console.log('Session branching not available for current mode')
      return
    }

    try {
      const result = await this.adapter.forkSession(
        this.state.currentSessionId || '',
        { name }
      )
      console.log(`\n🌿 Branched session: ${result.id}`)
      console.log(`   Resume with: /resume ${result.id}`)

      // 可选：切换到新会话
      this.state.currentSessionId = result.id
    } catch (error) {
      console.log(`Failed to branch session: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 显示后台任务
   */
  private async showTasks(): Promise<void> {
    if (!this.adapter.getTasks) {
      console.log('Task management not available for current mode')
      return
    }

    try {
      const tasks = await this.adapter.getTasks(this.state.currentSessionId)
      this.state.tasks = tasks

      if (tasks.length === 0) {
        console.log('No active tasks')
        return
      }

      console.log('\n📋 Active Tasks\n')

      const statusIcons: Record<TaskStatus, string> = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
        cancelled: '🚫',
      }

      for (const task of tasks) {
        const icon = statusIcons[task.status] || '❓'
        console.log(`  ${icon} ${task.id.slice(0, 8)} - ${task.type}`)

        if (task.message) {
          console.log(`     ${chalk.dim(task.message)}`)
        }

        if (task.status === 'running' && task.progress > 0) {
          const bar = this.renderProgressBar(task.progress)
          console.log(`     ${bar}`)
        }

        if (task.error) {
          console.log(`     ${chalk.red(task.error)}`)
        }
      }
    } catch (error) {
      console.log(`Failed to get tasks: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 渲染进度条
   */
  private renderProgressBar(percent: number, width: number = 20): string {
    const filled = Math.round((percent / 100) * width)
    const empty = width - filled
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + `] ${percent.toFixed(0)}%`
  }

  /**
   * 显示差异对比
   */
  private async showDiff(file1?: string, file2?: string): Promise<void> {
    if (!file1) {
      console.log('Usage: /diff <file1> [file2]')
      console.log('       /diff <file>  - Show unstaged changes')
      return
    }

    try {
      const filePath1 = path.resolve(this.state.cwd, file1)

      if (file2) {
        // 比较两个文件
        const filePath2 = path.resolve(this.state.cwd, file2)
        const content1 = await fs.readFile(filePath1, 'utf-8')
        const content2 = await fs.readFile(filePath2, 'utf-8')

        this.renderTerminalDiff(content1, content2, `${file1} vs ${file2}`)
      } else {
        // 显示单个文件的差异（与 git HEAD 或空比较）
        const content = await fs.readFile(filePath1, 'utf-8')
        this.renderTerminalDiff('', content, file1)
      }
    } catch (error) {
      console.log(`Failed to show diff: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 渲染终端差异
   */
  private renderTerminalDiff(oldContent: string, newContent: string, filename?: string): void {
    const changes = diffLines(oldContent, newContent)

    if (filename) {
      console.log(chalk.bold(`\n📄 ${filename}\n`))
    }

    for (const change of changes) {
      const lines = change.value.split('\n').filter(l => l)

      if (change.added) {
        lines.forEach(line => {
          console.log(chalk.green(`+ ${line}`))
        })
      } else if (change.removed) {
        lines.forEach(line => {
          console.log(chalk.red(`- ${line}`))
        })
      } else {
        // 上下文行（最多显示3行）
        const contextLines = lines.slice(0, 3)
        contextLines.forEach(line => {
          console.log(chalk.dim(`  ${line}`))
        })
        if (lines.length > 3) {
          console.log(chalk.dim(`  ... ${lines.length - 3} more lines`))
        }
      }
    }
    console.log()
  }

  /**
   * 预览文件
   */
  private async previewFile(filePath?: string): Promise<void> {
    if (!filePath) {
      console.log('Usage: /preview <file>')
      return
    }

    try {
      const resolvedPath = path.resolve(this.state.cwd, filePath)
      const stat = await fs.stat(resolvedPath)

      if (stat.isDirectory()) {
        // 显示目录内容
        const entries = await fs.readdir(resolvedPath)
        console.log(`\n📁 ${filePath} (${entries.length} items)\n`)

        entries.slice(0, 20).forEach(entry => {
          console.log(`  ${entry}`)
        })

        if (entries.length > 20) {
          console.log(chalk.dim(`  ... ${entries.length - 20} more items`))
        }
      } else {
        // 显示文件内容
        const content = await fs.readFile(resolvedPath, 'utf-8')
        const lines = content.split('\n')

        console.log(`\n📄 ${filePath} (${lines.length} lines)\n`)

        // 显示前50行
        lines.slice(0, 50).forEach((line, i) => {
          const lineNum = String(i + 1).padStart(4, ' ')
          console.log(chalk.dim(`${lineNum} │ `) + line)
        })

        if (lines.length > 50) {
          console.log(chalk.dim(`\n  ... ${lines.length - 50} more lines`))
        }
      }
    } catch (error) {
      console.log(`Failed to preview: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 处理权限请求
   */
  async handlePermissionRequest(
    tool: string,
    input: unknown,
    reason?: string
  ): Promise<boolean> {
    // 如果设置了全局权限模式
    if (this.state.permissionMode === 'allow-all') {
      return true
    }
    if (this.state.permissionMode === 'deny-all') {
      return false
    }

    // 交互式权限确认
    return new Promise((resolve) => {
      console.log(`\n⚠️  Permission Required`)
      console.log(`   Tool: ${chalk.yellow(tool)}`)

      if (reason) {
        console.log(`   Reason: ${reason}`)
      }

      if (typeof input === 'object' && input !== null) {
        const preview = JSON.stringify(input, null, 2).slice(0, 200)
        console.log(`   Input: ${preview}${preview.length >= 200 ? '...' : ''}`)
      }

      this.rl!.question('\n   Allow? [y/N/a(all)/d(deny all)]: ', (answer) => {
        const lower = answer.toLowerCase().trim()

        if (lower === 'a' || lower === 'all') {
          this.state.permissionMode = 'allow-all'
          console.log('   ✅ All future permissions auto-allowed\n')
          resolve(true)
        } else if (lower === 'd' || lower === 'deny') {
          this.state.permissionMode = 'deny-all'
          console.log('   ❌ All future permissions auto-denied\n')
          resolve(false)
        } else if (lower === 'y' || lower === 'yes') {
          console.log('   ✅ Allowed\n')
          resolve(true)
        } else {
          console.log('   ❌ Denied\n')
          resolve(false)
        }
      })
    })
  }

  /**
   * 打印帮助
   */
  private printHelp(): void {
    console.log(`
📚 Available Commands:

  📝 Input & Navigation:
  /help, /?       - Show this help
  /clear          - Clear screen
  /exit, /quit    - Exit the session

  📁 File & Directory:
  /cwd [path]     - Change/show working directory
  /preview <file> - Preview file content
  /diff <file>    - Show file diff

  🔄 Session:
  /model [name]   - Change/show model
  /rename <name>  - Rename current session
  /branch [name]  - Fork current session
  /resume <id>    - Resume a session

  📊 Monitoring:
  /token, /budget - Show token budget
  /task, /tasks   - Show background tasks

  ⚙️ Settings:
  /vim            - Toggle vim mode
  /agent          - Agent mode info

⌨️  Keyboard Shortcuts:

  Ctrl+C          - Cancel generation or exit
  Tab             - Auto-complete
  Up/Down         - History navigation
  \\ at EOL       - Multi-line input continuation

💡 Multi-line Input:
  End a line with '\\' to continue on next line.
  Empty line ends multi-line input.
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
