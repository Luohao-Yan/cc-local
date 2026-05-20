/**
 * WebSearch Tool - Multi-backend web search
 *
 * Supports two backends:
 * 1. **Anthropic server-side** (default when using first-party API):
 *    Uses the `web_search_20250305` server-side tool which offloads
 *    search to Anthropic's infrastructure. Returns structured results
 *    with title/url pairs, supports domain filtering.
 *
 * 2. **DuckDuckGo HTML** (fallback for third-party APIs):
 *    Scrapes DuckduckGo's HTML endpoint and parses results.
 *    Less reliable but works with any API provider.
 *
 * The backend is auto-detected based on apiFormat and baseUrl:
 * - Anthropic first-party API → server-side search
 * - Vertex/Foundry → server-side search
 * - All others → DuckDuckGo fallback
 *
 * Environment overrides:
 * - CCLOCAL_SEARCH_BACKEND=anthropic|duckduckgo  (force a backend)
 * - CCLOCAL_SEARCH_DISABLE=1  (disable WebSearch entirely)
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

export interface WebSearchInput {
  query: string
  max_results?: number
  allowed_domains?: string[]
  blocked_domains?: string[]
}

// ---- DuckDuckGo Backend ----

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

function extractDdgResults(html: string, maxResults: number): Array<{ title: string; url: string; snippet: string }> {
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
      if (uddg) url = decodeURIComponent(uddg)
    } catch {
      // Keep raw URL
    }
    if (title && url) {
      results.push({ title, url, snippet })
    }
    if (results.length >= maxResults) break
  }

  return results
}

async function searchDdg(query: string, maxResults: number, signal?: AbortSignal): Promise<ToolResult> {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; cclocal/1.0)',
        Accept: 'text/html,*/*',
      },
    })
    const html = await response.text()
    const results = extractDdgResults(html, maxResults)

    if (results.length === 0) {
      return {
        content: `No search results found for "${query}".`,
        is_error: !response.ok,
      }
    }

    return {
      content: results
        .map((r, i) => [
          `${i + 1}. ${r.title}`,
          `   URL: ${r.url}`,
          r.snippet ? `   ${r.snippet}` : undefined,
        ].filter(Boolean).join('\n'))
        .join('\n\n'),
      is_error: !response.ok,
    }
  } catch (error) {
    return {
      content: `DuckDuckGo search error: ${error instanceof Error ? error.message : String(error)}`,
      is_error: true,
    }
  }
}

// ---- Anthropic Server-Side Backend ----

interface ServerSearchResult {
  tool_use_id: string
  content: Array<{ title: string; url: string }>
}

/**
 * Perform server-side web search using Anthropic's web_search tool.
 * This sends a query to the Anthropic API which runs the search
 * server-side and returns structured results.
 */
async function searchAnthropicServer(
  query: string,
  maxResults: number,
  context: ToolContext,
  allowedDomains?: string[],
  blockedDomains?: string[],
): Promise<ToolResult> {
  // Build the server tool definition
  const searchTool = {
    type: 'web_search_20250305' as const,
    name: 'web_search',
    max_uses: Math.min(maxResults, 8),
    ...(allowedDomains?.length ? { allowed_domains: allowedDomains } : {}),
    ...(blockedDomains?.length ? { blocked_domains: blockedDomains } : {}),
  }

  // Build a minimal query to invoke the server-side tool
  const messages = [
    {
      role: 'user' as const,
      content: `Search the web for: ${query}`,
    },
  ]

  try {
    const { Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({
      apiKey: context.apiKey,
      ...(context.baseUrl ? { baseURL: context.baseUrl } : {}),
      ...(context.headers ? { defaultHeaders: context.headers } : {}),
      ...(context.fetch ? { fetch: context.fetch } : {}),
    })

    const response = await client.beta.messages.create({
      model: context.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      betas: ['web-search-2025-03-05'],
      tools: [searchTool],
      messages,
      system: 'You are a search assistant. Use the web_search tool to find results.',
    })

    // Extract search results from the response content blocks
    const results: Array<{ title: string; url: string }> = []
    const textParts: string[] = []

    for (const block of response.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const hit of block.content) {
          if ('title' in hit && 'url' in hit) {
            results.push({ title: (hit as any).title, url: (hit as any).url })
          }
        }
      } else if (block.type === 'text') {
        textParts.push(block.text)
      }
    }

    if (results.length === 0 && textParts.length > 0) {
      // Fallback: model described results in text
      return { content: textParts.join('\n') }
    }

    if (results.length === 0) {
      return { content: `No search results found for "${query}".` }
    }

    return {
      content: results
        .slice(0, maxResults)
        .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}`)
        .join('\n\n'),
    }
  } catch (error) {
    // If the server-side tool fails, fall back to DuckDuckGo
    return searchDdg(query, maxResults, context.abortSignal)
  }
}

// ---- Backend Detection ----

type SearchBackend = 'anthropic' | 'duckduckgo'

function detectBackend(context: ToolContext): SearchBackend {
  // Environment override
  const envBackend = process.env.CCLOCAL_SEARCH_BACKEND
  if (envBackend === 'anthropic') return 'anthropic'
  if (envBackend === 'duckduckgo') return 'duckduckgo'

  // Disabled entirely?
  if (process.env.CCLOCAL_SEARCH_DISABLE === '1' || process.env.CCLOCAL_SEARCH_DISABLE?.toLowerCase() === 'true') {
    return 'duckduckgo' // still provide basic search, just not server-side
  }

  // Auto-detect based on API config
  // Anthropic first-party or Vertex/Foundry use server-side search
  if (context.apiFormat === 'anthropic') {
    // Check if using Anthropic first-party API (not a custom baseUrl)
    const baseUrl = context.baseUrl || ''
    const isAnthropicDirect = !baseUrl || baseUrl.includes('anthropic.com') || baseUrl.includes('api.anthropic.com')
    if (isAnthropicDirect) return 'anthropic'
  }

  // Default to DuckDuckGo for third-party APIs
  return 'duckduckgo'
}

// ---- Tool Implementation ----

export const webSearchTool: Tool = {
  name: 'WebSearch',
  description:
    'Search the web for current information. Returns a list of results with titles, URLs, and snippets. Supports domain filtering when using the Anthropic API backend.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query.',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (1-10, default 5).',
      },
      allowed_domains: {
        type: 'array',
        items: { type: 'string' },
        description: 'Only include results from these domains (Anthropic backend only).',
      },
      blocked_domains: {
        type: 'array',
        items: { type: 'string' },
        description: 'Never include results from these domains (Anthropic backend only).',
      },
    },
    required: ['query'],
  },

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const { query, max_results = 5, allowed_domains, blocked_domains } = input as WebSearchInput
    const maxResults = Math.max(1, Math.min(10, max_results))

    if (allowed_domains?.length && blocked_domains?.length) {
      return {
        content: 'Error: Cannot specify both allowed_domains and blocked_domains.',
        is_error: true,
      }
    }

    const backend = detectBackend(context)

    if (backend === 'anthropic') {
      return searchAnthropicServer(query, maxResults, context, allowed_domains, blocked_domains)
    }

    return searchDdg(query, maxResults, context.abortSignal)
  },
}

export const webSearchAliasTool: Tool = {
  ...webSearchTool,
  name: 'web_search',
}
