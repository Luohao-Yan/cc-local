/**
 * VSCode Extension ↔ Webview ↔ CLI 消息类型定义
 *
 * 基于 Official Claude Code Extension v2.1.89 的消息协议 1:1 还原
 *
 * 消息路由架构:
 *   CLI → Extension:    NDJSON on stdout
 *   Extension → Webview: postMessage({ type: "from-extension", message: <CLI message> })
 *   Webview → Extension: postMessage({ type: "<request_type>", ...params })
 *   Extension → CLI:    stdin JSON write
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CLI → Extension (Stream-JSON) 消息类型
// ═══════════════════════════════════════════════════════════════════════════

export type CliStreamMessage =
  // Core streaming
  | CliInitMessage
  | CliAssistantMessage
  | CliContentBlockStartMessage
  | CliContentBlockDeltaMessage
  | CliContentBlockStopMessage
  | CliResultMessage
  | CliThinkingMessage
  | CliTextMessage
  | CliImageMessage
  | CliToolUseMessage
  | CliToolResultMessage
  | CliSummaryMessage
  // Control flow
  | CliControlRequestMessage
  | CliControlResponseMessage
  | CliIoMessage
  // Auth
  | CliAuthUrlMessage
  | CliAuthorizationCodeMessage
  | CliRefreshTokenMessage
  // Diff / File
  | CliProposedDiffMessage
  | CliFileUpdatedMessage
  | CliRewindFilesMessage
  // Session / Usage
  | CliSessionStatesUpdateMessage
  | CliUsageUpdateMessage
  | CliAiTitleMessage
  // MCP
  | CliMcpStatusMessage
  | CliMcpAuthenticateMessage
  | CliMcpOAuthCallbackUrlMessage
  // IDE integration
  | CliSelectionChangedMessage
  | CliVisibilityChangedMessage
  | CliFontConfigurationChangedMessage
  | CliProactiveSuggestionsUpdateMessage
  // Attribution
  | CliAttributionSnapshotMessage
  // Error / System
  | CliErrorMessage
  | CliSystemMessage

// ─── Core Streaming ─────────────────────────────────────────────────

export interface CliInitMessage {
  type: 'init'
  session_id: string
  tools?: string[]
  model?: string
  version?: string
  ide_ws_port?: number
  /** SDK-specific fields */
  subtype?: string
  permissions?: Record<string, unknown>
}

export interface CliAssistantMessage {
  type: 'assistant'
  message: {
    role: 'assistant'
    content: CliContentBlock[]
    id?: string
    model?: string
    stop_reason?: string
    stop_sequence?: string | null
    parent_message_id?: string | null
  }
  session_id: string
}

export interface CliContentBlockStartMessage {
  type: 'content_block_start'
  index: number
  content_block: CliContentBlock
  session_id: string
  message_id?: string
}

export interface CliContentBlockDeltaMessage {
  type: 'content_block_delta'
  index: number
  delta:
    | { type: 'text_delta'; text: string }
    | { type: 'thinking_delta'; thinking: string }
    | { type: 'input_json_delta'; partial_json: string }
  session_id: string
  message_id?: string
}

export interface CliContentBlockStopMessage {
  type: 'content_block_stop'
  index: number
  session_id: string
  message_id?: string
}

export interface CliResultMessage {
  type: 'result'
  subtype: 'success' | 'error_tool_use' | 'error' | 'cancelled'
  result?: string
  error?: string
  session_id: string
  cost_usd?: number
  duration_ms?: number
  duration_api_ms?: number
  num_turns?: number
  total_cost_usd?: number
  is_error?: boolean
}

export interface CliThinkingMessage {
  type: 'thinking'
  thinking: string
  session_id: string
  message_id?: string
}

export interface CliTextMessage {
  type: 'text'
  text: string
  session_id: string
  message_id?: string
}

export interface CliImageMessage {
  type: 'image'
  source: { type: 'base64'; media_type: string; data: string }
  session_id: string
  message_id?: string
}

export interface CliToolUseMessage {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
  session_id: string
  message_id?: string
}

export interface CliToolResultMessage {
  type: 'tool_result'
  tool_use_id: string
  content: string | CliContentBlock[]
  is_error?: boolean
  session_id: string
  message_id?: string
}

