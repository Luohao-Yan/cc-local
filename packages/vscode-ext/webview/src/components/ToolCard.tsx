/**
 * Tool use visualization card
 */

import React, { useState, useCallback } from 'react'
import type { ToolUseBlock } from '../types'

interface ToolCardProps {
  block: ToolUseBlock
}

// ─── Tool Icons ────────────────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, React.ReactNode> = {
  Bash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v12h16V6H4zm2 2h4v2H6V8zm0 4h4v2H6v-2zm6-4h6v2h-6V8zm0 4h6v2h-6v-2z"/>
    </svg>
  ),
  Read: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
    </svg>
  ),
  Edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  ),
  Write: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16h14V5c0-1.1-.9-2-2-2zm0 16H7V5h10v14zm-8-8h6v2H9v-2zm0 4h6v2H9v-2z"/>
    </svg>
  ),
  Glob: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z"/>
    </svg>
  ),
  Grep: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  ),
  WebFetch: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.1c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.15 5 4.01 5 7.41 0 2.08-.8 3.97-2.1 5.43z"/>
    </svg>
  ),
  WebSearch: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.3-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.86-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  Agent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  ),
  default: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  ),
}

// ─── Tool Category Colors ──────────────────────────────────────────────────────

const TOOL_COLORS: Record<string, string> = {
  Bash: 'var(--tool-bash, #89b4fa)',
  Read: 'var(--tool-read, #a6e3a1)',
  Edit: 'var(--tool-edit, #f9e2af)',
  Write: 'var(--tool-write, #fab387)',
  Glob: 'var(--tool-glob, #cba6f7)',
  Grep: 'var(--tool-grep, #94e2d5)',
  WebFetch: 'var(--tool-web, #f5c2e7)',
  WebSearch: 'var(--tool-web, #f5c2e7)',
  Agent: 'var(--tool-agent, #74c7ec)',
}

export function ToolCard({ block }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const toggleResult = useCallback(() => {
    setShowResult((prev) => !prev)
  }, [])

  const icon = TOOL_ICONS[block.name] || TOOL_ICONS.default
  const color = TOOL_COLORS[block.name] || 'var(--fg-dim)'

  // Truncate input for display
  const inputPreview = useMemo(() => {
    const input = block.input as Record<string, unknown>
    if (!input) return ''

    // Create a short preview
    const entries = Object.entries(input)
    if (entries.length === 0) return '{}'

    const preview = entries
      .slice(0, 2)
      .map(([key, value]) => {
        const strValue = typeof value === 'string'
          ? value.length > 30 ? value.slice(0, 30) + '...' : value
          : JSON.stringify(value).slice(0, 30)
        return `${key}: ${strValue}`
      })
      .join(', ')

    return entries.length > 2 ? `${preview}, ...` : preview
  }, [block.input])

  return (
    <div className={`tool-card ${block.status}`}>
      <div className="tool-header" onClick={toggleExpand}>
        <div className="tool-icon" style={{ color }}>
          {icon}
        </div>
        <div className="tool-info">
          <span className="tool-name">{block.name}</span>
          <span className="tool-preview">{inputPreview}</span>
        </div>
        <div className="tool-status">
          <StatusBadge status={block.status} />
        </div>
        <button className="tool-expand-btn">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="tool-body">
          <div className="tool-section">
            <h4>Input</h4>
            <pre className="tool-input">
              {JSON.stringify(block.input, null, 2)}
            </pre>
          </div>

          {block.result !== undefined && (
            <div className="tool-section">
              <h4>
                Result
                <button className="toggle-result-btn" onClick={toggleResult}>
                  {showResult ? 'Hide' : 'Show'}
                </button>
              </h4>
              {showResult && (
                <pre className="tool-result">
                  {typeof block.result === 'string'
                    ? block.result
                    : JSON.stringify(block.result, null, 2)}
                </pre>
              )}
            </div>
          )}

          {block.error && (
            <div className="tool-section error">
              <h4>Error</h4>
              <pre className="tool-error">{block.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ToolUseBlock['status'] }) {
  const statusConfig = {
    pending: { icon: '○', label: 'Pending', className: 'pending' },
    running: { icon: '◐', label: 'Running', className: 'running' },
    complete: { icon: '●', label: 'Complete', className: 'complete' },
    error: { icon: '✕', label: 'Error', className: 'error' },
  }

  const config = statusConfig[status]

  return (
    <span className={`status-badge ${config.className}`} title={config.label}>
      <span className="status-icon">{config.icon}</span>
    </span>
  )
}
