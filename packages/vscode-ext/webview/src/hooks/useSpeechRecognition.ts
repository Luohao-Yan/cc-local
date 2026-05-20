import { useState, useEffect, useCallback, useRef } from 'react'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface UseSpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

/**
 * Hook for Web Speech API Speech Recognition
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    language = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // 检查浏览器支持
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // 初始化 SpeechRecognition
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults

    // 处理结果
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript)
        onResult?.(finalTranscript, true)
      }

      setInterimTranscript(interim)
      if (interim) {
        onResult?.(interim, false)
      }
    }

    // 处理错误
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error)
      setError(errorMessage)
      setIsListening(false)
      onError?.(errorMessage)
    }

    // 处理结束
    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      onEnd?.()
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [isSupported, language, continuous, interimResults, onResult, onError, onEnd])

  // 开始监听
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current || isListening) return

    setError(null)
    setTranscript('')
    setInterimTranscript('')

    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recognition'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [isSupported, isListening, onError])

  // 停止监听
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
      setIsListening(false)
    } catch (err) {
      console.error('Failed to stop recognition:', err)
    }
  }, [])

  // 重置转录文本
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}

// 错误消息映射
function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'no-speech': '未检测到语音输入',
    'audio-capture': '无法捕获音频，请检查麦克风',
    'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许访问',
    'network': '网络错误，请检查网络连接',
    'aborted': '语音识别被中止',
    'service-not-allowed': '服务不可用',
    'language-not-supported': '不支持的语言',
  }

  return errorMessages[error] || `语音识别错误: ${error}`
}

// 类型声明
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
