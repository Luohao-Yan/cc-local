/**
 * KSCC Proxy Server
 *
 * A simple proxy that allows cclocal to use kscc's API through the kscc CLI.
 * Since direct API calls to kscc's proxy are restricted, this proxy spawns
 * kscc processes to handle requests.
 */

import { spawn, ChildProcess } from 'child_process'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { URL } from 'url'

const KSCC_PATH = process.env.KSCC_PATH || 'kscc'
const PORT = process.env.KSCC_PROXY_PORT || 8765

interface MessageRequest {
  model: string
  max_tokens: number
  messages: Array<{ role: string; content: string | Array<any> }>
  stream?: boolean
  system?: string
}

interface KSCCResponse {
  content: string
  model: string
  stop_reason: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Call kscc with a prompt and return the response
 */
async function callKscc(request: MessageRequest): Promise<KSCCResponse> {
  return new Promise((resolve, reject) => {
    // Build the prompt from messages
    const messages = request.messages
    const lastMessage = messages[messages.length - 1]
    let prompt = ''

    if (typeof lastMessage.content === 'string') {
      prompt = lastMessage.content
    } else if (Array.isArray(lastMessage.content)) {
      // Extract text from content array
      for (const part of lastMessage.content) {
        if (part.type === 'text') {
          prompt = part.text
          break
        }
      }
    }

    // Add system prompt if provided
    if (request.system) {
      prompt = `<system>${request.system}</system>\n\n${prompt}`
    }

    // Add conversation history if multiple messages
    if (messages.length > 1) {
      const history = messages.slice(0, -1).map(m => {
        const role = m.role === 'assistant' ? 'Assistant' : 'User'
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        return `${role}: ${content}`
      }).join('\n\n')
      prompt = `${history}\n\nUser: ${prompt}`
    }

    const startTime = Date.now()

    // Spawn kscc process
    const proc: ChildProcess = spawn(KSCC_PATH, ['--print', '--model', request.model], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDECODE: '', // Clear to allow nested execution
      }
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    // Set timeout
    const timeout = setTimeout(() => {
      proc.kill()
      reject(new Error('KSCC request timeout'))
    }, 120000) // 2 minutes timeout

    proc.on('close', (code) => {
      clearTimeout(timeout)
      const elapsed = Date.now() - startTime

      if (code !== 0 && !stdout) {
        reject(new Error(`KSCC exited with code ${code}: ${stderr}`))
        return
      }

      resolve({
        content: stdout.trim(),
        model: request.model,
        stop_reason: 'end_turn',
        usage: {
          input_tokens: Math.ceil(prompt.length / 4), // Rough estimate
          output_tokens: Math.ceil(stdout.length / 4),
        }
      })
    })

    proc.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    // Write prompt to stdin
    proc.stdin?.write(prompt)
    proc.stdin?.end()
  })
}

/**
 * Handle Anthropic-compatible API request
 */
async function handleMessagesAPI(req: IncomingMessage, res: ServerResponse) {
  let body = ''

  req.on('data', (chunk) => {
    body += chunk.toString()
  })

  req.on('end', async () => {
    try {
      const request = JSON.parse(body) as MessageRequest

      console.log(`[KSCC Proxy] Request: model=${request.model}, messages=${request.messages.length}`)

      // For streaming requests, we'll handle them specially
      if (request.stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        })

        // For now, just call kscc and send as a single event
        // TODO: Implement proper streaming
        try {
          const response = await callKscc(request)
          const eventId = `event_${Date.now()}`

          // Send message_start event
          res.write(`event: message_start\ndata: ${JSON.stringify({
            type: 'message_start',
            message: {
              id: eventId,
              type: 'message',
              role: 'assistant',
              content: [{ type: 'text', text: response.content }],
              model: response.model,
              stop_reason: response.stop_reason,
              usage: response.usage,
            }
          })}\n\n`)

          // Send message_stop event
          res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`)
          res.end()
        } catch (err: any) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
          res.end()
        }
      } else {
        // Non-streaming request
        const response = await callKscc(request)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          id: `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: response.content }],
          model: response.model,
          stop_reason: response.stop_reason,
          usage: response.usage,
        }))
      }
    } catch (err: any) {
      console.error('[KSCC Proxy] Error:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })
}

/**
 * Handle models list request
 */
async function handleModelsAPI(req: IncomingMessage, res: ServerResponse) {
  // Return the models we know kscc supports
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    data: [
      { id: 'glm-5', object: 'model', created: Date.now(), owned_by: 'kscc' },
      { id: 'glm-5.1', object: 'model', created: Date.now(), owned_by: 'kscc' },
      { id: 'kimi-k2.5', object: 'model', created: Date.now(), owned_by: 'kscc' },
    ]
  }))
}

/**
 * Main request handler
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)

  console.log(`[KSCC Proxy] ${req.method} ${url.pathname}`)

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-beta')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/v1/models') {
    await handleModelsAPI(req, res)
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/messages') {
    await handleMessagesAPI(req, res)
    return
  }

  // Unknown endpoint
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
}

// Start server
const server = createServer(handleRequest)

server.listen(PORT, () => {
  console.log(`[KSCC Proxy] Server running on http://localhost:${PORT}`)
  console.log(`[KSCC Proxy] Endpoints:`)
  console.log(`  POST http://localhost:${PORT}/v1/messages`)
  console.log(`  GET  http://localhost:${PORT}/v1/models`)
  console.log(``)
  console.log(`[KSCC Proxy] To use with cclocal, set:`)
  console.log(`  ANTHROPIC_BASE_URL=http://localhost:${PORT}`)
  console.log(`  ANTHROPIC_API_KEY=any-key-works`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[KSCC Proxy] Shutting down...')
  server.close()
  process.exit(0)
})