export interface CliSummaryMessage {
  type: 'summary'
  summary: string
  session_id: string
  message_id?: string
}

// ─── Control Flow ────────────────────────────────────────────────────

export interface CliControlRequestMessage {
  type: 'control_request'
  request_id: string
  request: {
    subtype: 'tool_permission' | 'interrupt' | 'auto_approved'
    tool_name?: string
    tool_input?: unknown
    reason?: string
    mcp_server_name?: string
  }
  session_id: string
}

export interface CliControlResponseMessage {
  type: 'control_response'
  request_id: string
  response: {
    subtype: 'tool_permission'
    approved: boolean
    always?: boolean
  }
  session_id: string
}

export interface CliIoMessage {
  type: 'io_message'
  /** IO type: stdio, sse, http */
  transport?: string
  data?: unknown
  session_id?: string
}

// ─── Auth ────────────────────────────────────────────────────────────

export interface CliAuthUrlMessage {
  type: 'auth_url'
  url: string
  session_id?: string
}

export interface CliAuthorizationCodeMessage {
  type: 'authorization_code'
  code: string
  state?: string
  session_id?: string
}

export interface CliRefreshTokenMessage {
  type: 'refresh_token'
  token: string
  session_id?: string
}

// ─── Diff / File ─────────────────────────────────────────────────────

export interface CliProposedDiffMessage {
  type: 'proposed_diff'
  file_path: string
  old_content: string
  new_content: string
  tool_use_id?: string
  session_id: string
}

export interface CliFileUpdatedMessage {
  type: 'file_updated'
  file_path: string
  /** How the file was updated */
  change_type?: 'created' | 'modified' | 'deleted'
  session_id?: string
}

export interface CliRewindFilesMessage {
  type: 'rewind_files'
  files: string[]
  session_id?: string
}

// ─── Session / Usage ─────────────────────────────────────────────────

export interface CliSessionStatesUpdateMessage {
  type: 'session_states_update'
  sessions: Array<{
    session_id: string
    status: 'active' | 'idle' | 'completed' | 'error'
    model?: string
    cost_usd?: number
    num_turns?: number
    title?: string
  }>
}

export interface CliUsageUpdateMessage {
  type: 'usage_update'
  cost_usd: number
  duration_ms: number
  session_id?: string
  total_cost_usd?: number
  total_duration_ms?: number
  num_turns?: number
}

export interface CliAiTitleMessage {
  type: 'ai-title'
  title: string
  session_id?: string
}

// ─── MCP ─────────────────────────────────────────────────────────────

export interface CliMcpStatusMessage {
  type: 'mcp_status'
  servers: Array<{
    name: string
    status: 'connected' | 'disconnected' | 'error' | 'connecting'
    error?: string
    tools_count?: number
  }>
  session_id?: string
}

export interface CliMcpAuthenticateMessage {
  type: 'mcp_authenticate'
  server_name: string
  url: string
  session_id?: string
}

export interface CliMcpOAuthCallbackUrlMessage {
  type: 'mcp_oauth_callback_url'
  server_name: string
  callback_url: string
  session_id?: string
}

// ─── IDE Integration ────────────────────────────────────────────────

export interface CliSelectionChangedMessage {
  type: 'selection_changed'
  file_path?: string
  selection?: { start_line: number; end_line: number; text: string }
  session_id?: string
}

export interface CliVisibilityChangedMessage {
  type: 'visibility_changed'
  visible: boolean
  session_id?: string
}

export interface CliFontConfigurationChangedMessage {
  type: 'font_configuration_changed'
  font_family?: string
  font_size?: number
  session_id?: string
}

export interface CliProactiveSuggestionsUpdateMessage {
  type: 'proactive_suggestions_update'
  suggestions: Array<{
    type: string
    message: string
    priority?: number
  }>
  session_id?: string
}

// ─── Attribution ─────────────────────────────────────────────────────

export interface CliAttributionSnapshotMessage {
  type: 'attribution-snapshot'
  attribution: Record<string, unknown>
  session_id?: string
}

// ─── Error / System ──────────────────────────────────────────────────

