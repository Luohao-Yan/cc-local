import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { WORKFLOW_TOOL_NAME } from './constants.js'

const inputSchema = z.strictObject({})

export const WorkflowTool = buildTool({
  name: WORKFLOW_TOOL_NAME,
  maxResultSizeChars: 64_000,
  isConcurrencySafe: () => false,
  isReadOnly: () => false,
  get inputSchema() {
    return inputSchema
  },
  async description() {
    return ''
  },
  async prompt() {
    return ''
  },
  renderToolUseMessage() {
    return null
  },
  mapToolResultToToolResultBlockParam(
    _output: z.infer<typeof inputSchema>,
    toolUseID: string,
  ): ToolResultBlockParam {
    return { tool_use_id: toolUseID, type: 'tool_result', content: '' }
  },
  async call() {
    return { data: {} }
  },
} satisfies ToolDef<typeof inputSchema, Record<string, never>>)
