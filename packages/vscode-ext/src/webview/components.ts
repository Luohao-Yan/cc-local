/**
 * Webview Components for CCLocal VS Code Extension
 * Reusable HTML/CSS components for webview UI
 */

// ════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS CSS (inline for webviews)
// ════════════════════════════════════════════════════════════════════════════

export const designTokensCSS = /* css */ `
:root {
  --app-claude-orange: #d97757;
  --app-font-family: var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --app-font-family-mono: var(--vscode-editor-font-family), 'Fira Code', Consolas, monospace;
  --app-font-size-xs: 11px;
  --app-font-size-sm: 12px;
  --app-font-size-base: 13px;
  --app-font-size-lg: 14px;
  --app-font-size-xl: 16px;
  --app-spacing-xs: 4px;
  --app-spacing-sm: 8px;
  --app-spacing-md: 12px;
  --app-spacing-lg: 16px;
  --app-spacing-xl: 20px;
  --app-corner-radius-sm: 4px;
  --app-corner-radius-md: 6px;
  --app-corner-radius-lg: 8px;
  --app-shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
}
`

// ════════════════════════════════════════════════════════════════════════════
// BASE STYLES
// ════════════════════════════════════════════════════════════════════════════

export const baseStyles = /* css */ `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  height: 100%;
  font-family: var(--app-font-family);
  font-size: var(--app-font-size-base);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
`

// ════════════════════════════════════════════════════════════════════════════
// MESSAGE LIST STYLES
// ════════════════════════════════════════════════════════════════════════════

export const messageListStyles = /* css */ `
.message-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-md);
  padding: var(--app-spacing-lg);
  overflow-y: auto;
  flex: 1;
}
.message-item {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-sm);
  max-width: 100%;
}
.message-item.user { align-items: flex-end; }
.message-item.assistant { align-items: flex-start; }
.message-item.system { align-items: center; }
`

// ════════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE STYLES
// ════════════════════════════════════════════════════════════════════════════

export const messageBubbleStyles = /* css */ `
.message-bubble {
  padding: var(--app-spacing-md) var(--app-spacing-lg);
  border-radius: var(--app-corner-radius-lg);
  max-width: 85%;
  line-height: 1.6;
  word-wrap: break-word;
}
.message-bubble.user {
  background: var(--vscode-focusBorder);
  color: var(--vscode-button-foreground);
  border-bottom-right-radius: var(--app-corner-radius-sm);
}
.message-bubble.assistant {
  background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.1));
  color: var(--vscode-foreground);
  border-bottom-left-radius: var(--app-corner-radius-sm);
}
.message-bubble.system {
  background: var(--vscode-editorGutter-commentRangeForeground, rgba(100, 100, 100, 0.1));
  color: var(--vscode-descriptionForeground);
  font-size: var(--app-font-size-sm);
  font-style: italic;
}
.message-bubble pre {
  margin: var(--app-spacing-sm) 0;
  padding: var(--app-spacing-sm);
  background: var(--vscode-textCodeBlock-background);
  border-radius: var(--app-corner-radius-md);
  overflow-x: auto;
  font-family: var(--app-font-family-mono);
  font-size: var(--app-font-size-sm);
}
.message-bubble code {
  font-family: var(--app-font-family-mono);
  font-size: var(--app-font-size-sm);
  background: var(--vscode-textCodeBlock-background);
  padding: 2px 4px;
  border-radius: var(--app-corner-radius-sm);
}
.message-bubble pre code {
  background: transparent;
  padding: 0;
}
`

// ════════════════════════════════════════════════════════════════════════════
// TOOL CARD STYLES
// ══════════════════════════════════════════════════════════════════════════════

