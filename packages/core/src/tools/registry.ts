/**
 * 工具注册表
 * 管理所有可用工具
 */

import type { Tool } from '@cclocal/shared'
import {
  bashTool,
  fileReadTool,
  fileWriteTool,
  fileEditTool,
  globTool,
  grepTool,
} from './impl/index.js'

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
   * 注册默认工具集
   */
  registerDefaults(): void {
    this.register(bashTool)
    this.register(fileReadTool)
    this.register(fileWriteTool)
    this.register(fileEditTool)
    this.register(globTool)
    this.register(grepTool)
  }
}

// 全局工具注册表实例（预装默认工具）
export const toolRegistry = new ToolRegistry()
toolRegistry.registerDefaults()
