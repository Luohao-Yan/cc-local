/**
 * REPL 交互式界面 - Ink 版本
 */

import React, { useState, useCallback } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import type { CCLocalClient } from '../client/CCLocalClient.js'
import type { StreamEvent } from '@cclocal/shared'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ReplProps {
  client: CCLocalClient
}

export function Repl({ client }: ReplProps): JSX.Element {
  const { exit } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'running'>('idle')
  const [currentResponse, setCurrentResponse] = useState('')

  // 处理服务端消息
  React.useEffect(() => {
    const handleMessage = (event: StreamEvent) => {
      switch (event.type) {
        case 'stream_start':
          setStatus('running')
          setCurrentResponse('')
          break
        case 'stream_delta':
          if (event.delta?.type === 'text' && event.delta.text) {
            setCurrentResponse((prev) => prev + event.delta!.text)
          }
          break
        case 'stream_end':
          setMessages((prev) => [
            ...prev,
            {
              id: event.messageId,
              role: 'assistant',
              content: currentResponse,
            },
          ])
          setStatus('idle')
          setCurrentResponse('')
          break
        case 'error':
          setStatus('idle')
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `Error: ${event.error || 'Unknown error'}`,
            },
          ])
          break
      }
    }

    client.onMessage(handleMessage)
    return () => client.removeMessageHandler(handleMessage)
  }, [client, currentResponse])

  useInput((value, key) => {
    if (key.return) {
      if (input.trim()) {
        // 发送用户消息
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'user', content: input.trim() },
        ])
        client.sendMessage(input.trim())
        setInput('')
      }
    } else if (key.escape || (key.ctrl && key.code === 'c')) {
      if (status === 'running') {
        client.cancelGeneration()
      } else {
        exit()
      }
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1))
    } else if (value) {
      setInput((prev) => prev + value)
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ╔══════════════════════════════════════════╗
        ║         CCLocal Interactive REPL         ║
        ╚══════════════════════════════════════════╝
      </Text>

      <Box flexDirection="column" marginY={1}>
        {messages.map((msg) => (
          <Box key={msg.id} marginY={0.5}>
            {msg.role === 'user' ? (
              <Text color="yellow">You: {msg.content}</Text>
            ) : (
              <Text color="green">CCLocal: {msg.content}</Text>
            )}
          </Box>
        ))}

        {status === 'running' && currentResponse && (
          <Box marginY={0.5}>
            <Text color="green">
              CCLocal: {currentResponse}
              <Text color="gray">▌</Text>
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="blue">{'>'} </Text>
        <Text>{input}</Text>
        {status === 'idle' && <Text color="gray">▌</Text>}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {status === 'running' ? 'Generating... (ESC to cancel)' : 'Type your message and press Enter'}
        </Text>
      </Box>
    </Box>
  )
}
