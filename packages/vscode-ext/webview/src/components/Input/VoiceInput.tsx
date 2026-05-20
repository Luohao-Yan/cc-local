import { useState, useCallback, useEffect } from 'react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import './VoiceInput.css'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  language?: string
  disabled?: boolean
}

function VoiceInput({ onTranscript, language = 'zh-CN', disabled = false }: VoiceInputProps) {
  const [showPanel, setShowPanel] = useState(false)
  const [finalText, setFinalText] = useState('')

  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language,
    onResult: (text, isFinal) => {
      if (isFinal) {
        setFinalText(prev => prev + text)
      }
    },
    onEnd: () => {
      // 停止时的处理
    },
  })

  // 开始/停止录音
  const toggleListening = useCallback(() => {
    if (!isSupported) return

    if (isListening) {
      stopListening()
      setShowPanel(false)
    } else {
      setFinalText('')
      resetTranscript()
      startListening()
      setShowPanel(true)
    }
  }, [isSupported, isListening, startListening, stopListening, resetTranscript])

  // 确认并发送
  const handleConfirm = useCallback(() => {
    const textToSend = finalText || transcript
    if (textToSend.trim()) {
      onTranscript(textToSend.trim())
    }
    stopListening()
    setShowPanel(false)
    setFinalText('')
    resetTranscript()
  }, [finalText, transcript, onTranscript, stopListening, resetTranscript])

  // 取消
  const handleCancel = useCallback(() => {
    stopListening()
    setShowPanel(false)
    setFinalText('')
    resetTranscript()
  }, [stopListening, resetTranscript])

  // 不支持时禁用
  if (!isSupported) {
    return null
  }

  return (
    <>
      <button
        className={`voice-input-button ${isListening ? 'active' : ''}`}
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? '停止录音' : '开始语音输入'}
      >
        <svg
          className="voice-input-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>

      {showPanel && (
        <div className="voice-input-panel">
          <div className="voice-input-header">
            <span className="voice-input-title">
              {isListening ? '正在录音...' : '语音输入'}
            </span>
            <button className="voice-input-close" onClick={handleCancel}>
              ×
            </button>
          </div>

          <div className="voice-input-content">
            {error ? (
              <div className="voice-input-error">{error}</div>
            ) : (
              <>
                <div className="voice-input-visualizer">
                  {isListening && (
                    <div className="voice-input-waves">
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
                </div>

                <div className="voice-input-transcript">
                  {finalText && <span className="voice-input-final">{finalText}</span>}
                  {interimTranscript && (
                    <span className="voice-input-interim">{interimTranscript}</span>
                  )}
                  {!finalText && !interimTranscript && (
                    <span className="voice-input-placeholder">
                      {isListening ? '请说话...' : '点击麦克风开始录音'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="voice-input-actions">
            <button className="voice-input-action cancel" onClick={handleCancel}>
              取消
            </button>
            <button
              className="voice-input-action confirm"
              onClick={handleConfirm}
              disabled={!finalText && !transcript}
            >
              发送
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default VoiceInput
