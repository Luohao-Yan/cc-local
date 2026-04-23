#!/usr/bin/env bun

import http from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import * as z from 'zod/v4'

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1 || index === process.argv.length - 1) {
    return fallback
  }
  return process.argv[index + 1]
}

const port = Number(getArgValue('--port', '39082'))
const host = getArgValue('--host', '127.0.0.1')

function createServer() {
  const server = new McpServer({
    name: 'cclocal-test-sse-server',
    version: '1.0.0',
  })

  server.registerTool(
    'greet',
    {
      description: 'Return a greeting for SSE runtime MCP audit checks',
      inputSchema: {
        name: z.string().describe('Name to greet'),
      },
    },
    async ({ name }) => ({
      content: [{ type: 'text', text: `Hello from SSE, ${name}!` }],
    }),
  )

  return server
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (chunks.length === 0) {
    return undefined
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const transports = {}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`)

    if (req.method === 'GET' && url.pathname === '/mcp') {
      const transport = new SSEServerTransport('/messages', res)
      const sessionId = transport.sessionId
      transports[sessionId] = transport
      transport.onclose = () => {
        delete transports[sessionId]
      }
      const mcpServer = createServer()
      await mcpServer.connect(transport)
      return
    }

    if (req.method === 'POST' && url.pathname === '/messages') {
      const sessionId = url.searchParams.get('sessionId')
      if (!sessionId || !transports[sessionId]) {
        res.writeHead(404).end('Session not found')
        return
      }
      const body = await readJsonBody(req)
      await transports[sessionId].handlePostMessage(req, res, body)
      return
    }

    res.writeHead(404).end('Not found')
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500).end(String(error))
    }
  }
})

server.listen(port, host, () => {
  process.stdout.write(`test-mcp-sse-server listening on http://${host}:${port}/mcp\n`)
})

async function shutdown(signal) {
  process.stdout.write(`test-mcp-sse-server shutting down on ${signal}\n`)
  for (const transport of Object.values(transports)) {
    await transport.close().catch(() => {})
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
