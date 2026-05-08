/**
 * SpeechClient — WebSocket client for CLI speech_to_text endpoint.
 *
 * Architecture alignment with official extension:
 *   - Official uses native `audio-capture.node` to record audio
 *   - Streams audio via WebSocket to CLI's `speech_to_text` service
 *   - Receives transcription text back
 *
 * This client provides the WebSocket connection layer.
 * The webview's VoiceInput component will use this via message passing.
 *
 * Fallback: If CLI doesn't support speech_to_text, falls back to
 * browser-native Web Speech API (current implementation).
 */

import * as vscode from 'vscode'
import { WebSocket } from 'ws'

export interface SpeechClientOptions {
  /** CLI WebSocket URL (from IdeServer port) */
  url: string
  /** Language code for transcription */
  language?: string
  /** Called with transcription result */
  onResult: (text: string) => void
  /** Called on error */
  onError?: (error: string) => void
  /** Called when connection state changes */
  onStateChange?: (state: 'connecting' | 'connected' | 'disconnected') => void
}

export class SpeechClient implements vscode.Disposable {
  private ws: WebSocket | undefined
  private options: SpeechClientOptions
  private outputChannel: vscode.LogOutputChannel

  constructor(
    options: SpeechClientOptions,
    outputChannel: vscode.LogOutputChannel,
  ) {
    this.options = options
    this.outputChannel = outputChannel
  }

  /** Connect to CLI speech_to_text endpoint */
  async connect(): Promise<boolean> {
    try {
      this.options.onStateChange?.('connecting')
      this.ws = new WebSocket(this.options.url)

      return new Promise((resolve) => {
        if (!this.ws) {
          resolve(false)
          return
        }

        this.ws.on('open', () => {
          this.outputChannel.info('[SpeechClient] Connected')
          this.options.onStateChange?.('connected')
          resolve(true)
        })

        this.ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString())
            if (msg.type === 'transcription' && msg.text) {
              this.options.onResult(msg.text)
            }
          } catch {
            // Ignore non-JSON messages
          }
        })

        this.ws.on('error', (err: Error) => {
          this.outputChannel.error(`[SpeechClient] Error: ${err.message}`)
          this.options.onError?.(err.message)
          this.options.onStateChange?.('disconnected')
          resolve(false)
        })

        this.ws.on('close', () => {
          this.options.onStateChange?.('disconnected')
        })
      })
    } catch (err: any) {
      this.outputChannel.error(`[SpeechClient] Connect failed: ${err?.message}`)
      this.options.onError?.(err?.message || 'Connection failed')
      return false
    }
  }

  /** Send audio chunk to CLI for transcription */
  sendAudioChunk(audioData: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'audio_chunk',
        data: Buffer.from(audioData).toString('base64'),
        language: this.options.language || 'en',
      }))
    }
  }

  /** Signal end of audio stream */
  sendEndOfStream(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end_of_stream' }))
    }
  }

  /** Check if connected */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  dispose(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }
  }
}