export interface CliErrorMessage {
  type: 'error'
  error: string
  error_code?: string
  session_id?: string
}

export interface CliSystemMessage {
  type: 'system'
  subtype?: 'init' | 'info' | 'warning'
  message: string
  session_id?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CLI Content Block Types
// ═══════════════════════════════════════════════════════════════════════════

export type CliContentBlock =
  | CliTextBlock
  | CliToolUseBlock
  | CliToolResultBlock
  | CliThinkingBlock
  | CliImageBlock

export interface CliTextBlock {
  type: 'text'
  text: string
}

export interface CliToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

export interface CliToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | CliContentBlock[]
  is_error?: boolean
}

export interface CliThinkingBlock {
  type: 'thinking'
  thinking: string
}

export interface CliImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Extension → CLI (stdin / WebSocket) Messages
// ═══════════════════════════════════════════════════════════════════════════

export type ExtensionToCliMessage =
  | ExtUserMessage
  | ExtControlResponseMessage
  | ExtConfigUpdateMessage
  | ExtPingMessage
  // Full request types (webview → extension → CLI)
  | ExtInitMessage
  | ExtLoginMessage
  | ExtLogoutMessage
  | ExtSetModelMessage
  | ExtSetPermissionModeMessage
  | ExtSetThinkingLevelMessage
  | ExtToolPermissionResponseMessage
  | ExtExecMessage
  | ExtOpenFileMessage
  | ExtOpenDiffMessage
  | ExtOpenFileDiffsMessage
  | ExtOpenUrlMessage
  | ExtOpenTerminalMessage
  | ExtOpenConfigMessage
  | ExtOpenConfigFileMessage
  | ExtOpenHelpMessage
  | ExtOpenInEditorMessage
  | ExtOpenOutputPanelMessage
  | ExtOpenMarkdownPreviewMessage
  | ExtOpenFolderMessage
  | ExtOpenFolderInNewWindowMessage
  | ExtOpenContentMessage
  | ExtOpenClaudeInTerminalMessage
  | ExtListFilesRequestMessage
  | ExtListSessionsRequestMessage
  | ExtGetSessionMessage
  | ExtDeleteSessionMessage
  | ExtRenameSessionMessage
  | ExtForkConversationMessage
  | ExtTeleportSessionMessage
  | ExtGenerateSessionTitleMessage
  | ExtGetCurrentSelectionMessage
  | ExtGetContextUsageMessage
  | ExtCheckGitStatusMessage
  | ExtCheckoutBranchMessage
  | ExtRewindCodeMessage
  | ExtCreateWorktreeMessage
  | ExtCreateNewBrowserTabMessage
  | ExtGetMcpServersMessage
  | ExtSetMcpServerEnabledMessage
  | ExtReconnectMcpServerMessage
  | ExtClearMcpServerAuthMessage
  | ExtAuthenticateMcpServerMessage
  | ExtSubmitMcpOAuthCallbackUrlMessage
  | ExtMcpToggleMessage
  | ExtMcpSetServersMessage
  | ExtMcpReconnectMessage
  | ExtMcpMessageMessage
  | ExtInsertAtMentionMessage
  | ExtToggleDictationMessage
  | ExtToggleRemoteControlMessage
  | ExtSpeechToTextMessage
  | ExtStartSpeechToTextMessage
  | ExtStopSpeechToTextMessage
  | ExtDismissOnboardingMessage
  | ExtDismissTerminalBannerMessage
  | ExtDismissReviewUpsellBannerMessage
  | ExtClosePlanPreviewMessage
  | ExtPlanCommentMessage
  | ExtRemovePlanCommentMessage
  | ExtCancelRequestMessage
  | ExtSideQuestionMessage
  | ExtSlashCommandResultMessage
  | ExtListPluginsMessage
  | ExtInstallPluginMessage
  | ExtUninstallPluginMessage
  | ExtSetPluginEnabledMessage
  | ExtReloadPluginsMessage
  | ExtListMarketplacesMessage
  | ExtAddMarketplaceMessage
  | ExtRemoveMarketplaceMessage
  | ExtRefreshMarketplaceMessage
  | ExtRequestUsageUpdateMessage
  | ExtEnableJupyterMcpMessage
  | ExtDisableJupyterMcpMessage
  | ExtEnsureChromeMcpEnabledMessage
  | ExtDisableChromeMcpMessage
  | ExtCreateNewConversationTabMessage
  | ExtRenameTabMessage
  | ExtShowNotificationMessage
  | ExtSubmitOAuthCodeMessage
  | ExtUpdateSessionStateMessage
  | ExtUpdateSkippedBranchMessage
  | ExtAskDebuggerHelpMessage
  | ExtGetSettingsMessage
  | ExtApplySettingsMessage
  | ExtGetAssetUrisMessage
  | ExtShowClaudeTerminalSettingMessage
  | ExtSetProactiveMessage
  | ExtLogEventMessage
  | ExtGetClaudeStateMessage

