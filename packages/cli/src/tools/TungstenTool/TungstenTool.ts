import { z } from 'zod/v4'
import type { Tool } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const NAME = 'Tungsten'

const inputSchema = lazySchema(() => z.strictObject({}))
type InputSchema = ReturnType<typeof inputSchema>

export const TungstenTool: Tool<InputSchema, string> = buildTool({
  name: NAME,
  maxResultSizeChars: 100_000,
  async description() {
    return 'Tmux session tool (stub).'
  },
  async prompt() {
    return 'Tungsten / Tmux integration (stub).'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  userFacingName() {
    return NAME
  },
  isEnabled() {
    return process.env.USER_TYPE === 'ant'
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
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
  async call() {
    return { data: `${NAME} stub` }
  },
  mapToolResultToToolResultBlockParam(result, toolUseID) {
    return {
      type: 'tool_result',
      content: String(result),
      tool_use_id: toolUseID,
    }
  },
} satisfies ToolDef<InputSchema, string>)

export function clearSessionsWithTungstenUsage(): void {}

export function resetInitializationState(): void {}
