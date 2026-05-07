/**
 * Hook Manager for CCLocal VS Code Extension
 * Central manager for all hook registration and execution
 */

import * as vscode from 'vscode'
import type {
  HookType,
  HookHandler,
  HookDefinition,
  HookContext,
  HookResult,
  HooksConfiguration,
  HookExecutionOptions,
} from './types'
import { CommandHookExecutor, HttpHookExecutor, FunctionHookExecutor } from './executors'

// ─── Hook Manager ─────────────────────────────────────────────────────────────

export class HookManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private hooks: Map<HookType, HookDefinition[]>
  private executors: {
    command: CommandHookExecutor
    http: HttpHookExecutor
    function: FunctionHookExecutor
  }
  private enabled: boolean = true
  private allowedHttpUrls: Set<string>
  private allowedCommands: Set<string>
  private allowedEnvVars: Set<string>

  constructor(
    outputChannel: vscode.LogOutputChannel,
    config?: {
      allowedHttpUrls?: string[]
      allowedCommands?: string[]
      allowedEnvVars?: string[]
      registeredFunctions?: Map<string, (context: HookContext) => Promise<unknown>>
    }
  ) {
    this.outputChannel = outputChannel
    this.hooks = new Map()
    this.allowedHttpUrls = new Set(config?.allowedHttpUrls || [])
    this.allowedCommands = new Set(config?.allowedCommands || [])
    this.allowedEnvVars = new Set(config?.allowedEnvVars || [])

    // Initialize executors
    this.executors = {
      command: new CommandHookExecutor(outputChannel, config?.allowedCommands),
      http: new HttpHookExecutor(outputChannel, config?.allowedHttpUrls, config?.allowedEnvVars),
      function: new FunctionHookExecutor(outputChannel, config?.registeredFunctions),
    }

    this.outputChannel.debug('HookManager initialized')
  }

  // ─── Configuration ───────────────────────────────────────────────────────────

  /**
   * Load hooks from configuration
   */
  loadFromConfig(config: HooksConfiguration): void {
    this.clear()

    for (const [type, definitions] of Object.entries(config)) {
      if (definitions && definitions.length > 0) {
        const hookType = type as HookType
        this.hooks.set(hookType, definitions.filter(d => d.enabled !== false))
      }
    }

    this.outputChannel.debug(`Loaded ${this.getTotalHookCount()} hooks from configuration`)
  }

  /**
   * Set allowed HTTP URLs for security
   */
  setAllowedHttpUrls(urls: string[]): void {
    this.allowedHttpUrls = new Set(urls)
    this.executors.http = new HttpHookExecutor(
      this.outputChannel,
      urls,
      Array.from(this.allowedEnvVars)
    )
  }

  /**
   * Set allowed commands for security
   */
  setAllowedCommands(commands: string[]): void {
    this.allowedCommands = new Set(commands)
    this.executors.command = new CommandHookExecutor(
      this.outputChannel,
      commands
    )
  }

  /**
   * Register a function for function hooks
   */
  registerFunction(name: string, fn: (context: HookContext) => Promise<unknown>): void {
    this.executors.function.registerFunction(name, fn)
    this.outputChannel.debug(`Registered function hook: ${name}`)
  }

  /**
   * Unregister a function
   */
  unregisterFunction(name: string): void {
    this.executors.function.unregisterFunction(name)
    this.outputChannel.debug(`Unregistered function hook: ${name}`)
  }

  /**
   * Enable or disable all hooks
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.outputChannel.debug(`Hooks ${enabled ? 'enabled' : 'disabled'}`)
  }

  // ─── Hook Registration ───────────────────────────────────────────────────────

  /**
   * Register a hook definition
   */
  register(type: HookType, definition: HookDefinition): void {
    const existing = this.hooks.get(type) || []
    existing.push(definition)
    this.hooks.set(type, existing)
    this.outputChannel.debug(`Registered ${type} hook with ${definition.hooks.length} handlers`)
  }

  /**
   * Unregister a hook by index
   */
  unregister(type: HookType, index: number): boolean {
    const definitions = this.hooks.get(type)
    if (!definitions || index < 0 || index >= definitions.length) {
      return false
    }
    definitions.splice(index, 1)
    if (definitions.length === 0) {
      this.hooks.delete(type)
    }
    this.outputChannel.debug(`Unregistered ${type} hook at index ${index}`)
    return true
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear()
    this.outputChannel.debug('Cleared all hooks')
  }

  // ─── Hook Execution ──────────────────────────────────────────────────────────

  /**
   * Execute hooks for a given type
   */
  async execute(
    type: HookType,
    context: HookContext,
    options?: HookExecutionOptions
  ): Promise<HookResult[]> {
    if (!this.enabled) {
      this.outputChannel.debug(`Hooks disabled, skipping ${type}`)
      return []
    }

    const definitions = this.hooks.get(type)
    if (!definitions || definitions.length === 0) {
      this.outputChannel.debug(`No hooks registered for ${type}`)
      return []
    }

    // Ensure context has required fields
    const fullContext: HookContext = {
      type,
      timestamp: Date.now(),
      ...context,
    }

    const results: HookResult[] = []
    const timeout = options?.timeout ?? 60000
    const parallel = options?.parallel ?? false
    const stopOnFailure = options?.stopOnFailure ?? true

    this.outputChannel.debug(
      `Executing ${definitions.length} ${type} hooks (${parallel ? 'parallel' : 'sequential'})`
    )

    try {
      if (parallel) {
        // Execute all hooks in parallel
        const promises = definitions.flatMap((def, defIndex) =>
          this.executeDefinition(def, defIndex, fullContext, timeout)
        )
        const settled = await Promise.allSettled(promises)
        for (const result of settled) {
          if (result.status === 'fulfilled') {
            results.push(...result.value)
          } else {
            this.outputChannel.error(`Hook execution failed: ${result.reason}`)
          }
        }
      } else {
        // Execute sequentially, stopping on failure if configured
        for (let defIndex = 0; defIndex < definitions.length; defIndex++) {
          const defResults = await this.executeDefinition(
            definitions[defIndex],
            defIndex,
            fullContext,
            timeout
          )
          results.push(...defResults)

          // Check for blocking results
          if (stopOnFailure) {
            const hasFailure = defResults.some(r => !r.success)
            const hasBlock = defResults.some(r => r.block)
            if (hasFailure || hasBlock) {
              this.outputChannel.debug(`Stopping hook execution due to ${hasBlock ? 'block' : 'failure'}`)
              break
            }
          }
        }
      }
    } catch (error) {
      this.outputChannel.error(`Hook execution error: ${error}`)
    }

    this.outputChannel.debug(`Hook ${type} completed with ${results.length} results`)
    return results
  }

  /**
   * Execute a single hook definition (may contain multiple handlers)
   */
  private async executeDefinition(
    definition: HookDefinition,
    definitionIndex: number,
    context: HookContext,
    globalTimeout: number
  ): Promise<HookResult[]> {
    // Check matcher if present
    if (definition.matcher && !this.matchesContext(definition.matcher, context)) {
      this.outputChannel.debug(`Matcher "${definition.matcher}" did not match, skipping`)
      return []
    }

    const results: HookResult[] = []
    const startTime = Date.now()

    for (let handlerIndex = 0; handlerIndex < definition.hooks.length; handlerIndex++) {
      const handler = definition.hooks[handlerIndex]
      const remainingTimeout = globalTimeout - (Date.now() - startTime)

      if (remainingTimeout <= 0) {
        this.outputChannel.warn('Hook execution timed out')
        break
      }

      try {
        const result = await this.executeHandler(handler, context, remainingTimeout)
        result.handlerIndex = handlerIndex
        results.push(result)

        // Stop if handler requested blocking
        if (result.block) {
          this.outputChannel.debug('Handler requested block, stopping execution')
          break
        }
      } catch (error) {
        results.push({
          hookId: `error_${Date.now()}`,
          handlerIndex,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        })
      }
    }

    return results
  }

  /**
   * Execute a single handler
   */
  private async executeHandler(
    handler: HookHandler,
    context: HookContext,
    timeout: number
  ): Promise<HookResult> {
    const executor = this.executors[handler.type]
    if (!executor) {
      return {
        hookId: `invalid_${Date.now()}`,
        handlerIndex: 0,
        success: false,
        error: `Unknown handler type: ${handler.type}`,
        duration: 0,
      }
    }

    return executor.execute(handler, context)
  }

  /**
   * Check if a matcher pattern matches the context
   */
  private matchesContext(matcher: string, context: HookContext): boolean {
    try {
      // Match against tool name for tool-related hooks
      if (context.toolName) {
        const regex = new RegExp(matcher, 'i')
        return regex.test(context.toolName)
      }

      // Match against file path for file-related hooks
      if (context.filePath) {
        const regex = new RegExp(matcher, 'i')
        return regex.test(context.filePath)
      }

      // Match against command for bash hooks
      if (context.command) {
        const regex = new RegExp(matcher, 'i')
        return regex.test(context.command)
      }

      // No specific field to match, allow the hook
      return true
    } catch (error) {
      this.outputChannel.error(`Invalid matcher pattern "${matcher}": ${error}`)
      return false
    }
  }

  // ─── Convenience Methods ─────────────────────────────────────────────────────

  /**
   * Execute PreToolUse hooks
   */
  async executePreToolUse(
    toolName: string,
    toolInput?: unknown
  ): Promise<{ blocked: boolean; modifiedInput?: unknown; results: HookResult[] }> {
    const results = await this.execute('PreToolUse', {
      type: 'PreToolUse',
      timestamp: Date.now(),
      toolName,
      toolInput,
    })

    const blocked = results.some(r => r.block)
    const modifiedInput = results.find(r => r.modifiedInput !== undefined)?.modifiedInput

    return { blocked, modifiedInput, results }
  }

  /**
   * Execute PostToolUse hooks
   */
  async executePostToolUse(
    toolName: string,
    toolResult?: unknown,
    toolError?: string
  ): Promise<HookResult[]> {
    return this.execute('PostToolUse', {
      type: 'PostToolUse',
      timestamp: Date.now(),
      toolName,
      toolResult,
      toolError,
    })
  }

  /**
   * Execute FileWrite hooks
   */
  async executeFileWrite(filePath: string, content: string): Promise<HookResult[]> {
    return this.execute('FileWrite', {
      type: 'FileWrite',
      timestamp: Date.now(),
      filePath,
      fileContent: content,
    })
  }

  /**
   * Execute FileEdit hooks
   */
  async executeFileEdit(filePath: string, content: string): Promise<HookResult[]> {
    return this.execute('FileEdit', {
      type: 'FileEdit',
      timestamp: Date.now(),
      filePath,
      fileContent: content,
    })
  }

  /**
   * Execute BashExecution hooks
   */
  async executeBashExecution(command: string): Promise<{ blocked: boolean; results: HookResult[] }> {
    const results = await this.execute('BashExecution', {
      type: 'BashExecution',
      timestamp: Date.now(),
      command,
    })

    return {
      blocked: results.some(r => r.block),
      results,
    }
  }

  /**
   * Execute SessionStart hooks
   */
  async executeSessionStart(sessionId: string): Promise<HookResult[]> {
    return this.execute('SessionStart', {
      type: 'SessionStart',
      timestamp: Date.now(),
      sessionId,
    })
  }

  /**
   * Execute SessionEnd hooks
   */
  async executeSessionEnd(sessionId: string): Promise<HookResult[]> {
    return this.execute('SessionEnd', {
      type: 'SessionEnd',
      timestamp: Date.now(),
      sessionId,
    })
  }

  /**
   * Execute Error hooks
   */
  async executeError(errorMessage: string, errorStack?: string): Promise<HookResult[]> {
    return this.execute('Error', {
      type: 'Error',
      timestamp: Date.now(),
      errorMessage,
      errorStack,
    })
  }

  // ─── Query Methods ───────────────────────────────────────────────────────────

  /**
   * Get all registered hooks
   */
  getAllHooks(): Map<HookType, HookDefinition[]> {
    return new Map(this.hooks)
  }

  /**
   * Get hooks for a specific type
   */
  getHooks(type: HookType): HookDefinition[] {
    return this.hooks.get(type) || []
  }

  /**
   * Check if any hooks are registered for a type
   */
  hasHooks(type: HookType): boolean {
    const definitions = this.hooks.get(type)
    return definitions !== undefined && definitions.length > 0
  }

  /**
   * Get total count of all hooks
   */
  getTotalHookCount(): number {
    let count = 0
    for (const definitions of this.hooks.values()) {
      count += definitions.reduce((sum, def) => sum + def.hooks.length, 0)
    }
    return count
  }

  /**
   * Get hook statistics
   */
  getStats(): { totalHooks: number; hooksByType: Record<string, number> } {
    const hooksByType: Record<string, number> = {}

    for (const [type, definitions] of this.hooks) {
      hooksByType[type] = definitions.reduce((sum, def) => sum + def.hooks.length, 0)
    }

    return {
      totalHooks: this.getTotalHookCount(),
      hooksByType,
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  dispose(): void {
    this.clear()
    this.outputChannel.debug('HookManager disposed')
  }
}

// ─── Hook Manager Factory ─────────────────────────────────────────────────────

let instance: HookManager | null = null

/**
 * Get or create the global HookManager instance
 */
export function getHookManager(
  outputChannel?: vscode.LogOutputChannel,
  config?: ConstructorParameters<typeof HookManager>[1]
): HookManager {
  if (!instance && outputChannel) {
    instance = new HookManager(outputChannel, config)
  }
  return instance!
}

/**
 * Dispose the global HookManager instance
 */
export function disposeHookManager(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