// ─── Core ────────────────────────────────────────────────────────────

export interface ExtUserMessage {
  type: 'user'
  message: { role: 'user'; content: string | ExtUserContentBlock[] }
  parent_tool_use_id?: string | null
  session_id: string
}

export type ExtUserContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export interface ExtControlResponseMessage {
  type: 'control_response'
  request_id: string
  response: { subtype: 'tool_permission'; approved: boolean; always?: boolean }
}

export interface ExtConfigUpdateMessage {
  type: 'config_update'
  config: {
    model?: string
    permissionMode?: PermissionMode
    thinkingBudget?: 'low' | 'medium' | 'high'
    effortLevel?: 'low' | 'medium' | 'high'
    maxTokens?: number
    temperature?: number
  }
}

export interface ExtPingMessage {
  type: 'ping'
  timestamp: number
}

// ─── Auth ────────────────────────────────────────────────────────────

export interface ExtInitMessage { type: 'init'; session_id?: string }
export interface ExtLoginMessage { type: 'login'; method?: string }
export interface ExtLogoutMessage { type: 'logout' }

// ─── Model / Settings ────────────────────────────────────────────────

export interface ExtSetModelMessage { type: 'set_model'; model: string }
export interface ExtSetPermissionModeMessage { type: 'set_permission_mode'; mode: PermissionMode }
export interface ExtSetThinkingLevelMessage { type: 'set_thinking_level'; level: 'low' | 'medium' | 'high' }
export interface ExtGetSettingsMessage { type: 'get_settings' }
export interface ExtApplySettingsMessage { type: 'apply_settings'; settings: Record<string, unknown> }

// ─── Permission ──────────────────────────────────────────────────────

export interface ExtToolPermissionResponseMessage {
  type: 'tool_permission_response'
  request_id: string
  approved: boolean
  always?: boolean
}

// ─── Exec / Open ─────────────────────────────────────────────────────

export interface ExtExecMessage { type: 'exec'; command: string; cwd?: string }
export interface ExtOpenFileMessage { type: 'open_file'; path: string; line?: number; column?: number }
export interface ExtOpenDiffMessage { type: 'open_diff'; file_path: string }
export interface ExtOpenFileDiffsMessage { type: 'open_file_diffs'; file_paths: string[] }
export interface ExtOpenUrlMessage { type: 'open_url'; url: string }
export interface ExtOpenTerminalMessage { type: 'open_terminal'; cwd?: string }
export interface ExtOpenConfigMessage { type: 'open_config' }
export interface ExtOpenConfigFileMessage { type: 'open_config_file'; path?: string }
export interface ExtOpenHelpMessage { type: 'open_help' }
export interface ExtOpenInEditorMessage { type: 'open_in_editor'; content: string; language?: string }
export interface ExtOpenOutputPanelMessage { type: 'open_output_panel' }
export interface ExtOpenMarkdownPreviewMessage { type: 'open_markdown_preview'; content: string }
export interface ExtOpenFolderMessage { type: 'open_folder'; path: string }
export interface ExtOpenFolderInNewWindowMessage { type: 'open_folder_in_new_window'; path: string }
export interface ExtOpenContentMessage { type: 'open_content'; content: string; title?: string }
export interface ExtOpenClaudeInTerminalMessage { type: 'open_claude_in_terminal' }

// ─── Session ─────────────────────────────────────────────────────────

