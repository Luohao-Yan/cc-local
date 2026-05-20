/**
 * SnipTool - Context window management tool
 *
 * HISTORY_SNIP feature: allows the model to request a snip
 * of the conversation history to free up context window space.
 */

import type { Tool, ToolUseContext as ToolContext } from '../../Tool.js'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.js'

export const SNIP_TOOL_NAME = 'snip'

export class SnipTool implements Tool {
  name = SNIP_TOOL_NAME
  displayName = 'Snip'

  async execute(_input: Record<string, unknown>, _context: ToolContext): Promise<ContentBlockParam[]> {
    return [{
      type: 'text',
      text: 'Context snip acknowledged. The conversation will be summarized at the next compaction cycle.'
    }]
  }

  getDescription(): string {
    return 'Request a snip of the conversation history to free up context space. Use this when you notice the context is getting long and want to proactively manage it.'
  }

  getParameterSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Why you want to snip (for your own reference)'
        }
      }
    }
  }
}
