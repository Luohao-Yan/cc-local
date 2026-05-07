/**
 * Webview Module - CCLocal VS Code Extension
 * Complete webview UI design system and components
 */

// Design Tokens
export { designTokensCSS } from './components'

// Component Styles
export {
  baseStyles,
  messageListStyles,
  messageBubbleStyles,
  toolCardStyles,
  codeBlockStyles,
  inputAreaStyles,
  diffViewStyles,
  bannerStyles,
  toastStyles,
  spinnerStyles,
  allStyles,
} from './components'

// Dialog Styles
export {
  modalOverlayStyles,
  permissionDialogStyles,
  mcpServerDialogStyles,
  pluginDialogStyles,
  settingsPanelStyles,
  commandPaletteStyles,
  allDialogStyles,
} from './dialogs'

// ════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

import { allStyles } from './components'
import { allDialogStyles } from './dialogs'

/**
 * Get all CSS for webview (design tokens + components + dialogs)
 */
export function getAllWebviewCSS(): string {
  return `
${allStyles}

${allDialogStyles}
`
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Format code for display in webview
 */
export function formatCodeBlock(code: string, language: string = 'text'): string {
  return `<div class="code-block">
  <div class="code-block-header">
    <span class="code-block-lang">${language}</span>
    <div class="code-block-actions">
      <button class="code-block-action" onclick="copyCode(this)">Copy</button>
    </div>
  </div>
  <pre><code>${escapeHtml(code)}</code></pre>
</div>`
}

/**
 * Format a message for display
 */
export function formatMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  options?: { id?: string; timestamp?: number }
): string {
  const id = options?.id || `msg-${Date.now()}`
  const time = options?.timestamp ? new Date(options.timestamp).toLocaleTimeString() : ''

  return `<div class="message-item ${role}" data-id="${id}">
  <div class="message-bubble ${role}">${content}</div>
  ${time ? `<span class="text-xs text-muted">${time}</span>` : ''}
</div>`
}

/**
 * Format a tool call for display
 */
export function formatToolCard(
  toolName: string,
  input: unknown,
  output?: unknown,
  status: 'pending' | 'success' | 'error' = 'pending'
): string {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  const outputStr = output ? (typeof output === 'string' ? output : JSON.stringify(output, null, 2)) : ''

  return `<div class="tool-card">
  <div class="tool-card-header">
    <span class="tool-icon">🔧</span>
    <span class="tool-name">${escapeHtml(toolName)}</span>
    <span class="tool-status ${status}">${status}</span>
  </div>
  <div class="tool-card-content">
    <pre>${escapeHtml(inputStr)}</pre>
    ${outputStr ? `<hr style="margin: 8px 0; border-color: var(--vscode-widget-border);" /><pre>${escapeHtml(outputStr)}</pre>` : ''}
  </div>
</div>`
}

/**
 * Format a banner notification
 */
export function formatBanner(
  type: 'info' | 'warning' | 'error' | 'success',
  message: string,
  dismissible: boolean = true
): string {
  const icons: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  }

  return `<div class="banner ${type}">
  <span class="banner-icon">${icons[type]}</span>
  <span class="banner-content">${escapeHtml(message)}</span>
  ${dismissible ? '<button class="banner-close" onclick="this.parentElement.remove()">×</button>' : ''}
</div>`
}

/**
 * Format a diff view
 */
export function formatDiffView(
  title: string,
  original: string,
  modified: string,
  originalPath?: string,
  modifiedPath?: string
): string {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')

  let diffHtml = ''
  const maxLines = Math.max(origLines.length, modLines.length)

  for (let i = 0; i < maxLines; i++) {
    const origLine = origLines[i] || ''
    const modLine = modLines[i] || ''

    const lineClass = origLine !== modLine
      ? (origLine && !modLine ? 'removed' : (!origLine && modLine ? 'added' : ''))
      : ''

    diffHtml += `
        <div class="diff-line ${lineClass}">
          <div class="diff-view-side left">
            <span class="diff-line-num">${i + 1}</span>
            <span class="diff-line-content">${escapeHtml(origLine)}</span>
          </div>
        </div>`
  }

  return `<div class="diff-view">
  <div class="diff-view-header">
    <span class="diff-view-title">${escapeHtml(title)}</span>
    <div class="diff-view-actions">
      <button class="btn btn-sm" onclick="acceptDiff()">Accept</button>
      <button class="btn btn-sm btn-secondary" onclick="rejectDiff()">Reject</button>
    </div>
  </div>
  <div class="diff-view-content">
    ${diffHtml}
  </div>
</div>`
}
