/**
 * Agent Executor
 *
 * 实现 Agent 自动执行模式，支持：
 * - 思考-行动-观察循环
 * - 自动决策
 * - 最大步数限制
 * - 取消支持
 */

import { randomUUID } from 'crypto'
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface AgentStep {
  id: string
  type: 'think' | 'action' | 'observe'
  content: string
  tool?: string
  input?: unknown
  result?: unknown
  timestamp: number
}

export interface AgentConfig {
  sessionId: string
  goal: string
  maxSteps: number
  tools: Tool[]
  context?: string
  onStep?: (step: AgentStep) => void
  onProgress?: (progress: number) => void
}

export interface AgentDecision {
  type: 'complete' | 'action'
  result?: unknown
  tool?: string
  input?: unknown
  reason?: string
}

export interface AgentResult {
  status: 'completed' | 'max_steps_reached' | 'failed' | 'cancelled'
  steps: AgentStep[]
  result?: unknown
  error?: string
}

/**
 * Agent 执行器
 */
export class AgentExecutor {
  private tools: Map<string, Tool>

  constructor(tools: Tool[] = []) {
    this.tools = new Map(tools.map(t => [t.name, t]))
  }

  /**
   * 执行 Agent 任务
   */
  async execute(
    config: AgentConfig,
    signal: AbortSignal
  ): Promise<AgentResult> {
    const steps: AgentStep[] = []
    let context = this.buildInitialContext(config)
    let stepCount = 0

    try {
      while (stepCount < config.maxSteps) {
        // 检查取消信号
        if (signal.aborted) {
          return {
            status: 'cancelled',
            steps,
          }
        }

        // 思考步骤
        const thought = await this.think(context, steps, config, signal)
        steps.push({
          id: randomUUID(),
          type: 'think',
          content: thought,
          timestamp: Date.now(),
        })
        config.onStep?.(steps[steps.length - 1]!)

        // 决策
        const decision = await this.decide(context, steps, config, signal)

        if (decision.type === 'complete') {
          return {
            status: 'completed',
            steps,
            result: decision.result,
          }
        }

        if (decision.type === 'action' && decision.tool) {
          // 执行工具
          const actionStep: AgentStep = {
            id: randomUUID(),
            type: 'action',
            content: `Executing ${decision.tool}`,
            tool: decision.tool,
            input: decision.input,
            timestamp: Date.now(),
          }
          steps.push(actionStep)
          config.onStep?.(actionStep)

          const result = await this.executeTool(
            decision.tool,
            decision.input,
            config.sessionId,
            signal
          )

          // 观察结果
          const observeStep: AgentStep = {
            id: randomUUID(),
            type: 'observe',
            content: this.formatResult(result),
            result,
            timestamp: Date.now(),
          }
          steps.push(observeStep)
          config.onStep?.(observeStep)

          // 更新上下文
          context = this.updateContext(context, steps)
        }

        stepCount++
        config.onProgress?.((stepCount / config.maxSteps) * 100)
      }

      return {
        status: 'max_steps_reached',
        steps,
      }

    } catch (error) {
      return {
        status: 'failed',
        steps,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 构建初始上下文
   */
  private buildInitialContext(config: AgentConfig): string {
    return `Goal: ${config.goal}

${config.context ? `Context: ${config.context}` : ''}

Available tools: ${Array.from(this.tools.keys()).join(', ')}
`
  }

  /**
   * 思考步骤
   */
  private async think(
    context: string,
    steps: AgentStep[],
    config: AgentConfig,
    signal: AbortSignal
  ): Promise<string> {
    // 简化版思考：分析当前状态，生成思考内容
    const recentSteps = steps.slice(-3)
    const summary = recentSteps.map(s => `${s.type}: ${s.content.slice(0, 100)}`).join('\n')

    return `Analyzing current state...\nRecent activity:\n${summary || 'No previous steps'}\nDetermining next action to achieve goal: ${config.goal}`
  }

  /**
   * 决策步骤
   */
  private async decide(
    context: string,
    steps: AgentStep[],
    config: AgentConfig,
    signal: AbortSignal
  ): Promise<AgentDecision> {
    // 简化版决策：基于步骤数和目标判断
    if (steps.length >= config.maxSteps - 1) {
      return {
        type: 'complete',
        result: 'Max steps reached',
      }
    }

    // 检查是否有工具可用
    const availableTools = Array.from(this.tools.keys())
    if (availableTools.length === 0) {
      return {
        type: 'complete',
        result: 'No tools available',
      }
    }

    // 选择工具（简化版：使用第一个可用工具）
    const toolName = availableTools[0]
    if (!toolName) {
      return {
        type: 'complete',
        result: 'No tool selected',
      }
    }

    return {
      type: 'action',
      tool: toolName,
      input: { goal: config.goal },
      reason: `Using ${toolName} to progress towards goal`,
    }
  }

  /**
   * 执行工具
   */
  private async executeTool(
    toolName: string,
    input: unknown,
    sessionId: string,
    signal: AbortSignal
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      return {
        content: `Tool not found: ${toolName}`,
        is_error: true,
      }
    }

    try {
      const context: ToolContext = {
        sessionId,
        cwd: process.cwd(),
        abortSignal: signal,
      }
      return await tool.execute(input, context)
    } catch (error) {
      return {
        content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  }

  /**
   * 格式化结果
   */
  private formatResult(result: ToolResult): string {
    if (typeof result.content === 'string') {
      return result.content.slice(0, 500)
    }
    return JSON.stringify(result.content).slice(0, 500)
  }

  /**
   * 更新上下文
   */
  private updateContext(context: string, steps: AgentStep[]): string {
    const recentActions = steps
      .filter(s => s.type === 'action' || s.type === 'observe')
      .slice(-4)
      .map(s => `${s.type}: ${s.content.slice(0, 200)}`)
      .join('\n')

    return `${context}\n\nRecent actions:\n${recentActions}`
  }

  /**
   * 添加工具
   */
  addTool(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * 移除工具
   */
  removeTool(name: string): void {
    this.tools.delete(name)
  }
}

// 导出默认实例工厂
export function createAgentExecutor(tools: Tool[]): AgentExecutor {
  return new AgentExecutor(tools)
}
