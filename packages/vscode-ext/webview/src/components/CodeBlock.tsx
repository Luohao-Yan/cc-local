/**
 * Syntax highlighted code block component
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import hljs from 'highlight.js'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  collapsible?: boolean
}

export function CodeBlock({
  code,
  language = 'plaintext',
  filename,
  showLineNumbers = false,
  collapsible = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(collapsible && code.split('\n').length > 20)
  const codeRef = useRef<HTMLElement>(null)

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current) {
      // Clear previous highlighting
      codeRef.current.innerHTML = escapeHtml(code)

      // Apply highlighting if language is supported
      try {
        if (language && hljs.getLanguage(language)) {
          const highlighted = hljs.highlight(code, { language }).value
          codeRef.current.innerHTML = highlighted
        } else {
          // Auto-detect language
          const highlighted = hljs.highlightAuto(code).value
          codeRef.current.innerHTML = highlighted
        }
      } catch {
        codeRef.current.textContent = code
      }
    }
  }, [code, language])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [code])

  // Toggle collapse
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev)
  }, [])

  const lines = code.split('\n')
  const lineCount = lines.length
  const maxLines = isCollapsed ? 20 : lineCount
  const displayCode = isCollapsed ? lines.slice(0, 20).join('\n') + '\n...' : code

  return (
    <div className={`code-block ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="code-header">
        <div className="code-info">
          {filename && <span className="code-filename">{filename}</span>}
          <span className="code-language">{language}</span>
        </div>
        <div className="code-actions">
          {collapsible && lineCount > 20 && (
            <button
              className="code-action-btn"
              onClick={handleToggleCollapse}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          )}
          <button
            className="code-action-btn"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>
      </div>

      <div className="code-content">
        {showLineNumbers && (
          <div className="line-numbers">
            {lines.slice(0, maxLines).map((_, i) => (
              <span key={i + 1} className="line-number">
                {isCollapsed && i === 19 ? '...' : i + 1}
              </span>
            ))}
          </div>
        )}

        <pre className="code-pre">
          <code ref={codeRef} className={`hljs language-${language}`}>
            {displayCode}
          </code>
        </pre>
      </div>

      {isCollapsed && (
        <button className="show-more-btn" onClick={handleToggleCollapse}>
          Show {lineCount - 20} more lines
        </button>
      )}
    </div>
  )
}

// ─── Inline Code ───────────────────────────────────────────────────────────────

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="inline-code">{children}</code>
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)
}
