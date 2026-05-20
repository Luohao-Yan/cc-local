/**
 * Force-snip command stub
 *
 * HISTORY_SNIP feature: manually triggers a snip (context window management)
 * to free up context space. This is the CLI command version.
 */

import type { Command } from '../commands.js'

const forceSnip: Command = {
  type: 'prompt',
  name: 'force-snip',
  description: 'Force a context snip to free up context window space',
  isEnabled: () => true,
  progressMessage: 'snipping context',
  contentLength: 0,
  source: 'builtin',
  async getPromptForCommand(): Promise<import('@anthropic-ai/sdk/resources/messages.js').ContentBlockParam[]> {
    return [{
      type: 'text',
      text: 'The user has manually triggered a context snip. Please summarize the conversation so far concisely, preserving all important context, decisions, and file changes. The summary will replace the full conversation history to free up context space.'
    }]
  },
}

export default forceSnip
