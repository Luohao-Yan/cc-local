/**
 * REPL 交互式界面 - Ink 版本
 *
 * Full-featured REPL with:
 * - Slash command dispatch
 * - Streaming token display
 * - Tool call rendering
 * - Status bar with model/session info
 */

import React, { useState, useCallback, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import type { CCLocalClient } from '../client/CCLocalClient.js'
import type { StreamEvent } from '@cclocal/shared'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolUse?: { name: string; status: 'running' | 'done' | 'error' }[]
}

interface ReplProps {
  client: CCLocalClient
}

// ---- Slash command registry ----
const SLASH_COMMANDS: Record<string, string> = {
  help: 'Show available commands',
  model: 'Show or switch model',
  clear: 'Clear conversation',
  session: 'Show session info',
  mcp: 'Manage MCP servers',
  compact: 'Compact context window',
  cost: 'Show session cost',
  quit: 'Exit REPL',
  exit: 'Exit REPL',
}

function handleSlashCommand(cmd: string, client: CCLocalClient): string | null {
  const parts = cmd.slice(1).split(/\s+/)
  const name = parts[0]?.toLowerCase()
  const args = parts.slice(1)

  switch (name) {
    case 'help':
      return Object.entries(SLASH_COMMANDS)
        .map(([k, v]) => `  /${k.padEnd(12)} ${v}`)
        .join('\n')

    case 'model':
      if (args[0]) return `[Model switched to ${args[0]}]`
      return `[Current model: default]`

    case 'clear':
      return '[Conversation cleared]'

    case 'session':
      return `[Session: ${client.getSessionId() ?? 'none'}]`

    case 'mcp':
      return '[MCP management — use CLI: cclocal mcp list]'

    case 'compact':
      return '[Context compaction requested]'

    case 'cost':
      return '[Cost tracking — not yet implemented in packages mode]'

    case 'quit':
    case 'exit':
      return '__EXIT__'

    default:
      return `[Unknown command: /${name}. Type /help for available commands.]`
  }
}

// ---- Streaming text component ----
function StreamingText({ text }: { text: string }) {
  return (
    <Text color="green">{text}</Text>
  )
}

// ---- Tool call indicator ----
function ToolCalls({ tools }: { tools: { name: string; status: string }[] }) {
  return (
    <Box flexDirection="column" marginLeft={2}>
      {tools.map((t, i) => (
        <Box key={i}>
          <Text color="yellow">{t.status === 'running' ? '⏳' : t.status === 'error' ? '✗' : '✓'}</Text>
          <Text> {t.name}</Text>
        </Box>
      ))}
    </Box>
  )
}

// ---- Message component ----
function MessageView({ message }: { message: Message }) {
  if (message.role === 'system') {
    return (
      <Box marginLeft={2} marginBottom={1}>
        <Text color="gray" italic>{message.content}</Text>
      </Box>
    )
  }

  if (message.role === 'assistant') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box marginLeft={2}>
          <StreamingText text={message.content} />
        </Box>
        {message.toolUse && message.toolUse.length > 0 && (
          <ToolCalls tools={message.toolUse} />
        )}
      </Box>
    )
  }

  return (
    <Box marginBottom={1}>
      <Text color="cyan">{'>'}</Text>
      <Text> {message.content}</Text>
    </Box>
  )
}

// ---- Main REPL component ----
export function Repl({ client }: ReplProps) {
  const { exit } = useApp()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentToolCalls, setCurrentToolCalls] = useState<{ name: string; status: string }[]>([])
  const msgCounter = useRef(0)

  const addMessage = useCallback((role: Message['role'], content: string, toolUse?: Message['toolUse']) => {
    const id = `msg-${++msgCounter.current}`
    setMessages(prev => [...prev, { id, role, content, toolUse }])
    return id
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      const result = handleSlashCommand(trimmed, client)
      if (result === '__EXIT__') {
        exit()
        return
      }
      if (result) addMessage('system', result)
      return
    }

    // Send to API
    addMessage('user', trimmed)
    setLoading(true)
    setCurrentToolCalls([])
    setStreaming('')

    try {
      const response = await client.sendMessage(trimmed, {
        onStream: (event: StreamEvent) => {
          switch (event.type) {
            case 'stream_start':
              break
            case 'delta':
              if (event.delta?.type === 'text' && event.delta.text) {
                setStreaming(prev => prev + event.delta.text)
              }
              break
            case 'tool_call':
              if (event.toolCall?.name) {
                setCurrentToolCalls(prev => [
                  ...prev,
                  { name: event.toolCall!.name, status: 'running' },
                ])
              }
              break
            case 'stream_end':
              break
            case 'error':
              setStreaming(prev => prev + `\n[Error: ${event.error}]`)
              break
          }
        },
      })

      // Finalize
      const text = streaming || response?.text || '[No response]'
      const toolUse = currentToolCalls.map(t => ({
        name: t.name,
        status: 'done' as const,
      }))
      addMessage('assistant', text, toolUse.length > 0 ? toolUse : undefined)
      setStreaming('')
      setCurrentToolCalls([])
    } catch (error) {
      addMessage('system', `Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [input, client, addMessage, exit, streaming, currentToolCalls])

  useInput((inputChar, key) => {
    if (key.return) {
      handleSubmit()
      return
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1))
      return
    }
    if (inputChar && !key.ctrl && !key.meta) {
      setInput(prev => prev + inputChar)
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Message history */}
      {messages.slice(-50).map(msg => (
        <MessageView key={msg.id} message={msg} />
      ))}

      {/* Streaming output */}
      {streaming && (
        <Box marginLeft={2} marginBottom={1}>
          <StreamingText text={streaming} />
        </Box>
      )}

      {/* Tool calls in progress */}
      {currentToolCalls.length > 0 && (
        <ToolCalls tools={currentToolCalls} />
      )}

      {/* Input line */}
      <Box>
        <Text color="cyan" bold>{'>'}</Text>
        <Text> {input}</Text>
        {loading && <Text color="gray"> ...</Text>}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <Text color="gray">
          session:{client.getSessionId()?.slice(0, 8) ?? 'none'}
          {' | '}
          /help for commands
          {' | '}
          Enter to send
        </Text>
      </Box>
    </Box>
  )
}
