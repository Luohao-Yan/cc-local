// @ts-nocheck — React Compiler output with untyped cache slots
import { useMemo, useCallback, Fragment, type ReactNode } from 'react'
import { marked, type Tokens } from 'marked'
import { CodeBlock, SimpleCodeBlock } from '../CodeBlock'
import './MarkdownRenderer.css'

interface MarkdownRendererProps {
  content: string
  onLinkClick?: (href: string) => void
}

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
})

// 自定义渲染器
const createRenderer = (onLinkClick?: (href: string) => void) => {
  const renderer = new marked.Renderer()

  // 代码块渲染
  renderer.code = (token: Tokens.Code): string => {
    const { text, lang } = token
    return `<div class="markdown-code-block" data-lang="${lang || 'plaintext'}">${escapeHtml(text)}</div>`
  }

  // 行内代码渲染
  renderer.codespan = (token: Tokens.Codespan): string => {
    return `<code class="markdown-inline-code">${escapeHtml(token.text)}</code>`
  }

  // 链接渲染
  renderer.link = (token: Tokens.Link): string => {
    const { href, text } = token
    const isExternal = href.startsWith('http://') || href.startsWith('https://')
    return `<a href="${escapeHtml(href)}" class="markdown-link" data-external="${isExternal}" target="${isExternal ? '_blank' : '_self'}">${text}</a>`
  }

  // 图片渲染
  renderer.image = (token: Tokens.Image): string => {
    const { href, text } = token
    return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text || '')}" class="markdown-image" loading="lazy" />`
  }

  // 表格渲染
  renderer.table = (token: Tokens.Table): string => {
    const header = token.header.map(cell => `<th>${cell.text}</th>`).join('')
    const rows = token.rows
      .map(row => `<tr>${row.map(cell => `<td>${cell.text}</td>`).join('')}</tr>`)
      .join('')
    return `<table class="markdown-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`
  }

  // 列表渲染
  renderer.list = (token: Tokens.List): string => {
    const tag = token.ordered ? 'ol' : 'ul'
    const items = token.items.map(item => `<li>${item.text}</li>`).join('')
    return `<${tag} class="markdown-list">${items}</${tag}>`
  }

  // 标题渲染
  renderer.heading = (token: Tokens.Heading): string => {
    return `<h${token.depth} class="markdown-heading markdown-heading-${token.depth}">${token.text}</h${token.depth}>`
  }

  // 引用渲染
  renderer.blockquote = (token: Tokens.Blockquote): string => {
    return `<blockquote class="markdown-blockquote">${token.text}</blockquote>`
  }

  // 段落渲染
  renderer.paragraph = (token: Tokens.Paragraph): string => {
    return `<p class="markdown-paragraph">${token.text}</p>`
  }

  // 分割线渲染
  renderer.hr = (): string => {
    return `<hr class="markdown-hr" />`
  }

  return renderer
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function MarkdownRenderer({ content, onLinkClick }: MarkdownRendererProps) {
  const html = useMemo(() => {
    const renderer = createRenderer(onLinkClick)
    try {
      return marked.parse(content, { renderer }) as string
    } catch (error) {
      console.error('Markdown parse error:', error)
      return `<p class="markdown-error">${escapeHtml(content)}</p>`
    }
  }, [content, onLinkClick])

  const handleHtmlClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('markdown-link') && onLinkClick) {
        e.preventDefault()
        const href = target.getAttribute('href')
        if (href) {
          onLinkClick(href)
        }
      }
    },
    [onLinkClick]
  )

  return (
    <div
      className="markdown-renderer"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleHtmlClick}
    />
  )
}

export default MarkdownRenderer

// ─────────────────────────────────────────────────────────────────────────────
// Markdown 渲染器（返回 React 组件而非 HTML）—— 完整内联渲染
// ─────────────────────────────────────────────────────────────────────────────

interface MarkdownBlockProps {
  content: string
  onLinkClick?: (href: string) => void
}

