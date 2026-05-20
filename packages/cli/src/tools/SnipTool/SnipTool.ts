import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

export const SNIP_TOOL_NAME = 'snip'

const inputSchema = lazySchema(() =>
  z.object({
    reason: z.string().optional().describe('Why you want to snip (for your own reference)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

export const SnipTool = buildTool({
  name: SNIP_TOOL_NAME,
  isEnabled() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  async description() {
    return 'Request a snip of the conversation history to free up context space.'
  },
  async prompt() {
    return 'Request a snip of the conversation history to free up context space. Use this when you notice the context is getting long and want to proactively manage it.'
  },
  get inputSchema() {
    return inputSchema()
  },
  async call() {
    return {
      data: 'Context snip acknowledged. The conversation will be summarized at the next compaction cycle.',
    }
  },
} satisfies ToolDef<InputSchema>)
