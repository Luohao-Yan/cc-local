/**
 * Heuristic summarization for context collapse.
 *
 * No model calls — purely heuristic to avoid extra API cost.
 * - Tool-use cycles: extract tool name + first 5 lines of tool_result
 * - Text messages: extract first paragraph (up to 200 chars)
 */

const MAX_TOOL_RESULT_LINES = 5
const MAX_TEXT_CHARS = 200

/**
 * Summarize a tool-use cycle: "<ToolName>: <first 5 lines of result>"
 */
export function summarizeToolCycle(
  toolName: string,
  resultContent: string,
): string {
  const lines = resultContent.split('\n').filter((l) => l.trim() !== '')
  const head = lines.slice(0, MAX_TOOL_RESULT_LINES).join('\n')
  const truncated = lines.length > MAX_TOOL_RESULT_LINES ? '...' : ''
  const body = head ? `\n${head}${truncated}` : ''

  return `[Collapsed: ${toolName}]${body}`
}

/**
 * Summarize a plain text message: first paragraph, up to 200 chars.
 */
export function summarizeText(text: string): string {
  if (!text) return '[Collapsed: empty message]'

  // First paragraph = text up to double newline or end
  const firstParagraph = text.split(/\n\s*\n/)[0] ?? text
  const trimmed = firstParagraph.trim()

  if (trimmed.length <= MAX_TEXT_CHARS) {
    return `[Collapsed text] ${trimmed}`
  }

  return `[Collapsed text] ${trimmed.slice(0, MAX_TEXT_CHARS)}...`
}

/**
 * Summarize a batch of messages into a combined summary.
 * Used when collapsing multiple adjacent messages at once.
 */
export function summarizeMessages(
  messages: Array<{ type: string; content?: unknown }>,
): string {
  const parts: string[] = []

  for (const msg of messages) {
    if (msg.type === 'user') {
      const text = extractTextFromUserMessage(msg)
      if (text) parts.push(summarizeText(text))
    }
  }

  if (parts.length === 0) return '[Collapsed messages]'

  return parts.join('\n\n')
}

function extractTextFromUserMessage(msg: {
  type: string
  content?: unknown
}): string {
  if (!msg.content) return ''
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((block: unknown) => {
        if (typeof block === 'string') return block
        if (
          block &&
          typeof block === 'object' &&
          'text' in (block as Record<string, unknown>)
        ) {
          return String((block as Record<string, unknown>).text)
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  return ''
}
