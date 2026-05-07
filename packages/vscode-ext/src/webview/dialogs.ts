/**
 * Dialog Components for CCLocal VS Code Extension Webview
 * Permission, MCP Server, Plugin dialogs, Settings panel, and Command palette
 */

// ════════════════════════════════════════════════════════════════════════════
// MODAL OVERLAY STYLES
// ════════════════════════════════════════════════════════════════════════════

export const modalOverlayStyles = /* css */ `
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
  animation: fade-in 0.2s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.modal-content {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: var(--app-corner-radius-xl);
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: modal-in 0.2s ease-out;
  box-shadow: var(--app-shadow-lg);
}
@keyframes modal-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-spacing-lg);
  border-bottom: 1px solid var(--vscode-widget-border);
}
.modal-title {
  font-size: var(--app-font-size-lg);
  font-weight: 600;
}
.modal-close {
  background: transparent;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  padding: var(--app-spacing-xs);
  border-radius: var(--app-corner-radius-sm);
}
.modal-close:hover {
  background: var(--vscode-toolbar-hoverBackground);
}
.modal-body {
  padding: var(--app-spacing-lg);
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-lg);
  border-top: 1px solid var(--vscode-widget-border);
}
`

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION DIALOG STYLES
// ════════════════════════════════════════════════════════════════════════════

export const permissionDialogStyles = /* css */ `
.permission-dialog .permission-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: var(--app-spacing-lg);
}
.permission-dialog .permission-message {
  font-size: var(--app-font-size-base);
  margin-bottom: var(--app-spacing-lg);
  line-height: 1.6;
}
.permission-dialog .permission-details {
  background: var(--vscode-textCodeBlock-background);
  padding: var(--app-spacing-md);
  border-radius: var(--app-corner-radius-md);
  font-family: var(--app-font-family-mono);
  font-size: var(--app-font-size-sm);
  margin-bottom: var(--app-spacing-lg);
  max-height: 200px;
  overflow-y: auto;
}
.permission-dialog .permission-warning {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-sm);
  background: var(--vscode-inputValidation-warningBackground);
  border-radius: var(--app-corner-radius-md);
  font-size: var(--app-font-size-sm);
  margin-bottom: var(--app-spacing-lg);
}
`

// ════════════════════════════════════════════════════════════════════════════
// MCP SERVER DIALOG STYLES
// ════════════════════════════════════════════════════════════════════════════

export const mcpServerDialogStyles = /* css */ `
.mcp-dialog .mcp-server-info {
  display: grid;
  gap: var(--app-spacing-md);
  margin-bottom: var(--app-spacing-lg);
}
.mcp-dialog .mcp-field {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-xs);
}
.mcp-dialog .mcp-label {
  font-size: var(--app-font-size-sm);
  font-weight: 500;
  color: var(--vscode-foreground);
}
.mcp-dialog .mcp-value {
  font-size: var(--app-font-size-sm);
  color: var(--vscode-descriptionForeground);
}
.mcp-dialog .mcp-tools-list {
  background: var(--vscode-textCodeBlock-background);
  border-radius: var(--app-corner-radius-md);
  padding: var(--app-spacing-md);
  margin-top: var(--app-spacing-sm);
}
.mcp-dialog .mcp-tool-item {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-sm) 0;
  border-bottom: 1px solid var(--vscode-widget-border);
}
.mcp-dialog .mcp-tool-item:last-child {
  border-bottom: none;
}
.mcp-dialog .mcp-tool-name {
  font-weight: 500;
  font-size: var(--app-font-size-sm);
}
.mcp-dialog .mcp-tool-desc {
  font-size: var(--app-font-size-xs);
  color: var(--vscode-descriptionForeground);
}
`

// ════════════════════════════════════════════════════════════════════════════
// PLUGIN DIALOG STYLES
// ════════════════════════════════════════════════════════════════════════════

export const pluginDialogStyles = /* css */ `
.plugin-dialog .plugin-header {
  display: flex;
  gap: var(--app-spacing-md);
  margin-bottom: var(--app-spacing-lg);
}
.plugin-dialog .plugin-icon {
  width: 64px;
  height: 64px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: var(--app-corner-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}
.plugin-dialog .plugin-meta {
  flex: 1;
}
.plugin-dialog .plugin-name {
  font-size: var(--app-font-size-xl);
  font-weight: 600;
  margin-bottom: var(--app-spacing-xs);
}
.plugin-dialog .plugin-publisher {
  font-size: var(--app-font-size-sm);
  color: var(--vscode-descriptionForeground);
}
.plugin-dialog .plugin-badges {
  display: flex;
  gap: var(--app-spacing-xs);
  margin-top: var(--app-spacing-sm);
}
.plugin-dialog .plugin-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: var(--app-font-size-xs);
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}
.plugin-dialog .plugin-badge.official { background: #4CAF50; }
.plugin-dialog .plugin-badge.verified { background: #2196F3; }
.plugin-dialog .plugin-desc {
  font-size: var(--app-font-size-base);
  line-height: 1.6;
  margin-bottom: var(--app-spacing-lg);
}
.plugin-dialog .plugin-permissions {
  background: var(--vscode-textCodeBlock-background);
  border-radius: var(--app-corner-radius-md);
  padding: var(--app-spacing-md);
  margin-bottom: var(--app-spacing-lg);
}
.plugin-dialog .plugin-perm-item {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-xs) 0;
  font-size: var(--app-font-size-sm);
}
.plugin-dialog .plugin-perm-item.danger {
  color: var(--vscode-errorForeground);
}
`

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS PANEL STYLES
// ════════════════════════════════════════════════════════════════════════════

