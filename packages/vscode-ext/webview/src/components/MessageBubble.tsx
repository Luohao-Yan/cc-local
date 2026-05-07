/**
 * Individual message bubble component
 */

import React, { useMemo, useState } from 'react'
import type { ChatMessage, ContentBlock, TextBlock, ToolUseBlock, ThinkingBlock, ErrorBlock } from '../types'
import { formatTimestamp } from '../utils/vscode-api'
import { MarkdownRenderer } from './MarkdownRenderer'
import { CodeBlock } from './CodeBlock'
import { ToolCard } from './ToolCard'
import { ThinkingBlockComponent } from './ThinkingBlock'
import { ErrorBlockComponent } from './ErrorBlock'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`message-bubble ${isUser ? 'user' : 'assistant'} ${message.status}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isUser && (
        <div className="message-avatar">
          <div className="avatar-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.1c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.15 5 4.01 5 7.41 0 2.08-.8 3.97-2.1 5.43z"/>
            </svg>
          </div>
        </div>
      )}

      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? 'You' : 'CCLocal'}</span>
          <span className="message-time">{formatTimestamp(message.timestamp)}</span>
          {message.status === 'streaming' && (
            <span className="message-status streaming">
              <span className="dot-pulse">●</span>
            </span>
          )}
        </div>

        <div className="message-body">
          {message.content.map((block, index) => (
            <ContentBlockRenderer
              key={`${message.id}-${index}`}
              block={block}
              messageId={message.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Content Block Renderer ────────────────────────────────────────────────────

interface ContentBlockRendererProps {
  block: ContentBlock
  messageId: string
}

function ContentBlockRenderer({ block, messageId }: ContentBlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlockComponent block={block} />

    case 'thinking':
      return <ThinkingBlockComponent block={block} messageId={messageId} />

    case 'tool_use':
      return <ToolCard block={block} />

    case 'tool_result':
      return (
        <div className="tool-result">
          <pre>{typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content, null, 2)}</pre>
        </div>
      )

    case 'error':
      return <ErrorBlockComponent block={block} />

    case 'image':
      return (
        <div className="image-block">
          <img
            src={`data:${block.source.media_type};base64,${block.source.data}`}
            alt="Attached image"
          />
        </div>
      )

    default:
      return null
  }
}

// ─── Text Block Component ─────────────────────────────────────────────────────

function TextBlockComponent({ block }: { block: TextBlock }) {
  // Detect if the text contains code blocks
  const hasCodeBlock = block.text.includes('```')

  if (hasCodeBlock) {
    return <MarkdownRenderer content={block.text} />
  }

  return (
    <div className="text-block">
      {block.text.split('\n').map((line, i) => (
        <p key={i}>{line || <br />}</p>
      ))}
    </div>
  )
}