export const toolCardStyles = /* css */ `
.tool-card {
  background: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: var(--app-corner-radius-lg);
  overflow: hidden;
  margin: var(--app-spacing-sm) 0;
  max-width: 85%;
}
.tool-card.user { margin-left: auto; }
.tool-card.assistant { margin-right: auto; }
.tool-card-header {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-sm) var(--app-spacing-md);
  background: var(--vscode-sideBarSectionHeader-background);
  border-bottom: 1px solid var(--vscode-widget-border);
  font-size: var(--app-font-size-sm);
  font-weight: 500;
}
.tool-card-header .tool-icon {
  width: 16px;
  height: 16px;
  opacity: 0.8;
}
.tool-card-header .tool-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tool-card-header .tool-status {
  font-size: var(--app-font-size-xs);
  padding: 2px 6px;
  border-radius: 9999px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}
.tool-card-header .tool-status.success { background: #4CAF50; }
.tool-card-header .tool-status.error { background: #f44336; }
.tool-card-header .tool-status.pending { background: #2196F3; }
.tool-card-content {
  padding: var(--app-spacing-md);
  max-height: 300px;
  overflow-y: auto;
}
.tool-card-content pre {
  font-family: var(--app-font-family-mono);
  font-size: var(--app-font-size-xs);
  white-space: pre-wrap;
  word-break: break-word;
}
`

// ════════════════════════════════════════════════════════════════════════════
// CODE BLOCK STYLES
// ════════════════════════════════════════════════════════════════════════════

export const codeBlockStyles = /* css */ `
.code-block {
  margin: var(--app-spacing-sm) 0;
  border-radius: var(--app-corner-radius-lg);
  overflow: hidden;
  border: 1px solid var(--vscode-widget-border);
}
.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-spacing-xs) var(--app-spacing-sm);
  background: var(--vscode-sideBarSectionHeader-background);
  border-bottom: 1px solid var(--vscode-widget-border);
  font-size: var(--app-font-size-xs);
}
.code-block-lang {
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
}
.code-block-actions {
  display: flex;
  gap: var(--app-spacing-xs);
}
.code-block-action {
  background: transparent;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  padding: var(--app-spacing-xs);
  border-radius: var(--app-corner-radius-sm);
  font-size: var(--app-font-size-xs);
}
.code-block-action:hover {
  background: var(--vscode-toolbar-hoverBackground);
}
.code-block pre {
  padding: var(--app-spacing-md);
  margin: 0;
  background: var(--vscode-textCodeBlock-background);
  overflow-x: auto;
  font-family: var(--app-font-family-mono);
  font-size: var(--app-font-size-sm);
  line-height: 1.5;
}
`

// ════════════════════════════════════════════════════════════════════════════
// INPUT AREA STYLES
// ════════════════════════════════════════════════════════════════════════════

export const inputAreaStyles = /* css */ `
.input-area {
  display: flex;
  flex-direction: column;
  padding: var(--app-spacing-md);
  background: var(--vscode-editor-background);
  border-top: 1px solid var(--vscode-widget-border);
}
.input-container {
  display: flex;
  gap: var(--app-spacing-sm);
  align-items: flex-end;
}
.input-field {
  flex: 1;
  min-height: 36px;
  max-height: 200px;
  padding: var(--app-spacing-sm) var(--app-spacing-md);
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: var(--app-corner-radius-lg);
  color: var(--vscode-input-foreground);
  font-family: var(--app-font-family);
  font-size: var(--app-font-size-base);
  resize: none;
  outline: none;
}
.input-field:focus {
  border-color: var(--vscode-focusBorder);
}
.input-field::placeholder {
  color: var(--vscode-input-placeholderForeground);
}
.input-send {
  padding: var(--app-spacing-sm) var(--app-spacing-lg);
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: var(--app-corner-radius-lg);
  font-size: var(--app-font-size-base);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}
.input-send:hover {
  background: var(--vscode-button-hoverBackground);
}
.input-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--app-spacing-xs);
}
.input-hint {
  font-size: var(--app-font-size-xs);
  color: var(--vscode-descriptionForeground);
}
`

// ════════════════════════════════════════════════════════════════════════════
// DIFF VIEW STYLES
// ════════════════════════════════════════════════════════════════════════════

