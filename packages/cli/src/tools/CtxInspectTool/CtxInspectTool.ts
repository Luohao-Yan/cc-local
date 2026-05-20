import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getStats } from '../../services/contextCollapse/index.js'
import { CTX_INSPECT_TOOL_NAME, DESCRIPTION, CTX_INSPECT_TOOL_PROMPT } from './prompt.js'

const inputSchema = z.strictObject({})

type InputSchema = typeof inputSchema

export const CtxInspectTool = buildTool({
  name: CTX_INSPECT_TOOL_NAME,
  maxResultSizeChars: 10_000,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return CTX_INSPECT_TOOL_PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema
  },
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  renderToolUseMessage() {
    return 'Inspecting context collapse state'
  },
  mapToolResultToToolResultBlockParam(
    _output: unknown,
    toolUseID: string,
  ): ToolResultBlockParam {
    const stats = getStats()
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: JSON.stringify(stats, null, 2),
    }
  },
  async call(_input, _context, _canUseTool, _parentMessage) {
    return {
      data: getStats(),
    }
  },
} satisfies ToolDef<InputSchema>)
