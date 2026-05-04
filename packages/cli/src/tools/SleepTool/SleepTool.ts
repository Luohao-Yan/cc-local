/**
 * SleepTool - Shim
 *
 * 延迟执行工具，用于主动模式下的定时唤醒
 * 原始功能在 PROACTIVE 或 KAIROS feature 启用时可用
 */

import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'

const inputSchema = z.object({
  duration: z.number().describe('Duration in milliseconds'),
})

type InputSchema = typeof inputSchema

export const SleepTool = buildTool({
  name: 'sleep',
  maxResultSizeChars: 1000,
  async description() {
    return 'Delay execution for a specified duration'
  },
  async prompt() {
    return 'Delay execution for a specified duration in milliseconds. Maximum 60 seconds.'
  },
  inputSchema,
  userFacingName() {
    return 'Sleep'
  },
  isEnabled() {
    return true
  },
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  isDestructive() {
    return false
  },
  async checkPermissions() {
    return { behavior: 'allow' as const }
  },
  renderToolUseMessage() {
    return null
  },
  renderToolUseProgressMessage() {
    return null
  },
  renderToolUseQueuedMessage() {
    return null
  },
  renderToolUseRejectedMessage() {
    return null
  },
  renderToolResultMessage() {
    return null
  },
  renderToolUseErrorMessage() {
    return null
  },
  async call(input) {
    const duration = input?.duration || 1000

    // 安全限制：最大睡眠时间 60 秒
    const maxDuration = 60000
    const actualDuration = Math.min(duration, maxDuration)

    await new Promise(resolve => setTimeout(resolve, actualDuration))

    return { data: `Slept for ${actualDuration}ms` }
  },
  mapToolResultToToolResultBlockParam(result, toolUseID) {
    return {
      type: 'tool_result',
      content: String(result),
      tool_use_id: toolUseID,
    }
  },
} satisfies ToolDef<InputSchema, string>)

export default SleepTool