export const settingsPanelStyles = /* css */ `
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.settings-tabs {
  display: flex;
  gap: 2px;
  padding: var(--app-spacing-sm);
  background: var(--vscode-sideBar-background);
  border-bottom: 1px solid var(--vscode-widget-border);
}
.settings-tab {
  padding: var(--app-spacing-sm) var(--app-spacing-md);
  background: transparent;
  border: none;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  font-size: var(--app-font-size-sm);
  border-radius: var(--app-corner-radius-sm);
}
.settings-tab:hover {
  background: var(--vscode-toolbar-hoverBackground);
}
.settings-tab.active {
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--app-spacing-lg);
}
.settings-section {
  margin-bottom: var(--app-spacing-xl);
}
.settings-section-title {
  font-size: var(--app-font-size-lg);
  font-weight: 600;
  margin-bottom: var(--app-spacing-md);
  padding-bottom: var(--app-spacing-sm);
  border-bottom: 1px solid var(--vscode-widget-border);
}
.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--app-spacing-md) 0;
  border-bottom: 1px solid var(--vscode-widget-border);
}
.settings-item:last-child {
  border-bottom: none;
}
.settings-item-label {
  flex: 1;
}
.settings-item-title {
  font-size: var(--app-font-size-base);
  font-weight: 500;
}
.settings-item-desc {
  font-size: var(--app-font-size-sm);
  color: var(--vscode-descriptionForeground);
  margin-top: var(--app-spacing-xs);
}
.settings-item-control {
  margin-left: var(--app-spacing-lg);
}
.settings-input {
  padding: var(--app-spacing-sm) var(--app-spacing-md);
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: var(--app-corner-radius-md);
  color: var(--vscode-input-foreground);
  font-size: var(--app-font-size-base);
  min-width: 200px;
}
.settings-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}
.settings-select {
  padding: var(--app-spacing-sm) var(--app-spacing-md);
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: var(--app-corner-radius-md);
  color: var(--vscode-input-foreground);
  font-size: var(--app-font-size-base);
  min-width: 200px;
}
.settings-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
`

// ════════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE STYLES
// ════════════════════════════════════════════════════════════════════════════

export const commandPaletteStyles = /* css */ `
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 500;
}
.command-palette {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: var(--app-corner-radius-xl);
  width: 600px;
  max-width: 90%;
  box-shadow: var(--app-shadow-lg);
}
.command-palette-input {
  width: 100%;
  padding: var(--app-spacing-md) var(--app-spacing-lg);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--vscode-widget-border);
  color: var(--vscode-input-foreground);
  font-size: var(--app-font-size-lg);
  outline: none;
}
.command-palette-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}
.command-palette-list {
  max-height: 400px;
  overflow-y: auto;
}
.command-palette-item {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-md);
  padding: var(--app-spacing-sm) var(--app-spacing-lg);
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}
.command-palette-item:hover,
.command-palette-item.selected {
  background: var(--vscode-list-hoverBackground);
}
.command-palette-item-icon {
  width: 20px;
  text-align: center;
  color: var(--vscode-descriptionForeground);
}
.command-palette-item-label {
  flex: 1;
  font-size: var(--app-font-size-base);
  color: var(--vscode-foreground);
}
.command-palette-item-desc {
  font-size: var(--app-font-size-sm);
  color: var(--vscode-descriptionForeground);
}
.command-palette-item-shortcut {
  font-size: var(--app-font-size-xs);
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-keybindingLabel-background);
  padding: 2px 6px;
  border-radius: var(--app-corner-radius-sm);
}
.command-palette-empty {
  padding: var(--app-spacing-xl);
  text-align: center;
  color: var(--vscode-descriptionForeground);
}
`

// ════════════════════════════════════════════════════════════════════════════
// COMBINED DIALOG STYLES
// ════════════════════════════════════════════════════════════════════════════

export const allDialogStyles = [
  modalOverlayStyles,
  permissionDialogStyles,
  mcpServerDialogStyles,
  pluginDialogStyles,
  settingsPanelStyles,
  commandPaletteStyles,
].join('\n\n')
