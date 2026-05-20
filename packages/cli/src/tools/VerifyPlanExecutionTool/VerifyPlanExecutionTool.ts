import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() => z.object({}))
type InputSchema = ReturnType<typeof inputSchema>

export const VerifyPlanExecutionTool = buildTool({
  name: 'VerifyPlanExecution',
  isEnabled() {
    return false
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
    return true
  },
  async description() {
    return ''
  },
  async prompt() {
    return ''
  },
  get inputSchema() {
    return inputSchema()
  },
  async call() {
    return { type: 'tool_result', tool_use_id: '', content: [] }
  },
} satisfies ToolDef<InputSchema>)
