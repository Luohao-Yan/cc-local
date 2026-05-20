/**
 * 工具注册表
 * 管理所有可用工具，支持延迟加载（DeferredTool）
 */

import type { Tool } from '@cclocal/shared'
import {
  bashTool,
  fileReadTool,
  fileWriteTool,
  fileEditTool,
  globTool,
  grepTool,
  webFetchTool,
  webFetchAliasTool,
  webSearchTool,
  webSearchAliasTool,
  todoWriteTool,
  notebookEditTool,
  taskCreateTool,
  taskGetTool,
  taskListTool,
  taskUpdateTool,
  mcpCompatTool,
  readMcpResourceTool,
  legacyCompatibilityTools,
  agentTool,
  enterPlanModeTool,
  exitPlanModeTool,
  askUserQuestionTool,
  sendMessageTool,
  sendUserMessageTool,
  skillTool,
  toolSearchTool,
  configTool,
  taskOutputTool,
  taskStopTool,
  getConditionalTools,
} from './impl/index.js'

/**
 * DeferredTool — 延迟加载的工具占位符。
 *
 * 当 MCP 服务器连接时，其工具默认以 DeferredTool 形式注册。
 * 只向 API 发送 name + description + input_schema（标记 defer_loading: true），
 * 但不包含 execute 实现。当模型调用 ToolSearch 发现该工具时，
 * 才加载完整的 execute 实现并替换注册表中的占位符。
 */
export interface DeferredTool extends Tool {
  /** 标识这是延迟加载工具 */
  defer_loading: true
  /** 工具所属的 MCP 服务器名称 */
  serverName: string
  /** 加载完整实现（从 MCP 服务器获取最新 schema） */
  loadFull(): Promise<Tool>
}

/** 检查一个工具是否为延迟加载工具 */
export function isDeferredTool(tool: Tool): tool is DeferredTool {
  return 'defer_loading' in tool && (tool as DeferredTool).defer_loading === true
}

export class ToolRegistry {
  private tools = new Map<string, Tool>()

  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  unregister(name: string): void {
    this.tools.delete(name)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  clear(): void {
    this.tools.clear()
  }

  /**
   * 获取所有已完全加载（非延迟）的工具
   */
  getLoadedTools(): Tool[] {
    return this.getAll().filter((t) => !isDeferredTool(t))
  }

  /**
   * 获取所有延迟加载工具的名称
   */
  getDeferredToolNames(): string[] {
    return this.getAll().filter(isDeferredTool).map((t) => t.name)
  }

  /**
   * 将延迟加载工具提升为完整工具。
   * 当 ToolSearch 发现某工具后调用此方法。
   */
  promoteDeferredTool(name: string, fullTool: Tool): void {
    if (this.tools.has(name)) {
      this.tools.set(name, fullTool)
    }
  }

  /**
   * 根据名称模式搜索工具（支持 select: 前缀精确选择）
   *
   * @param query 搜索关键词，或 "select:ToolName" 格式精确选择
   * @returns 匹配的工具列表（含延迟工具的元信息）
   */
  searchTools(query: string): Tool[] {
    // 精确选择模式: "select:ToolName"
    if (query.startsWith('select:')) {
      const targetName = query.slice('select:'.length)
      const tool = this.tools.get(targetName)
      if (tool) return [tool]
      return []
    }

    // 模糊搜索: 名称或描述包含关键词
    const lowerQuery = query.toLowerCase()
    const scored: Array<{ tool: Tool; score: number }> = []

    for (const tool of this.tools.values()) {
      let score = 0
      const nameLower = tool.name.toLowerCase()
      const descLower = tool.description.toLowerCase()

      if (nameLower === lowerQuery) score += 100
      else if (nameLower.startsWith(lowerQuery)) score += 50
      else if (nameLower.includes(lowerQuery)) score += 25

      if (descLower.includes(lowerQuery)) score += 10

      if (score > 0) scored.push({ tool, score })
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.tool)
  }

  /**
   * 注册默认工具集 + 桥接适配器
   */
  registerDefaults(): void {
    this.register(bashTool)
    this.register(fileReadTool)
    this.register(fileWriteTool)
    this.register(fileEditTool)
    this.register(globTool)
    this.register(grepTool)
    this.register(webFetchTool)
    this.register(webFetchAliasTool)
    this.register(webSearchTool)
    this.register(webSearchAliasTool)
    this.register(todoWriteTool)
    this.register(notebookEditTool)
    this.register(taskCreateTool)
    this.register(taskGetTool)
    this.register(taskListTool)
    this.register(taskUpdateTool)
    this.register(mcpCompatTool)
    this.register(readMcpResourceTool)
    for (const tool of legacyCompatibilityTools) {
      this.register(tool)
    }
    this.register(agentTool)
    this.register(enterPlanModeTool)
    this.register(exitPlanModeTool)
    this.register(askUserQuestionTool)
    this.register(sendMessageTool)
    this.register(sendUserMessageTool)
    this.register(skillTool)
    this.register(toolSearchTool)
    this.register(configTool)
    this.register(taskOutputTool)
    this.register(taskStopTool)
    for (const tool of getConditionalTools()) {
      this.register(tool)
    }
  }

  /**
   * 注册来自 packages/cli 桥接层的工具适配器
   */
  registerBridgeAdapters(adapters: Tool[]): void {
    for (const tool of adapters) {
      if (!this.has(tool.name)) {
        this.register(tool)
      }
    }
  }

  /**
   * 批量注册 MCP 服务器的工具。
   * 默认情况下，MCP 工具以 DeferredTool 形式注册，
   * 直到模型通过 ToolSearch 发现它们才加载完整实现。
   */
  registerMcpTools(serverName: string, tools: Tool[], defer = true): void {
    for (const tool of tools) {
      if (defer) {
        const deferred: DeferredTool = {
          ...tool,
          defer_loading: true,
          serverName,
          async loadFull() {
            // 返回工具自身 — MCP 工具从服务器获取最新 schema 后重建
            return tool
          },
        }
        this.register(deferred)
      } else {
        this.register(tool)
      }
    }
  }
}

// 全局工具注册表实例
export const toolRegistry = new ToolRegistry()
toolRegistry.registerDefaults()
