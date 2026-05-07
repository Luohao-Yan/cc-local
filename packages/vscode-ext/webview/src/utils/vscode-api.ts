/**
 * VS Code Webview API wrapper
 * Provides type-safe communication between webview and extension
 */

import type { WebviewToExtensionMessage, ExtensionToWebviewMessage } from '../types'

// VS Code API type from the webview context
interface VSCodeAPI {
  postMessage: (message: unknown) => void
  getState: () => unknown
  setState: <T>(state: T) => void
}

// Acquire the VS Code API
declare function acquireVsCodeApi(): VSCodeAPI

// Singleton VS Code API instance
let vscodeApi: VSCodeAPI | null = null

function getVSCodeAPI(): VSCodeAPI {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi()
  }
  return vscodeApi
}

/**
 * VS Code API wrapper with type safety
 */
export const vscode = {
  /**
   * Send a message to the extension host
   */
  postMessage<T extends WebviewToExtensionMessage>(message: T): void {
    getVSCodeAPI().postMessage(message)
  },

  /**
   * Listen for messages from the extension host
   */
  onMessage(callback: (message: ExtensionToWebviewMessage) => void): () => void {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      callback(event.data)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  },

  /**
   * Get the current state
   */
  getState<T>(): T {
    return getVSCodeAPI().getState() as T
  },

  /**
   * Set the current state
   */
  setState<T>(state: T): void {
    getVSCodeAPI().setState(state)
  },
}

/**
 * Generate a unique message ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Escape HTML entities for safe rendering
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)
}

/**
 * Format timestamp to human readable string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) {
    return 'just now'
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
