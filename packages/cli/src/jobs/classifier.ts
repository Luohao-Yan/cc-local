import type { AssistantMessage } from '../types/message.js'

/**
 * Stub job classifier for `CLAUDE_JOB_DIR` + TEMPLATES feature.
 */
export async function classifyAndWriteState(
  _jobDir: string,
  _turnAssistantMessages: AssistantMessage[],
): Promise<void> {}
