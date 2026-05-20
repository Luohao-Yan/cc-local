import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'

const inputSchema = z.strictObject({})

export const TerminalCaptureTool = buildTool({
  name: 'TerminalCapture',
  maxResultSizeChars: 64_000,
  get inputSchema() {
    return inputSchema
  },
  async description() {
    return 'Capture the current output from the terminal panel. Use to check what a background process has produced.'
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
    return { data: { output: 'No terminal output to capture' } as Record<string, unknown> }
  },
} satisfies ToolDef<typeof inputSchema, Record<string, unknown>>)
