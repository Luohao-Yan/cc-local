import { useState, useCallback, useEffect, useRef } from 'react'
import './CodeBlock.css'

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
  showLineNumbers?: boolean
  maxHeight?: number
  onCopy?: () => void
}

// 语言图标映射
const LANGUAGE_ICONS: Record<string, string> = {
  javascript: 'JS',
  typescript: 'TS',
  tsx: 'TSX',
  jsx: 'JSX',
  python: 'PY',
  java: 'JAVA',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'GO',
  rust: 'RS',
  ruby: 'RB',
  php: 'PHP',
  swift: 'SWIFT',
  kotlin: 'KT',
  scala: 'SCALA',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  markdown: 'MD',
  sql: 'SQL',
  shell: 'SH',
  bash: 'BASH',
  powershell: 'PS',
  dockerfile: 'DOCKER',
  plaintext: 'TXT',
}

// 简单的语法高亮（使用 CSS 类）
function highlightSyntax(code: string, language: string): string {
  // 基础高亮 - 实际项目中应使用 shiki 或 highlight.js
  let highlighted = escapeHtml(code)

  // 语言特定的关键字
  const keywords: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'implements', 'extends', 'private', 'public', 'protected', 'readonly'],
    python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
  }

  const langKeywords = keywords[language.toLowerCase()] || keywords.javascript

  // 高亮关键字
  for (const keyword of langKeywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g')
    highlighted = highlighted.replace(regex, '<span class="code-keyword">$1</span>')
  }

  // 高亮字符串
  highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="code-string">$1</span>')

  // 高亮数字
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>')

  // 高亮注释
  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="code-comment">$1</span>')

  return highlighted
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  maxHeight = 400,
  onCopy,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // 格式化语言名称
  const displayLanguage = language.toLowerCase().replace(/[^a-z0-9]/g, '')

  // 高亮代码
  const highlightedCode = highlightSyntax(code, displayLanguage)

  // 计算行数
  const lines = code.split('\n')
  const lineCount = lines.length
  const isLongCode = lineCount > 15 || code.length > 2000

  // 复制代码
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [code, onCopy])

  // 切换展开
  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  return (
    <div className={`code-block ${expanded ? 'expanded' : ''}`}>
      <div className="code-block-header">
        <div className="code-block-language">
          <span className="code-block-icon">
            {LANGUAGE_ICONS[displayLanguage] || displayLanguage.toUpperCase().slice(0, 4)}
          </span>
          <span className="code-block-lang-name">{displayLanguage}</span>
          {filename && <span className="code-block-filename">{filename}</span>}
        </div>
        <div className="code-block-actions">
          {isLongCode && (
            <button className="code-block-action" onClick={toggleExpand} title={expanded ? '收起' : '展开'}>
              {expanded ? '收起' : '展开'}
            </button>
          )}
          <button className="code-block-action" onClick={handleCopy} title="复制">
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>
      <div
        className="code-block-content"
        style={{ maxHeight: expanded ? 'none' : maxHeight }}
      >
        {showLineNumbers && (
          <div className="code-block-line-numbers">
            {lines.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        )}
        <pre className="code-block-code">
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </div>
  )
}

export default CodeBlock

// ─────────────────────────────────────────────────────────────────────────────
// Simple code block (for small snippets)
// ─────────────────────────────────────────────────────────────────────────────

interface SimpleCodeBlockProps {
  code: string
  language?: string
  inline?: boolean
}

export function SimpleCodeBlock({ code, language, inline = false }: SimpleCodeBlockProps) {
  if (inline) {
    return <code className="code-inline">{code}</code>
  }

  return (
    <pre className="code-simple">
      {language && <span className="code-simple-lang">{language}</span>}
      <code>{code}</code>
    </pre>
  )
}
