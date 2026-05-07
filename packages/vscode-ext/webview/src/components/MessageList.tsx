/**
 * Virtualized message list component
 */

import React, { useRef, useEffect, useCallback } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import { useChatStore } from '../store/useChatStore'
import type { ChatMessage } from '../types'
import { MessageBubble } from './MessageBubble'
import { EmptyState } from './EmptyState'

interface MessageListProps {
  messages: ChatMessage[]
}

// Estimate message height based on content
function estimateMessageHeight(message: ChatMessage): number {
  const baseHeight = 60
  let contentLength = 0

  message.content.forEach((block) => {
    if (block.type === 'text') {
      contentLength += block.text.length
    } else if (block.type === 'tool_use') {
      contentLength += 200 // Tool cards have fixed height
    } else if (block.type === 'thinking') {
      contentLength += block.isExpanded ? block.text.length : 50
    }
  })

  // Estimate: ~20px per 100 characters, minimum baseHeight
  return Math.max(baseHeight, baseHeight + Math.ceil(contentLength / 100) * 20)
}

export function MessageList({ messages }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)
  const autoScroll = useChatStore((state) => state.autoScroll)
  const setAutoScroll = useChatStore((state) => state.setAutoScroll)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messages.length > 0 && listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, 'end')
    }
  }, [messages.length, autoScroll])

  // Handle scroll events to detect user scrolling up
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100

    if (!isAtBottom && autoScroll) {
      setAutoScroll(false)
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true)
    }
  }, [autoScroll, setAutoScroll])

  // Calculate total height for non-virtualized fallback
  const totalHeight = messages.reduce((sum, msg) => sum + estimateMessageHeight(msg), 0)

  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const message = messages[index]
    return (
      <div style={style}>
        <MessageBubble message={message} />
      </div>
    )
  }, [messages])

  if (messages.length === 0) {
    return <EmptyState />
  }

  // Use virtualization for large lists
  const useVirtualization = messages.length > 50

  if (useVirtualization) {
    // Calculate dynamic item sizes
    const getItemSize = (index: number) => estimateMessageHeight(messages[index])

    return (
      <div
        ref={containerRef}
        className="message-list"
        onScroll={handleScroll}
      >
        <List
          ref={listRef}
          height={600}
          itemCount={messages.length}
          itemSize={getItemSize}
          width="100%"
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
    )
  }

  // Simple list for small message counts
  return (
    <div
      ref={containerRef}
      className="message-list"
      onScroll={handleScroll}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  )
}
