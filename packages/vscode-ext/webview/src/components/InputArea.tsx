/**
 * Message input area component
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'

interface InputAreaProps {
  onSend: (text: string) => void
  onCancel: () => void
  disabled?: boolean
  isRunning?: boolean
}

export function InputArea({ onSend, onCancel, disabled, isRunning }: InputAreaProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const useCtrlEnterToSend = useChatStore((state) => state.inputValue) // Placeholder for config

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to send (if configured)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
      return
    }

    // Enter to send (default behavior, unless Shift is held)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
      return
    }

    // Escape to blur
    if (e.key === 'Escape') {
      e.preventDefault()
      textareaRef.current?.blur()
      return
    }
  }, [value])

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  // Handle paste (for images)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        // Handle image paste - could be implemented later
        e.preventDefault()
        // TODO: Send image to extension
        console.log('Image paste detected')
      }
    }
  }, [])

  // Handle @ mentions
  const handleAtMention = useCallback(() => {
    // Insert @ at cursor position
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = value.slice(0, start) + '@' + value.slice(end)
    setValue(newValue)

    // Move cursor after @
    setTimeout(() => {
      textarea.selectionStart = start + 1
      textarea.selectionEnd = start + 1
      textarea.focus()
    }, 0)
  }, [value])

  return (
    <div className="input-area">
      <div className="input-container">
        {/* Toolbar */}
        <div className="input-toolbar">
          <button
            className="toolbar-btn"
            onClick={handleAtMention}
            title="Insert @-mention"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
            </svg>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder={disabled ? 'Processing...' : 'Send a message...'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          rows={1}
        />

        {/* Send/Cancel button */}
        <div className="input-actions">
          {isRunning ? (
            <button
              className="input-btn cancel"
              onClick={onCancel}
              title="Stop generation"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
          ) : (
            <button
              className={`input-btn send ${!value.trim() ? 'disabled' : ''}`}
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              title="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hint */}
      <div className="input-hint">
        <span>Enter to send</span>
        <span>•</span>
        <span>Shift+Enter for new line</span>
        <span>•</span>
        <span>@ for mentions</span>
      </div>
    </div>
  )
}
