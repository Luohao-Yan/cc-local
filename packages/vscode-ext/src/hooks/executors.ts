/**
 * Hook Executors for CCLocal VS Code Extension
 * Implements command, HTTP, and function hook execution
 */

import * as vscode from 'vscode'
import * as child_process from 'child_process'
import * as https from 'https'
import * as http from 'http'
import * as url from 'url'
import type {
  HookHandler,
  HookContext,
  HookResult,
  CommandHookHandler,
  HttpHookHandler,
  FunctionHookHandler,
  AgentHookHandler,
  PromptHookHandler,
} from './types'

// ─── Base Executor ─────────────────────────────────────────────────────────────

export abstract class HookExecutor {
  abstract execute(
    handler: HookHandler,
    context: HookContext
  ): Promise<HookResult>

  protected createResult(
    hookId: string,
    handlerIndex: number,
    success: boolean,
    output?: string,
    error?: string,
    duration?: number
  ): HookResult {
    return {
      hookId,
      handlerIndex,
      success,
      output,
      error,
      duration: duration || 0,
    }
  }

  protected getTimeout(handler: HookHandler, defaultTimeout: number): number {
    return handler.timeout || defaultTimeout
  }
}

// ─── Command Executor ──────────────────────────────────────────────────────────

export class CommandHookExecutor extends HookExecutor {
  private outputChannel: vscode.LogOutputChannel
  private allowedCommands: Set<string> | null

  constructor(
    outputChannel: vscode.LogOutputChannel,
    allowedCommands?: string[]
  ) {
    super()
    this.outputChannel = outputChannel
    this.allowedCommands = allowedCommands ? new Set(allowedCommands) : null
  }

  async execute(
    handler: CommandHookHandler,
    context: HookContext
  ): Promise<HookResult> {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const startTime = Date.now()
    const timeout = this.getTimeout(handler, 30000)

    // Build environment
    const env = this.buildEnvironment(context, handler.env)

    // Build command with context substitution
    const command = this.substituteContext(handler.command, context)

    this.outputChannel.debug(`Executing command hook: ${command}`)

    try {
      const result = await this.runCommand(command, env, timeout, context)
      const duration = Date.now() - startTime

      return this.createResult(
        hookId,
        0,
        result.success,
        result.output,
        result.error,
        duration
      )
    } catch (error) {
      const duration = Date.now() - startTime
      return this.createResult(
        hookId,
        0,
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
        duration
      )
    }
  }

  private runCommand(
    command: string,
    env: Record<string, string>,
    timeout: number,
    context: HookContext
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

      const proc = child_process.spawn(command, [], {
        cwd: workspaceRoot || process.cwd(),
        env: { ...process.env, ...env },
        shell: true,
        timeout,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('error', (error: Error) => {
        resolve({
          success: false,
          output: stdout,
          error: error.message,
        })
      })

      proc.on('close', (code: number | null) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: code !== 0 ? stderr : undefined,
        })
      })

      // Pass context as JSON via stdin
      if (context) {
        try {
          proc.stdin?.write(JSON.stringify(context))
          proc.stdin?.end()
        } catch {
          // Ignore stdin errors
        }
      }
    })
  }

  private buildEnvironment(
    context: HookContext,
    handlerEnv?: Record<string, string>
  ): Record<string, string> {
    const env: Record<string, string> = {
      CCLOCAL_HOOK_TYPE: context.type,
      CCLOCAL_HOOK_TIMESTAMP: String(context.timestamp),
    }

    if (context.sessionId) {
      env.CCLOCAL_SESSION_ID = context.sessionId
    }

    if (context.toolName) {
      env.CCLOCAL_TOOL_NAME = context.toolName
    }

    if (context.filePath) {
      env.CCLOCAL_FILE_PATH = context.filePath
    }

    if (context.command) {
      env.CCLOCAL_COMMAND = context.command
    }

    if (context.model) {
      env.CCLOCAL_MODEL = context.model
    }

    if (handlerEnv) {
      Object.assign(env, handlerEnv)
    }

    return env
  }

  private substituteContext(template: string, context: HookContext): string {
    return template
      .replace(/\$\{toolName\}/g, context.toolName || '')
      .replace(/\$\{filePath\}/g, context.filePath || '')
      .replace(/\$\{command\}/g, context.command || '')
      .replace(/\$\{model\}/g, context.model || '')
      .replace(/\$\{sessionId\}/g, context.sessionId || '')
      .replace(/\$\{timestamp\}/g, String(context.timestamp))
      .replace(/\$\{type\}/g, context.type)
  }
}

// ─── HTTP Executor ──────────────────────────────────────────────────────────────

export class HttpHookExecutor extends HookExecutor {
  private outputChannel: vscode.LogOutputChannel
  private allowedUrls: Set<string> | null
  private allowedEnvVars: Set<string>

  constructor(
    outputChannel: vscode.LogOutputChannel,
    allowedUrls?: string[],
    allowedEnvVars?: string[]
  ) {
    super()
    this.outputChannel = outputChannel
    this.allowedUrls = allowedUrls ? new Set(allowedUrls) : null
    this.allowedEnvVars = new Set(allowedEnvVars || [])
  }

