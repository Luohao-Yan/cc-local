import { useState, useCallback } from 'react'
import './ThinkingBlock.css'

interface ThinkingBlockProps {
  content: string
  signature?: string
  collapsed?: boolean
  defaultExpanded?: boolean
}

function ThinkingBlock({ content, signature, collapsed, defaultExpanded }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  // 计算摘要（前几行）
  const summary = content.split('\n').slice(0, 2).join(' ').slice(0, 100)

  // 如果外部控制 collapsed 且 collapsed=true，强制收起
  const isExpanded = collapsed ? false : expanded

  return (
    <div className="thinking-block">
      <div
        className={`thinking-block-header ${isExpanded ? 'expanded' : ''}`}
        onClick={toggleExpanded}
      >
        <span className="thinking-block-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="thinking-block-title">Thinking</span>
        {!isExpanded && summary && (
          <span className="thinking-block-summary">{summary}…</span>
        )}
      </div>

      <div className={`thinking-block-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="thinking-block-content-inner">
          {content}
        </div>
        {signature && (
          <div className="thinking-block-signature">
            sig: {signature.slice(0, 16)}…
          </div>
        )}
      </div>
    </div>
  )
}

export default ThinkingBlock
