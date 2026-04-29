import { z } from 'zod'
import type { Tool } from '../../Tool.js'

export const VerifyPlanExecutionTool: Tool = {
  name: 'VerifyPlanExecution',
  async call() {
    return { type: 'tool_result', tool_use_id: '', content: [] }
  },
  async description() {
    return ''
  },
  inputSchema: z.object({}),
  isConcurrencySafe() {
    return false
  },
  isEnabled() {
    return false
  },
  isReadOnly() {
    return true
  },
}