  async execute(
    handler: HttpHookHandler,
    context: HookContext
  ): Promise<HookResult> {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const startTime = Date.now()
    const timeout = this.getTimeout(handler, 10000)

    // Check URL whitelist
    if (this.allowedUrls && !this.isUrlAllowed(handler.url)) {
      return this.createResult(
        hookId,
        0,
        false,
        undefined,
        `URL not in whitelist: ${handler.url}`,
        Date.now() - startTime
      )
    }

    this.outputChannel.debug(`Executing HTTP hook: ${handler.url}`)

    try {
      const result = await this.makeRequest(handler, context, timeout)
      const duration = Date.now() - startTime

      return this.createResult(
        hookId,
        0,
        result.success,
        result.output,
        result.error,
        duration
      )
    } catch (error) {
      const duration = Date.now() - startTime
      return this.createResult(
        hookId,
        0,
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
        duration
      )
    }
  }

  private isUrlAllowed(urlString: string): boolean {
    if (!this.allowedUrls) return true

    try {
      const parsed = new url.URL(urlString)
      // Check if base URL is allowed
      for (const allowed of this.allowedUrls) {
        if (parsed.origin === allowed || urlString.startsWith(allowed)) {
          return true
        }
      }
      return false
    } catch {
      return false
    }
  }

  private makeRequest(
    handler: HttpHookHandler,
    context: HookContext,
    timeout: number
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const parsedUrl = new url.URL(handler.url)
      const isHttps = parsedUrl.protocol === 'https:'
      const requestModule = isHttps ? https : http

      // Build headers with context
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...handler.headers,
      }

      // Filter allowed env vars in headers
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string' && value.startsWith('${env:')) {
          const envVar = value.match(/\$\{env:([^}]+)\}/)?.[1]
          if (envVar && this.allowedEnvVars.has(envVar)) {
            headers[key] = process.env[envVar] || ''
          } else if (envVar) {
            delete headers[key] // Remove disallowed env var references
          }
        }
      }

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: handler.method || 'POST',
        headers,
        timeout,
      }

      const req = requestModule.request(options, (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString()
        })
        res.on('end', () => {
          resolve({
            success: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
            output: data,
            error: res.statusCode !== undefined && res.statusCode >= 400
              ? `HTTP ${res.statusCode}`
              : undefined,
          })
        })
      })

      req.on('error', (error: Error) => {
        resolve({
          success: false,
          error: error.message,
        })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({
          success: false,
          error: 'Request timed out',
        })
      })

      // Send context as JSON body
      req.write(JSON.stringify(context))
      req.end()
    })
  }
}

// ─── Function Executor ───────────────────────────────────────────────────────────

export class FunctionHookExecutor extends HookExecutor {
  private outputChannel: vscode.LogOutputChannel
  private registeredFunctions: Map<string, (context: HookContext) => Promise<unknown>>

  constructor(
    outputChannel: vscode.LogOutputChannel,
    registeredFunctions?: Map<string, (context: HookContext) => Promise<unknown>>
  ) {
    super()
    this.outputChannel = outputChannel
    this.registeredFunctions = registeredFunctions || new Map()
  }

  /**
   * Register a function for use in hooks
   */
  registerFunction(name: string, fn: (context: HookContext) => Promise<unknown>): void {
    this.registeredFunctions.set(name, fn)
  }

  /**
   * Unregister a function
   */
  unregisterFunction(name: string): void {
    this.registeredFunctions.delete(name)
  }

  async execute(
    handler: FunctionHookHandler,
    context: HookContext
  ): Promise<HookResult> {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const startTime = Date.now()
    const timeout = this.getTimeout(handler, 5000)

    const fn = this.registeredFunctions.get(handler.handler)
    if (!fn) {
      return this.createResult(
        hookId,
        0,
        false,
        undefined,
        `Function not registered: ${handler.handler}`,
        Date.now() - startTime
      )
    }

    this.outputChannel.debug(`Executing function hook: ${handler.handler}`)

    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(context),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Function timed out')), timeout)
        ),
      ])

      const duration = Date.now() - startTime

      return this.createResult(
        hookId,
        0,
        true,
        JSON.stringify(result),
        undefined,
        duration
      )
    } catch (error) {
      const duration = Date.now() - startTime
      return this.createResult(
        hookId,
        0,
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
        duration
      )
    }
  }
}

// ─── Agent Executor (1:1 with official extension) ───────────────────────────────

export class AgentHookExecutor extends HookExecutor {
  private outputChannel: vscode.LogOutputChannel

  constructor(outputChannel: vscode.LogOutputChannel) {
    super()
    this.outputChannel = outputChannel
  }

