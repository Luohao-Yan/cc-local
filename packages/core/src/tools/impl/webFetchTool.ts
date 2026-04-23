import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface WebFetchInput {
  url: string
  prompt?: string
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export const webFetchTool: Tool = {
  name: 'WebFetch',
  description: 'Fetch a URL and return readable text content. Use for reading web pages and documentation.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch.',
      },
      prompt: {
        type: 'string',
        description: 'Optional instruction describing what to extract from the fetched page.',
      },
    },
    required: ['url'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { url, prompt } = input as WebFetchInput
    try {
      const response = await fetch(url, {
        signal: context.abortSignal,
        headers: {
          'User-Agent': 'cclocal-packages-cli/1.0',
          Accept: 'text/html,text/plain,application/json,*/*',
        },
      })
      const raw = await response.text()
      const contentType = response.headers.get('content-type') || ''
      const text = contentType.includes('text/html') ? htmlToText(raw) : raw.trim()
      const clipped = text.slice(0, 60_000)
      const prefix = [
        `URL: ${url}`,
        `Status: ${response.status} ${response.statusText}`,
        prompt ? `Prompt: ${prompt}` : undefined,
      ].filter(Boolean).join('\n')

      return {
        content: `${prefix}\n\n${clipped}${text.length > clipped.length ? '\n\n[Content truncated]' : ''}`,
        is_error: !response.ok,
      }
    } catch (error) {
      return {
        content: `Error fetching URL: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}

export const webFetchAliasTool: Tool = {
  ...webFetchTool,
  name: 'web_fetch',
}