export interface ExtListFilesRequestMessage { type: 'list_files_request'; path?: string; query?: string }
export interface ExtListSessionsRequestMessage { type: 'list_sessions_request' }
export interface ExtGetSessionMessage { type: 'get_session'; session_id: string }
export interface ExtDeleteSessionMessage { type: 'delete_session'; session_id: string }
export interface ExtRenameSessionMessage { type: 'rename_session'; session_id: string; name: string }
export interface ExtForkConversationMessage { type: 'fork_conversation'; session_id: string }
export interface ExtTeleportSessionMessage { type: 'teleport_session'; session_id: string }
export interface ExtGenerateSessionTitleMessage { type: 'generate_session_title'; session_id: string }
export interface ExtUpdateSessionStateMessage { type: 'update_session_state'; session_id: string; state: unknown }
export interface ExtCreateNewConversationTabMessage { type: 'create_new_conversation_tab' }
export interface ExtRenameTabMessage { type: 'rename_tab'; channel_id: string; name: string }

// ─── Selection / Context ─────────────────────────────────────────────

export interface ExtGetCurrentSelectionMessage { type: 'get_current_selection' }
export interface ExtGetContextUsageMessage { type: 'get_context_usage' }

// ─── Git ──────────────────────────────────────────────────────────────

export interface ExtCheckGitStatusMessage { type: 'check_git_status' }
export interface ExtCheckoutBranchMessage { type: 'checkout_branch'; branch: string }
export interface ExtRewindCodeMessage { type: 'rewind_code'; file_path?: string }
export interface ExtUpdateSkippedBranchMessage { type: 'update_skipped_branch'; branch: string; skipped: boolean }

// ─── Worktree ────────────────────────────────────────────────────────

export interface ExtCreateWorktreeMessage { type: 'create_worktree'; branch?: string }

// ─── Browser ─────────────────────────────────────────────────────────

export interface ExtCreateNewBrowserTabMessage { type: 'create_new_browser_tab'; url?: string }

// ─── MCP ─────────────────────────────────────────────────────────────

export interface ExtGetMcpServersMessage { type: 'get_mcp_servers' }
export interface ExtSetMcpServerEnabledMessage { type: 'set_mcp_server_enabled'; server_name: string; enabled: boolean }
export interface ExtReconnectMcpServerMessage { type: 'reconnect_mcp_server'; server_name: string }
export interface ExtClearMcpServerAuthMessage { type: 'clear_mcp_server_auth'; server_name: string }
export interface ExtAuthenticateMcpServerMessage { type: 'authenticate_mcp_server'; server_name: string }
export interface ExtSubmitMcpOAuthCallbackUrlMessage { type: 'submit_mcp_oauth_callback_url'; server_name: string; callback_url: string }
export interface ExtMcpToggleMessage { type: 'mcp_toggle'; server_name: string }
export interface ExtMcpSetServersMessage { type: 'mcp_set_servers'; servers: unknown[] }
export interface ExtMcpReconnectMessage { type: 'mcp_reconnect'; server_name?: string }
export interface ExtMcpMessageMessage { type: 'mcp_message'; server_name: string; method: string; params?: unknown }

// ─── Built-in MCP ────────────────────────────────────────────────────

export interface ExtEnableJupyterMcpMessage { type: 'enable_jupyter_mcp' }
export interface ExtDisableJupyterMcpMessage { type: 'disable_jupyter_mcp' }
export interface ExtEnsureChromeMcpEnabledMessage { type: 'ensure_chrome_mcp_enabled' }
export interface ExtDisableChromeMcpMessage { type: 'disable_chrome_mcp' }

// ─── Mention / Dictation / Speech ────────────────────────────────────

export interface ExtInsertAtMentionMessage { type: 'insert_at_mention'; file_path?: string }
export interface ExtToggleDictationMessage { type: 'toggle_dictation' }
export interface ExtToggleRemoteControlMessage { type: 'toggle_remote_control'; enabled?: boolean }
export interface ExtSpeechToTextMessage { type: 'speech_to_text_message'; channel_id?: string; data?: string }
export interface ExtStartSpeechToTextMessage { type: 'start_speech_to_text' }
export interface ExtStopSpeechToTextMessage { type: 'stop_speech_to_text' }

