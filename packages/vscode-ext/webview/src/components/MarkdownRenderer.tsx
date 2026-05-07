/**
 * Markdown renderer with syntax highlighting
 */

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Memoize the markdown rendering
  const elements = useMemo(() => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ node, inline, className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const language = match ? match[1] : ''

            if (!inline && match) {
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, '')}
                  language={language}
                />
              )
            }

            // Inline code
            return (
              <code className={`inline-code ${codeClassName || ''}`} {...props}>
                {children}
              </code>
            )
          },

          // Pre blocks (fallback)
          pre({ children }) {
            return <div className="pre-wrapper">{children}</div>
          },

          // Links - open in external browser
          a({ href, children }) {
            return (
              <a
                href={href}
                onClick={(e) => {
                  e.preventDefault()
                  // In VS Code webview, we can't open external links directly
                  // The extension handles this
                }}
                className="markdown-link"
              >
                {children}
              </a>
            )
          },

          // Tables
          table({ children }) {
            return (
              <div className="table-wrapper">
                <table>{children}</table>
              </div>
            )
          },

          // Headings
          h1: Heading('h1'),
          h2: Heading('h2'),
          h3: Heading('h3'),
          h4: Heading('h4'),

          // Lists
          ul: List('ul'),
          ol: List('ol'),
          li: ListItem,

          // Blockquote
          blockquote({ children }) {
            return <blockquote className="blockquote">{children}</blockquote>
          },

          // Horizontal rule
          hr() {
            return <hr className="horizontal-rule" />
          },

          // Paragraph
          p({ children }) {
            return <p className="paragraph">{children}</p>
          },

          // Strong and emphasis
          strong({ children }) {
            return <strong className="strong">{children}</strong>
          },

          em({ children }) {
            return <em className="emphasis">{children}</em>
          },

          // Images
          img({ src, alt }) {
            return (
              <div className="markdown-image">
                <img src={src} alt={alt} />
              </div>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    )
  }, [content])

  return <div className={`markdown-renderer ${className || ''}`}>{elements}</div>
}

// ─── Helper Components ────────────────────────────────────────────────────────

function Heading(level: 'h1' | 'h2' | 'h3' | 'h4') {
  return function HeadingComponent({ children }) {
    return React.createElement(level, { className: `heading heading-${level}` }, children)
  }
}

function List(type: 'ul' | 'ol') {
  return function ListComponent({ children }) {
    return React.createElement(type, { className: `list ${type}` }, children)
  }
}

function ListItem({ children }) {
  return <li className="list-item">{children}</li>
}
