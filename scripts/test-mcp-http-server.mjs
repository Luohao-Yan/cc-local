#!/usr/bin/env bun

import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import * as z from 'zod/v4'

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1 || index === process.argv.length - 1) {
    return fallback
  }
  return process.argv[index + 1]
}

const port = Number(getArgValue('--port', '39081'))
const host = getArgValue('--host', '127.0.0.1')

function createServer() {
  const server = new McpServer({
    name: 'cclocal-test-http-server',
    version: '1.0.0',
  })

  server.registerTool(
    'greet',
    {
      description: 'Return a greeting for runtime MCP audit checks',
      inputSchema: {
        name: z.string().describe('Name to greet'),
      },
    },
    async ({ name }) => ({
      content: [{ type: 'text', text: `Hello, ${name}!` }],
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
    if (url.pathname !== '/mcp') {
      res.writeHead(404).end('Not found')
      return
    }

    if (req.method === 'POST') {
      const sessionId = req.headers['mcp-session-id']
      const body = await readJsonBody(req)

      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res, body)
        return
      }

      if (!sessionId && body && isInitializeRequest(body)) {
        let transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: initializedSessionId => {
            transports[initializedSessionId] = transport
          },
        })

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId]
          }
        }

        const mcpServer = createServer()
        await mcpServer.connect(transport)
        await transport.handleRequest(req, res, body)
        return
      }

      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        }),
      )
      return
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      const sessionId = req.headers['mcp-session-id']
      if (!sessionId || !transports[sessionId]) {
        res.writeHead(400).end('Invalid or missing session ID')
        return
      }
      await transports[sessionId].handleRequest(req, res)
      return
    }

    res.writeHead(405).end('Method not allowed')
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500).end(String(error))
    }
  }
})

server.listen(port, host, () => {
  process.stdout.write(`test-mcp-http-server listening on http://${host}:${port}/mcp\n`)
})

async function shutdown(signal) {
  process.stdout.write(`test-mcp-http-server shutting down on ${signal}\n`)
  for (const transport of Object.values(transports)) {
    await transport.close().catch(() => {})
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