// ─── UI Dismiss ──────────────────────────────────────────────────────

export interface ExtDismissOnboardingMessage { type: 'dismiss_onboarding' }
export interface ExtDismissTerminalBannerMessage { type: 'dismiss_terminal_banner' }
export interface ExtDismissReviewUpsellBannerMessage { type: 'dismiss_review_upsell_banner' }

// ─── Plan ────────────────────────────────────────────────────────────

export interface ExtClosePlanPreviewMessage { type: 'close_plan_preview' }
export interface ExtPlanCommentMessage { type: 'plan_comment'; comment: string }
export interface ExtRemovePlanCommentMessage { type: 'remove_plan_comment'; comment_id: string }

// ─── Cancel / Side ──────────────────────────────────────────────────

export interface ExtCancelRequestMessage { type: 'cancel_request' }
export interface ExtSideQuestionMessage { type: 'side_question'; question: string }

// ─── Slash Command ───────────────────────────────────────────────────

export interface ExtSlashCommandResultMessage { type: 'slashCommandResult'; result: string }

// ─── Plugin ──────────────────────────────────────────────────────────

export interface ExtListPluginsMessage { type: 'list_plugins' }
export interface ExtInstallPluginMessage { type: 'install_plugin'; plugin_id: string }
export interface ExtUninstallPluginMessage { type: 'uninstall_plugin'; plugin_id: string }
export interface ExtSetPluginEnabledMessage { type: 'set_plugin_enabled'; plugin_id: string; enabled: boolean }
export interface ExtReloadPluginsMessage { type: 'reload_plugins' }
export interface ExtListMarketplacesMessage { type: 'list_marketplaces' }
export interface ExtAddMarketplaceMessage { type: 'add_marketplace'; url: string }
export interface ExtRemoveMarketplaceMessage { type: 'remove_marketplace'; url: string }
export interface ExtRefreshMarketplaceMessage { type: 'refresh_marketplace'; url?: string }

// ─── Usage / Notification ────────────────────────────────────────────

export interface ExtRequestUsageUpdateMessage { type: 'request_usage_update' }
export interface ExtShowNotificationMessage { type: 'show_notification'; message: string; type?: 'info' | 'warning' | 'error' }
export interface ExtSubmitOAuthCodeMessage { type: 'submit_oauth_code'; code: string; state?: string }

// ─── Debugger ────────────────────────────────────────────────────────

export interface ExtAskDebuggerHelpMessage { type: 'ask_debugger_help' }

// ─── Asset / State / Proactive ───────────────────────────────────────

export interface ExtGetAssetUrisMessage { type: 'get_asset_uris' }
export interface ExtShowClaudeTerminalSettingMessage { type: 'show_claude_terminal_setting' }
export interface ExtSetProactiveMessage { type: 'set_proactive'; enabled: boolean }
export interface ExtLogEventMessage { type: 'log_event'; event: string; properties?: Record<string, unknown> }
export interface ExtGetClaudeStateMessage { type: 'get_claude_state' }

// ═══════════════════════════════════════════════════════════════════════════
// 4. Webview → Extension Messages
// ═══════════════════════════════════════════════════════════════════════════

