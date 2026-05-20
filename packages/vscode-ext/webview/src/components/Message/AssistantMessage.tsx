// @ts-nocheck — React Compiler output with untyped cache slots
import { useMemo, Fragment } from 'react'
import { marked, type Tokens } from 'marked'
import { CodeBlock } from '../CodeBlock'
import { ThinkingBlock } from '../Thinking'
import { ImageBlock } from '../Media'
import type { ContentBlock, ToolUseBlock } from '../../store/slices/messagesSlice'
import ToolCard from '../ToolUse/ToolCard'
import './AssistantMessage.css'

interface AssistantMessageProps {
  contentBlocks: ContentBlock[]
  isStreaming?: boolean
  messageId?: string
}

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
})

function AssistantMessage({ contentBlocks, isStreaming, messageId }: AssistantMessageProps) {
  return (
    <div className={`assistant-message ${isStreaming ? 'streaming' : ''}`}>
      {contentBlocks.length === 0 && isStreaming && (
        <div className="assistant-message-streaming-indicator">
          <span className="streaming-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </div>
      )}
      {contentBlocks.map((block, index) => (
        <div key={index} className="assistant-message-block">
          {block.type === 'text' && block.text && (
            <MarkdownContent text={block.text} />
          )}

          {block.type === 'tool_use' && (
            <ToolCard
              toolUse={block as ToolUseBlock}
              messageId={messageId}
              blockIndex={index}
            />
          )}

          {block.type === 'tool_result' && (
            <div className={`assistant-message-tool-result ${block.is_error ? 'error' : ''}`}>
              <pre>{block.content}</pre>
            </div>
          )}

          {block.type === 'thinking' && (
            <ThinkingBlock
              content={block.thinking}
              signature={undefined}
              collapsed={block.collapsed}
            />
          )}

          {block.type === 'image' && (
            <ImageBlock
              src={`data:${block.source.media_type};base64,${block.source.data}`}
              alt="Image"
            />
          )}
        </div>
      ))}
      {isStreaming && <span className="streaming-cursor">▎</span>}
    </div>
  )
}

// Markdown 内容渲染组件 — 完整内联渲染
function MarkdownContent({ text }: { text: string }) {
  const elements = useMemo(() => {
    try {
      const tokens = marked.lexer(text)
      return tokens.map((token, index) => renderBlockToken(token, index))
    } catch {
      return [<p key="error">{text}</p>]
    }
  }, [text])

  return <div className="markdown-content">{elements}</div>
}

// 渲染单个 block-level token
function renderBlockToken(token: Tokens.Token, index: number): React.ReactNode {
  switch (token.type) {
    case 'code':
      return (
        <CodeBlock
          key={index}
          code={token.text}
          language={token.lang || 'plaintext'}
          filename={token.lang?.includes(':') ? token.lang.split(':')[1] : undefined}
        />
      )

    case 'paragraph': {
      const p = token as Tokens.Paragraph
      return (
        <p key={index} className="markdown-paragraph">
          {renderInlineTokens(p.tokens)}
        </p>
      )
    }

    case 'heading': {
      const h = token as Tokens.Heading
      const HeadingTag = `h${h.depth}` as keyof JSX.IntrinsicElements
      return (
        <HeadingTag key={index} className="markdown-heading markdown-heading-{h.depth}">
          {renderInlineTokens(h.tokens)}
        </HeadingTag>
      )
    }

    case 'blockquote': {
      const bq = token as Tokens.Blockquote
      return (
        <blockquote key={index} className="markdown-blockquote">
          {bq.tokens.map((t, i) => renderBlockToken(t, i))}
        </blockquote>
      )
    }

    case 'list': {
      const list = token as Tokens.List
      const ListTag = list.ordered ? 'ol' : 'ul'
      return (
        <ListTag key={index} className="markdown-list">
          {list.items.map((item, i) => (
            <li key={i}>
              {item.tokens.map((t, ti) => {
                if (t.type === 'text') {
                  const textToken = t as Tokens.Text
                  return <Fragment key={ti}>{renderInlineTokens(textToken.tokens)}</Fragment>
                }
                return renderBlockToken(t, ti)
              })}
            </li>
          ))}
        </ListTag>
      )
    }

    case 'hr':
      return <hr key={index} className="markdown-hr" />

    case 'table': {
      const table = token as Tokens.Table
      return (
        <table key={index} className="markdown-table">
          <thead>
            <tr>
              {table.header.map((cell, i) => (
                <th key={i}>{renderInlineTokens(cell.tokens)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{renderInlineTokens(cell.tokens)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    case 'image':
      return <ImageBlock key={index} src={(token as Tokens.Image).href} alt={(token as Tokens.Image).text} />

    case 'space':
      return null

    default:
      if ('text' in token && typeof token.text === 'string') {
        return <div key={index}>{token.text}</div>
      }
      return null
  }
}

// 渲染内联 tokens — 完整实现
function renderInlineTokens(tokens: Tokens.Token[] | undefined): React.ReactNode {
  if (!tokens || tokens.length === 0) return null
  return <>{tokens.map((token, i) => renderInlineToken(token, i))}</>
}

function renderInlineToken(token: Tokens.Token, index: number): React.ReactNode {
  switch (token.type) {
    case 'text': {
      const t = token as Tokens.Text
      if (t.tokens && t.tokens.length > 0) {
        return <Fragment key={index}>{renderInlineTokens(t.tokens)}</Fragment>
      }
      return <span key={index}>{t.text}</span>
    }

    case 'strong': {
      const s = token as Tokens.Strong
      return <strong key={index}>{renderInlineTokens(s.tokens)}</strong>
    }

    case 'em': {
      const e = token as Tokens.Em
      return <em key={index}>{renderInlineTokens(e.tokens)}</em>
    }

    case 'codespan': {
      const c = token as Tokens.Codespan
      return <code key={index} className="markdown-inline-code">{c.text}</code>
    }

    case 'link': {
      const l = token as Tokens.Link
      return (
        <a key={index} href={l.href} className="markdown-link" target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
          {renderInlineTokens(l.tokens)}
        </a>
      )
    }

    case 'image': {
      const img = token as Tokens.Image
      return <ImageBlock key={index} src={img.href} alt={img.text} />
    }

    case 'del': {
      const d = token as Tokens.Del
      return <del key={index}>{renderInlineTokens(d.tokens)}</del>
    }

    case 'br':
      return <br key={index} />

    case 'escape': {
      const esc = token as Tokens.Escape
      return <span key={index}>{esc.text}</span>
    }

    default:
      if ('text' in token && typeof token.text === 'string') {
        return <span key={index}>{token.text}</span>
      }
      if ('raw' in token && typeof token.raw === 'string') {
        return <span key={index}>{token.raw}</span>
      }
      return null
  }
}

export default AssistantMessage