export const diffViewStyles = /* css */ `
.diff-view {
  border: 1px solid var(--vscode-widget-border);
  border-radius: var(--app-corner-radius-lg);
  overflow: hidden;
  margin: var(--app-spacing-sm) 0;
}
.diff-view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-spacing-sm) var(--app-spacing-md);
  background: var(--vscode-sideBarSectionHeader-background);
  border-bottom: 1px solid var(--vscode-widget-border);
}
.diff-view-title {
  font-size: var(--app-font-size-sm);
  font-weight: 500;
}
.diff-view-actions {
  display: flex;
  gap: var(--app-spacing-sm);
}
.diff-view-content {
  display: flex;
  font-family: var(--app-font-family-mono);
  font-size: var(--app-font-size-sm);
  line-height: 1.5;
}
.diff-view-side {
  flex: 1;
  overflow-x: auto;
}
.diff-view-side.left {
  border-right: 1px solid var(--vscode-widget-border);
}
.diff-line {
  display: flex;
  min-height: 20px;
}
.diff-line.added { background: rgba(76, 175, 80, 0.2); }
.diff-line.removed { background: rgba(244, 67, 54, 0.2); }
.diff-line-num {
  min-width: 40px;
  padding: 0 var(--app-spacing-xs);
  text-align: right;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-editorGutter-background);
  user-select: none;
}
.diff-line-content {
  flex: 1;
  padding: 0 var(--app-spacing-xs);
  white-space: pre;
}
`

// ════════════════════════════════════════════════════════════════════════════
// BANNER STYLES
// ════════════════════════════════════════════════════════════════════════════

export const bannerStyles = /* css */ `
.banner {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-sm) var(--app-spacing-md);
  border-radius: var(--app-corner-radius-md);
  font-size: var(--app-font-size-sm);
  margin: var(--app-spacing-sm) 0;
}
.banner.info {
  background: var(--vscode-inputValidation-infoBackground);
  border: 1px solid var(--vscode-inputValidation-infoBorder);
  color: var(--vscode-inputValidation-infoForeground);
}
.banner.warning {
  background: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  color: var(--vscode-inputValidation-warningForeground);
}
.banner.error {
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  color: var(--vscode-inputValidation-errorForeground);
}
.banner.success {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.5);
  color: #4CAF50;
}
.banner-icon {
  flex-shrink: 0;
}
.banner-content {
  flex: 1;
}
.banner-close {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: var(--app-spacing-xs);
  border-radius: var(--app-corner-radius-sm);
}
.banner-close:hover {
  background: rgba(255, 255, 255, 0.1);
}
`

// ════════════════════════════════════════════════════════════════════════════
// TOAST STYLES
// ════════════════════════════════════════════════════════════════════════════

export const toastStyles = /* css */ `
.toast-container {
  position: fixed;
  bottom: var(--app-spacing-xl);
  right: var(--app-spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-sm);
  z-index: 700;
}
.toast {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-md) var(--app-spacing-lg);
  background: var(--vscode-notifications-background);
  border: 1px solid var(--vscode-notifications-border);
  border-radius: var(--app-corner-radius-lg);
  color: var(--vscode-notifications-foreground);
  box-shadow: var(--app-shadow-lg);
  animation: toast-in 0.3s ease-out;
  min-width: 250px;
  max-width: 400px;
}
@keyframes toast-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.toast.toast-exit {
  animation: toast-out 0.2s ease-in forwards;
}
@keyframes toast-out {
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
.toast-icon {
  flex-shrink: 0;
}
.toast-content {
  flex: 1;
  font-size: var(--app-font-size-sm);
}
.toast-close {
  background: transparent;
  border: none;
  color: var(--vscode-notifications-foreground);
  cursor: pointer;
  padding: var(--app-spacing-xs);
  border-radius: var(--app-corner-radius-sm);
  opacity: 0.7;
}
.toast-close:hover {
  opacity: 1;
}
`

// ════════════════════════════════════════════════════════════════════════════
// LOADING SPINNER STYLES
// ════════════════════════════════════════════════════════════════════════════

export const spinnerStyles = /* css */ `
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--vscode-descriptionForeground);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-lg);
  color: var(--vscode-descriptionForeground);
}
`

// ════════════════════════════════════════════════════════════════════════════
// COMBINED STYLES
// ════════════════════════════════════════════════════════════════════════════

export const allStyles = [
  designTokensCSS,
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
].join('\n\n')