export type WebviewToExtensionMessage =
  // Lifecycle
  | { type: 'ready' }
  | { type: 'submit'; text: string; channel_id?: string }
  | { type: 'stopGeneration'; channel_id?: string }
  | { type: 'newSession' }
  | { type: 'clearChat' }
  // Permission
  | { type: 'permissionResponse'; requestId: string; approved: boolean; always?: boolean }
  // Config
  | { type: 'setModel'; model: string }
  | { type: 'setPermissionMode'; mode: PermissionMode }
  | { type: 'setThinkingLevel'; level: 'low' | 'medium' | 'high' }
  | { type: 'configChange'; config: ExtConfigUpdateMessage['config'] }
  // Open actions
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'openDiff'; filePath: string }
  | { type: 'openUrl'; url: string }
  | { type: 'openTerminal'; cwd?: string }
  | { type: 'openConfig' }
  | { type: 'openHelp' }
  // Diff
  | { type: 'acceptDiff'; filePath: string; toolUseId?: string }
  | { type: 'rejectDiff'; filePath: string; toolUseId?: string }
  // Clipboard
  | { type: 'copyToClipboard'; text: string }
  // Mention
  | { type: 'insertAtMention'; filePath?: string }
  | { type: 'fileSuggestions'; query: string }
  // Session
  | { type: 'listSessions' }
  | { type: 'getSession'; sessionId: string }
  | { type: 'deleteSession'; sessionId: string }
  | { type: 'renameSession'; sessionId: string; name: string }
  | { type: 'forkSession'; sessionId: string }
  // Channel/Tab
  | { type: 'newTab' }
  | { type: 'switchTab'; channelId: string }
  | { type: 'closeTab'; channelId: string }
  | { type: 'renameTab'; channelId: string; name: string }
  // Speech
  | { type: 'toggleDictation' }
  | { type: 'startSpeechToText' }
  | { type: 'stopSpeechToText' }
  // MCP
  | { type: 'getMcpServers' }
  | { type: 'setMcpServerEnabled'; serverName: string; enabled: boolean }
  | { type: 'reconnectMcpServer'; serverName: string }
  // Plugin
  | { type: 'listPlugins' }
  | { type: 'installPlugin'; pluginId: string }
  | { type: 'uninstallPlugin'; pluginId: string }
  // Auth
  | { type: 'login' }
  | { type: 'logout' }
  // Feedback
  | { type: 'feedback'; rating: number; comment?: string }
  // Context
  | { type: 'getContextUsage' }
  | { type: 'attachFile' }
  // Dismiss
  | { type: 'dismissOnboarding' }
  | { type: 'dismissBanner' }

// ═══════════════════════════════════════════════════════════════════════════
// 5. Extension → Webview Messages
// ═══════════════════════════════════════════════════════════════════════════

export type ExtensionToWebviewMessage =
  // Wrapper: all CLI messages forwarded as from-extension
  | { type: 'from-extension'; message: CliStreamMessage }
  // Status
  | { type: 'statusChange'; status: CclocalStatus }
  | { type: 'cliConnected'; version?: string; model?: string; sessionId?: string }
  | { type: 'cliDisconnected' }
  // Channel
  | { type: 'channelUpdate'; channels: ChannelState[] }
  | { type: 'activeChannelChange'; channelId: string }
  // Config sync
  | { type: 'configSync'; config: WebviewConfig }
  | { type: 'modelChange'; model: string }
  // File suggestions
  | { type: 'fileSuggestionsResult'; files: string[] }
  // Session list
  | { type: 'sessionsList'; sessions: SessionSummary[] }
  // Error
  | { type: 'error'; message: string }
  // Session cleared
  | { type: 'sessionCleared' }
  // Auth
  | { type: 'authStatusChange'; status: AuthStatus }
  // Onboarding
  | { type: 'showOnboarding' }

// ═══════════════════════════════════════════════════════════════════════════
// 6. Shared Types
// ═══════════════════════════════════════════════════════════════════════════

export type CclocalStatus = 'idle' | 'connecting' | 'connected' | 'running' | 'stopped' | 'error'

export type PermissionMode = 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions'

export interface WebviewConfig {
  model?: string
  permissionMode?: PermissionMode
  thinkingBudget?: 'low' | 'medium' | 'high'
  effortLevel?: 'low' | 'medium' | 'high'
  useTerminal?: boolean
  preferredLocation?: 'sidebar' | 'panel'
  useCtrlEnterToSend?: boolean
  enableNewConversationShortcut?: boolean
  hideOnboarding?: boolean
  autosave?: boolean
}

export interface ChannelState {
  id: string
  name: string
  status: 'idle' | 'thinking' | 'error'
  sessionId?: string
  title?: string
  isActive: boolean
  unread?: number
}

export interface SessionSummary {
  id: string
  title?: string
  createdAt: number
  updatedAt: number
  model?: string
  costUsd?: number
  numTurns?: number
  status?: 'active' | 'completed' | 'error'
}

