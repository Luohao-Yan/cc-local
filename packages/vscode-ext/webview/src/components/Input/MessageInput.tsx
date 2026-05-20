import { useState, useCallback, useRef, useEffect } from 'react'
import VoiceInput from './VoiceInput'
import './MessageInput.css'

interface MessageInputProps {
  onSubmit: (content: string) => void
  onInterrupt: () => void
  onNewConversation: () => void
  loading?: boolean
  disabled?: boolean
}

/** @-mention 建议项 */
interface SuggestionItem {
  type: 'file' | 'folder' | 'command'
  label: string
  detail?: string
  insertText: string
}

/** 内置命令建议 */
const COMMAND_SUGGESTIONS: SuggestionItem[] = [
  { type: 'command', label: 'New Conversation', detail: 'Start fresh', insertText: '/new' },
  { type: 'command', label: 'Compact', detail: 'Summarize context', insertText: '/compact' },
  { type: 'command', label: 'Model', detail: 'Switch model', insertText: '/model' },
  { type: 'command', label: 'Help', detail: 'Show help', insertText: '/help' },
]

function MessageInput({ onSubmit, onInterrupt, onNewConversation, loading, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    }
  }, [value])

  // @-mention 检测
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setValue(v)

    // 检测 @ 触发
    const cursorPos = e.target.selectionStart
    const beforeCursor = v.slice(0, cursorPos)
    const atIdx = beforeCursor.lastIndexOf('@')

    if (atIdx >= 0 && (atIdx === 0 || beforeCursor[atIdx - 1] === ' ' || beforeCursor[atIdx - 1] === '\n')) {
      const query = beforeCursor.slice(atIdx + 1)
      if (!query.includes(' ')) {
        setMentionStart(atIdx)
        setShowSuggestions(true)

        // 过滤文件建议（从扩展请求）+ 命令建议
        const filtered = COMMAND_SUGGESTIONS.filter(
          c => c.label.toLowerCase().includes(query.toLowerCase())
            || c.insertText.toLowerCase().includes(query.toLowerCase())
        )

        // 向扩展请求文件建议
        window.postMessage({ type: 'fileSuggestions', query }, '*')

        setSuggestions(filtered.length > 0 ? filtered : [])
        setSelectedIdx(0)
        return
      }
    }

    setShowSuggestions(false)
    setMentionStart(-1)
  }, [])

  // 处理文件建议响应
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data
      if (msg?.type === 'fileSuggestionsResult' && Array.isArray(msg.files)) {
        setSuggestions(prev => {
          const files: SuggestionItem[] = msg.files.map((f: string) => ({
            type: 'file' as const,
            label: f.split('/').pop() ?? f,
            detail: f,
            insertText: `@${f}`,
          }))
          return [...files, ...prev]
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // 选择建议
  const selectSuggestion = useCallback((item: SuggestionItem) => {
    if (mentionStart >= 0) {
      const before = value.slice(0, mentionStart)
      const after = value.slice(textareaRef.current?.selectionStart ?? value.length)
      const newVal = `${before}${item.insertText} ${after}`
      setValue(newVal)
    } else {
      setValue(prev => prev + item.insertText + ' ')
    }
    setShowSuggestions(false)
    setMentionStart(-1)
    textareaRef.current?.focus()
  }, [value, mentionStart])

  // 键盘处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        selectSuggestion(suggestions[selectedIdx])
        return
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !loading && !disabled) {
        onSubmit(value.trim())
        setValue('')
      }
    }
  }, [showSuggestions, suggestions, selectedIdx, selectSuggestion, value, loading, disabled, onSubmit])

  const handleSubmit = useCallback(() => {
    if (value.trim() && !loading && !disabled) {
      onSubmit(value.trim())
      setValue('')
    }
  }, [value, loading, disabled, onSubmit])

  // 语音转录回调
  const handleVoiceTranscript = useCallback((text: string) => {
    setValue(prev => (prev ? prev + ' ' + text : text))
  }, [])

  return (
    <div className="message-input-container">
      <div className={`message-input-wrapper ${loading ? 'running' : ''} ${disabled ? 'disabled' : ''}`}>
        {/* @-mention 建议 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="message-input-suggestions">
            {suggestions.map((item, i) => (
              <div
                key={`${item.type}-${item.label}-${i}`}
                className={`suggestion-item ${i === selectedIdx ? 'selected' : ''}`}
                onClick={() => selectSuggestion(item)}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span className="suggestion-icon">
                  {item.type === 'file' ? '📄' : item.type === 'folder' ? '📁' : '⚡'}
                </span>
                <span className="suggestion-text">{item.label}</span>
                {item.detail && <span className="suggestion-detail">{item.detail}</span>}
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="message-input auto-resize"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '请先登录...' : '输入消息… (@ 插入文件引用, Shift+Enter 换行)'}
          disabled={disabled || loading}
          rows={1}
        />

        <div className="message-input-actions">
          {/* 附件按钮 */}
          <button
            className="message-input-button attachment"
            onClick={() => window.postMessage({ type: 'attachFile' }, '*')}
            disabled={disabled || loading}
            title="Attach file"
          >
            📎
          </button>

          {/* 语音按钮 */}
          <VoiceInput onTranscript={handleVoiceTranscript} disabled={disabled || loading} />

          {/* 发送/停止按钮 */}
          {loading ? (
            <button className="message-input-button interrupt" onClick={onInterrupt} title="Stop (Esc)">
              ⏹
            </button>
          ) : (
            <button
              className="message-input-button send"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              title="Send (Enter)"
            >
              ➤
            </button>
          )}
        </div>
      </div>

      <div className="message-input-toolbar">
        <button className="toolbar-button" onClick={onNewConversation} title="New conversation (Ctrl+N)">
          ✦ New
        </button>
        <span className="toolbar-hint">Enter 发送 · Shift+Enter 换行 · @ 引用文件</span>
      </div>
    </div>
  )
}

export default MessageInput
