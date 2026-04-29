import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'

export const OVERFLOW_TEST_TOOL_NAME = 'OverflowTest'

const inputSchema = z.strictObject({})

export const OverflowTestTool = buildTool({
  name: OVERFLOW_TEST_TOOL_NAME,
  maxResultSizeChars: 64_000,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
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
