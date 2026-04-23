import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface WebSearchInput {
  query: string
  max_results?: number
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractResults(html: string, maxResults: number): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = []
  const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(resultRegex)) {
    const rawUrl = decodeHtml(match[1] || '')
    const title = decodeHtml((match[2] || '').replace(/<[^>]+>/g, ' '))
    const snippet = decodeHtml((match[3] || '').replace(/<[^>]+>/g, ' '))
    let url = rawUrl
    try {
      const parsed = new URL(rawUrl)
      const uddg = parsed.searchParams.get('uddg')
      if (uddg) {
        url = decodeURIComponent(uddg)
      }
    } catch {
      // Keep raw URL when DuckDuckGo returns a direct href.
    }
    if (title && url) {
      results.push({ title, url, snippet })
    }
    if (results.length >= maxResults) {
      break
    }
  }

  return results
}

export const webSearchTool: Tool = {
  name: 'WebSearch',
  description: 'Search the web and return a short list of result titles, URLs, and snippets.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query.',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return.',
      },
    },
    required: ['query'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { query, max_results = 5 } = input as WebSearchInput
    const maxResults = Math.max(1, Math.min(10, max_results))
    try {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const response = await fetch(url, {
        signal: context.abortSignal,
        headers: {
          'User-Agent': 'cclocal-packages-cli/1.0',
          Accept: 'text/html,*/*',
        },
      })
      const html = await response.text()
      const results = extractResults(html, maxResults)
      if (results.length === 0) {
        return {
          content: `No search results found for "${query}".`,
          is_error: !response.ok,
        }
      }

      return {
        content: results
          .map((result, index) => [
            `${index + 1}. ${result.title}`,
            `   URL: ${result.url}`,
            result.snippet ? `   Snippet: ${result.snippet}` : undefined,
          ].filter(Boolean).join('\n'))
          .join('\n\n'),
        is_error: !response.ok,
      }
    } catch (error) {
      return {
        content: `Error searching web: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  },
}

export const webSearchAliasTool: Tool = {
  ...webSearchTool,
  name: 'web_search',
}