  /**
   * Execute an agent hook: sends a prompt to Claude via the CLI's
   * built-in LLM evaluation capability.
   *
   * The agent hook evaluates the prompt with the specified model and
   * returns the response. If the response contains "BLOCK" or "APPROVE"
   * keywords, the hook result is interpreted accordingly.
   */
  async execute(
    handler: AgentHookHandler,
    context: HookContext
  ): Promise<HookResult> {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const startTime = Date.now()
    const timeout = this.getTimeout(handler, 60000)

    this.outputChannel.debug(`Executing agent hook with model: ${handler.model ?? 'default'}`)

    try {
      // Build the prompt with context
      const fullPrompt = this.buildPrompt(handler.prompt, context)

      // Execute the agent evaluation via CLI subprocess
      const result = await this.evaluateWithCLI(fullPrompt, handler.model, timeout)

      const duration = Date.now() - startTime

      // Parse the response for block/approve directives
      const block = this.shouldBlock(result)
      return this.createResult(
        hookId,
        0,
        true,
        result,
        undefined,
        duration,
      )
    } catch (error) {
      const duration = Date.now() - startTime
      return this.createResult(
        hookId,
        0,
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
        duration
      )
    }
  }

  private buildPrompt(promptTemplate: string, context: HookContext): string {
    return promptTemplate
      .replace(/\$\{toolName\}/g, context.toolName || '')
      .replace(/\$\{filePath\}/g, context.filePath || '')
      .replace(/\$\{command\}/g, context.command || '')
      .replace(/\$\{model\}/g, context.model || '')
      .replace(/\$\{type\}/g, context.type)
      .replace(/\$\{context\}/g, JSON.stringify(context, null, 2))
  }

  private async evaluateWithCLI(prompt: string, model?: string, timeout?: number): Promise<string> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const cclocalPath = config.get<string>('cclocalPath') || 'cclocal'

    const args = ['--ide', '--eval-hook']
    if (model) {
      args.push('--model', model)
    }

    return new Promise((resolve, reject) => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      const proc = child_process.spawn(cclocalPath, args, {
        cwd: workspaceRoot || process.cwd(),
        env: { ...process.env },
        shell: true,
        timeout,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('error', (error: Error) => {
        reject(error)
      })

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim())
        } else {
          reject(new Error(stderr.trim() || `Process exited with code ${code}`))
        }
      })

      // Send prompt via stdin
      try {
        proc.stdin?.write(prompt)
        proc.stdin?.end()
      } catch {
        // Ignore stdin errors
      }
    })
  }

  private shouldBlock(response: string): boolean {
    const lower = response.toLowerCase()
    return lower.includes('block') && !lower.includes('approve')
  }
}

// ─── Prompt Executor (1:1 with official extension) ─────────────────────────────

export class PromptHookExecutor extends HookExecutor {
  private outputChannel: vscode.LogOutputChannel

  constructor(outputChannel: vscode.LogOutputChannel) {
    super()
    this.outputChannel = outputChannel
  }

  /**
   * Execute a prompt hook: evaluates an LLM prompt and returns the response.
   * Similar to agent hooks but simpler — no tool-use loop, just a single
   * prompt evaluation. Used for lightweight checks/transformations.
   */
  async execute(
    handler: PromptHookHandler,
    context: HookContext
  ): Promise<HookResult> {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const startTime = Date.now()
    const timeout = this.getTimeout(handler, 30000)

    this.outputChannel.debug(`Executing prompt hook with model: ${handler.model ?? 'default'}`)

    try {
      const fullPrompt = this.buildPrompt(handler.prompt, context)

      // Execute via CLI — same mechanism as agent but with simpler protocol
      const result = await this.evaluateWithCLI(fullPrompt, handler.model, timeout)

      const duration = Date.now() - startTime

      // Parse for block directive
      const block = this.shouldBlock(result)

      return this.createResult(
        hookId,
        0,
        true,
        result,
        undefined,
        duration,
      )
    } catch (error) {
      const duration = Date.now() - startTime
      return this.createResult(
        hookId,
        0,
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
        duration
      )
    }
  }

  private buildPrompt(promptTemplate: string, context: HookContext): string {
    return promptTemplate
      .replace(/\$\{toolName\}/g, context.toolName || '')
      .replace(/\$\{filePath\}/g, context.filePath || '')
      .replace(/\$\{command\}/g, context.command || '')
      .replace(/\$\{model\}/g, context.model || '')
      .replace(/\$\{type\}/g, context.type)
      .replace(/\$\{context\}/g, JSON.stringify(context, null, 2))
  }

  private async evaluateWithCLI(prompt: string, model?: string, timeout?: number): Promise<string> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const cclocalPath = config.get<string>('cclocalPath') || 'cclocal'

    const args = ['--ide', '--eval-hook']
    if (model) {
      args.push('--model', model)
    }

    return new Promise((resolve, reject) => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      const proc = child_process.spawn(cclocalPath, args, {
        cwd: workspaceRoot || process.cwd(),
        env: { ...process.env },
        shell: true,
        timeout,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('error', (error: Error) => {
        reject(error)
      })

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim())
        } else {
          reject(new Error(stderr.trim() || `Process exited with code ${code}`))
        }
      })

      try {
        proc.stdin?.write(prompt)
        proc.stdin?.end()
      } catch {
        // Ignore
      }
    })
  }

  private shouldBlock(response: string): boolean {
    const lower = response.toLowerCase()
    return lower.includes('block') && !lower.includes('approve')
  }
}
