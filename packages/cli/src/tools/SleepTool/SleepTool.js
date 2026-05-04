/**
 * SleepTool - Shim
 *
 * 延迟执行工具，用于主动模式下的定时唤醒
 * 原始功能在 PROACTIVE 或 KAIROS feature 启用时可用
 */

export const SleepTool = {
  name: 'sleep',
  description: 'Delay execution for a specified duration',
  input_schema: {
    type: 'object',
    properties: {
      duration: {
        type: 'number',
        description: 'Duration in milliseconds',
      },
    },
    required: ['duration'],
  },

  async execute(input, context) {
    const duration = input?.duration || 1000

    // 安全限制：最大睡眠时间 60 秒
    const maxDuration = 60000
    const actualDuration = Math.min(duration, maxDuration)

    await new Promise(resolve => setTimeout(resolve, actualDuration))

    return {
      content: `Slept for ${actualDuration}ms`,
      type: 'tool_result',
    }
  },

  // Default implementation required by Tool interface
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
}

export default SleepTool
