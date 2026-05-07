/**
 * Thinking block component with collapsible content
 */

import React, { useState, useCallback } from 'react'
import type { ThinkingBlock as ThinkingBlockType } from '../types'

interface ThinkingBlockProps {
  block: ThinkingBlockType
  messageId: string
}

export function ThinkingBlockComponent({ block, messageId }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(block.isExpanded)

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Count words/tokens approximately
  const wordCount = block.text.split(/\s+/).length
  const tokenEstimate = Math.ceil(wordCount * 1.3) // Rough token estimate

  return (
    <div className={`thinking-block ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="thinking-header" onClick={toggleExpand}>
        <div className="thinking-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
        <span className="thinking-label">Thinking</span>
        {!isExpanded && (
          <span className="thinking-summary">
            ~{tokenEstimate} tokens
          </span>
        )}
        <button className="thinking-toggle">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="thinking-content">
          {block.text.split('\n').map((line, i) => (
            <p key={i}>{line || <br />}</p>
          ))}
        </div>
      )}
    </div>
  )
}
