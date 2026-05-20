import type { LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { isForkSubagentEnabled, FORK_AGENT } from '../../tools/AgentTool/forkSubagent.js'
import {
  getLastCacheSafeParams,
  runForkedAgent,
  type ForkedAgentResult,
} from '../../utils/forkedAgent.js'
import { logEvent } from '../../services/analytics/index.js'
import { logForDebugging } from '../../utils/debug.js'
import type { AssistantMessage } from '../../types/message.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> {
  if (!isForkSubagentEnabled()) {
    onDone('Fork subagent is not available in this session.')
    return null
  }

  const directive = args?.trim()
  if (!directive) {
    onDone('Usage: /fork <directive> — provide a task for the forked agent.')
    return null
  }

  const cacheSafeParams = getLastCacheSafeParams()
  if (!cacheSafeParams) {
    onDone('No conversation context available for forking.')
    return null
  }

  const assistantMessage = context.messages.findLast(
    (m): m is AssistantMessage => m.type === 'assistant',
  )
  if (!assistantMessage) {
    onDone('No assistant message found to fork from.')
    return null
  }

  const { buildForkedMessages } = await import('../../tools/AgentTool/forkSubagent.js')
  const promptMessages = buildForkedMessages(directive, assistantMessage)

  logEvent('tengu_fork_command_started', {
    directive_length: directive.length,
  })

  onDone('Forked agent started in background.')

  runForkedAgent({
    promptMessages,
    cacheSafeParams,
    canUseTool: context.canUseTool ?? (async () => ({ behavior: 'allow' })),
    querySource: `agent:builtin:${FORK_AGENT.agentType}` as any,
    forkLabel: 'fork_command',
  })
    .then((result: ForkedAgentResult) => {
      logForDebugging(
        `[fork] agent completed — ${result.messages.length} messages`,
      )
      logEvent('tengu_fork_command_completed', {
        message_count: result.messages.length,
      })
    })
    .catch(err => {
      logForDebugging(`[fork] agent failed: ${err}`)
      logEvent('tengu_fork_command_failed', {
        error: String(err) as any,
      })
    })

  return null
}