export interface AuthStatus {
  loggedIn: boolean
  method?: 'cclocal' | 'anthropic' | 'bedrock' | 'vertex' | 'custom'
  email?: string
  organization?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Tool Categories
// ═══════════════════════════════════════════════════════════════════════════

export const TOOL_CATEGORIES: Record<string, { icon: string; category: string }> = {
  Read: { icon: '📄', category: 'file' },
  Write: { icon: '✏️', category: 'file' },
  Edit: { icon: '📝', category: 'file' },
  MultiEdit: { icon: '📝', category: 'file' },
  Grep: { icon: '🔍', category: 'search' },
  Glob: { icon: '📁', category: 'search' },
  GrepSearch: { icon: '🔎', category: 'search' },
  Bash: { icon: '⌨️', category: 'exec' },
  Task: { icon: '📋', category: 'exec' },
  Agent: { icon: '🤖', category: 'agent' },
  WebFetch: { icon: '🌐', category: 'web' },
  WebSearch: { icon: '🔍', category: 'web' },
  mcp__: { icon: '🔧', category: 'mcp' },
}

/** CLI → Extension message type string set for validation */
export const CLI_MESSAGE_TYPES = new Set([
  'init', 'assistant', 'content_block_start', 'content_block_delta', 'content_block_stop',
  'result', 'thinking', 'text', 'image', 'tool_use', 'tool_result', 'summary',
  'control_request', 'control_response', 'io_message',
  'auth_url', 'authorization_code', 'refresh_token',
  'proposed_diff', 'file_updated', 'rewind_files',
  'session_states_update', 'usage_update', 'ai-title',
  'mcp_status', 'mcp_authenticate', 'mcp_oauth_callback_url',
  'selection_changed', 'visibility_changed', 'font_configuration_changed',
  'proactive_suggestions_update',
  'attribution-snapshot',
  'error', 'system',
] as const)

/** Extension → CLI request type string set for validation */
export const EXT_REQUEST_TYPES = new Set([
  'init', 'login', 'logout',
  'set_model', 'set_permission_mode', 'set_thinking_level',
  'get_settings', 'apply_settings',
  'tool_permission_response',
  'exec',
  'open_file', 'open_diff', 'open_file_diffs', 'open_url',
  'open_terminal', 'open_config', 'open_config_file', 'open_help',
  'open_in_editor', 'open_output_panel', 'open_markdown_preview',
  'open_folder', 'open_folder_in_new_window', 'open_content',
  'open_claude_in_terminal',
  'list_files_request', 'list_sessions_request',
  'get_session', 'delete_session', 'rename_session',
  'fork_conversation', 'teleport_session',
  'generate_session_title',
  'get_current_selection', 'get_context_usage',
  'check_git_status', 'checkout_branch', 'rewind_code',
  'create_worktree', 'create_new_browser_tab',
  'get_mcp_servers', 'set_mcp_server_enabled',
  'reconnect_mcp_server', 'clear_mcp_server_auth',
  'authenticate_mcp_server', 'submit_mcp_oauth_callback_url',
  'mcp_toggle', 'mcp_set_servers', 'mcp_reconnect', 'mcp_message',
  'insert_at_mention', 'toggle_dictation', 'toggle_remote_control',
  'speech_to_text_message', 'start_speech_to_text', 'stop_speech_to_text',
  'dismiss_onboarding', 'dismiss_terminal_banner', 'dismiss_review_upsell_banner',
  'close_plan_preview', 'plan_comment', 'remove_plan_comment',
  'cancel_request', 'side_question', 'slashCommandResult',
  'list_plugins', 'install_plugin', 'uninstall_plugin', 'set_plugin_enabled',
  'reload_plugins', 'list_marketplaces', 'add_marketplace', 'remove_marketplace',
  'refresh_marketplace', 'request_usage_update',
  'enable_jupyter_mcp', 'disable_jupyter_mcp',
  'ensure_chrome_mcp_enabled', 'disable_chrome_mcp',
  'create_new_conversation_tab', 'rename_tab',
  'show_notification', 'submit_oauth_code',
  'update_session_state', 'update_skipped_branch',
  'ask_debugger_help',
  'get_asset_uris', 'show_claude_terminal_setting',
  'set_proactive', 'log_event', 'get_claude_state',
] as const)