export function MarkdownBlock({ content, onLinkClick }: MarkdownBlockProps) {
  const tokens = useMemo(() => {
    try {
      return marked.lexer(content)
    } catch {
      return []
    }
  }, [content])

  return (
    <div className="markdown-block">
      {tokens.map((token, index) => renderBlockToken(token, index, onLinkClick))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Block-level token rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderBlockToken(
  token: Tokens.Token,
  index: number,
  onLinkClick?: (href: string) => void,
): ReactNode {
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
          {renderInlineTokens(p.tokens, onLinkClick)}
        </p>
      )
    }

    case 'heading': {
      const h = token as Tokens.Heading
      const HeadingTag = `h${h.depth}` as keyof JSX.IntrinsicElements
      return (
        <HeadingTag key={index} className="markdown-heading markdown-heading-{h.depth}">
          {renderInlineTokens(h.tokens, onLinkClick)}
        </HeadingTag>
      )
    }

    case 'blockquote': {
      const bq = token as Tokens.Blockquote
      return (
        <blockquote key={index} className="markdown-blockquote">
          {bq.tokens.map((t, i) => renderBlockToken(t, i, onLinkClick))}
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
                // List items contain a 'text' sub-token for inline content
                // and possibly a 'list' sub-token for nested lists
                if (t.type === 'text') {
                  const textToken = t as Tokens.Text
                  // In marked v18, the text token has a `tokens` array for inlines
                  return renderInlineTokens(textToken.tokens, onLinkClick)
                }
                return renderBlockToken(t, ti, onLinkClick)
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
                <th key={i}>{renderInlineTokens(cell.tokens, onLinkClick)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{renderInlineTokens(cell.tokens, onLinkClick)}</td>
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
      // Fallback: render raw text for unknown block types
      if ('text' in token && typeof token.text === 'string') {
        return <div key={index}>{token.text}</div>
      }
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline token rendering — the core of the fix
// ─────────────────────────────────────────────────────────────────────────────

function renderInlineTokens(
  tokens: Tokens.Token[] | undefined,
  onLinkClick?: (href: string) => void,
): ReactNode {
  if (!tokens || tokens.length === 0) return null
  return <>{tokens.map((token, i) => renderInlineToken(token, i, onLinkClick))}</>
}

function renderInlineToken(
  token: Tokens.Token,
  index: number,
  onLinkClick?: (href: string) => void,
): ReactNode {
  switch (token.type) {
    case 'text': {
      const t = token as Tokens.Text
      // A text token may itself contain nested inline tokens (e.g. inside a link)
      if (t.tokens && t.tokens.length > 0) {
        return <Fragment key={index}>{renderInlineTokens(t.tokens, onLinkClick)}</Fragment>
      }
      // Leaf text node — just output the raw text
      return <span key={index}>{t.text}</span>
    }

    case 'strong': {
      const s = token as Tokens.Strong
      return <strong key={index}>{renderInlineTokens(s.tokens, onLinkClick)}</strong>
    }

    case 'em': {
      const e = token as Tokens.Em
      return <em key={index}>{renderInlineTokens(e.tokens, onLinkClick)}</em>
    }

    case 'codespan': {
      const c = token as Tokens.Codespan
      return <code key={index} className="markdown-inline-code">{c.text}</code>
    }

    case 'link': {
      const l = token as Tokens.Link
      const handleClick = onLinkClick
        ? (e: React.MouseEvent) => {
            e.preventDefault()
            onLinkClick(l.href)
          }
        : undefined
      return (
        <a
          key={index}
          href={l.href}
          className="markdown-link"
          onClick={handleClick}
          target={l.href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
        >
          {renderInlineTokens(l.tokens, onLinkClick)}
        </a>
      )
    }

    case 'image': {
      const img = token as Tokens.Image
      return <ImageBlock key={index} src={img.href} alt={img.text} />
    }

    case 'del': {
      // Strikethrough (GFM extension)
      const d = token as Tokens.Del
      return <del key={index}>{renderInlineTokens(d.tokens, onLinkClick)}</del>
    }

    case 'br':
      return <br key={index} />

    case 'escape': {
      const esc = token as Tokens.Escape
      return <span key={index}>{esc.text}</span>
    }

    default:
      // Fallback for unknown inline types: output raw text if available
      if ('text' in token && typeof token.text === 'string') {
        return <span key={index}>{token.text}</span>
      }
      if ('raw' in token && typeof token.raw === 'string') {
        return <span key={index}>{token.raw}</span>
      }
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image block (shared between block & inline rendering)
// ─────────────────────────────────────────────────────────────────────────────

function ImageBlock({ src, alt }: { src: string; alt?: string }) {
  return <img src={src} alt={alt || ''} className="markdown-image" loading="lazy" />
}