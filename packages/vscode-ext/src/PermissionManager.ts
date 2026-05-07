/**
 * Permission Manager for CCLocal VS Code Extension
 * Handles permission requests and mode management
 */

import * as vscode from 'vscode'
import type { PermissionMode, PermissionRequest, PermissionResponse } from '@cclocal/shared'
import { ConfigurationManager } from './ConfigurationManager'

// ─── Tool Risk Levels ──────────────────────────────────────────────────────────

const TOOL_RISK_LEVELS: Record<string, 'low' | 'medium' | 'high'> = {
  // Low risk - read-only operations
  Read: 'low',
  Glob: 'low',
  Grep: 'low',
  WebFetch: 'low',
  WebSearch: 'low',

  // Medium risk - modifications with preview
  Edit: 'medium',
  Write: 'medium',

  // High risk - system operations
  Bash: 'high',
  Agent: 'high',
}

const FILE_EDIT_TOOLS = ['Edit', 'Write', 'MultiEdit']
const DANGEROUS_TOOLS = ['Bash', 'Agent']

export class PermissionManager {
  private config: ConfigurationManager
  private savedPermissions: Map<string, 'allow' | 'deny'> = new Map()
  private pendingRequests: Map<string, { resolve: (response: PermissionResponse) => void }> = new Map()

  private onPermissionRequestEmitter = new vscode.EventEmitter<PermissionRequest>()
  private onPermissionChangeEmitter = new vscode.EventEmitter<void>()

  constructor(config: ConfigurationManager) {
    this.config = config
  }

  // ─── Permission Handling ─────────────────────────────────────────────────────

  /**
   * Check if a tool call is allowed based on current permission mode
   */
  async checkPermission(
    toolName: string,
    toolInput: unknown,
    description?: string
  ): Promise<PermissionResponse> {
    const mode = this.config.getInitialPermissionMode()

    // 1. Check saved permissions
    const savedPermission = this.savedPermissions.get(toolName)
    if (savedPermission) {
      return { behavior: savedPermission }
    }

    // 2. Check permission mode
    if (mode === 'bypassPermissions') {
      return { behavior: 'allow' }
    }

    if (mode === 'plan') {
      return {
        behavior: 'deny',
        message: 'Plan mode is active. No operations will be executed.',
      }
    }

    if (mode === 'acceptEdits' && FILE_EDIT_TOOLS.includes(toolName)) {
      return { behavior: 'allow' }
    }

    // 3. Determine risk level
    const riskLevel = TOOL_RISK_LEVELS[toolName] || 'medium'

    // 4. Low risk tools might be auto-allowed
    if (riskLevel === 'low' && mode !== 'default') {
      return { behavior: 'allow' }
    }

    // 5. Show permission dialog
    const request: PermissionRequest = {
      id: this.generateRequestId(),
      toolName,
      toolInput,
      description: description || this.generateDescription(toolName, toolInput),
      riskLevel,
      timestamp: Date.now(),
    }

    return this.requestUserPermission(request)
  }

  /**
   * Request user permission through the webview
   */
  private async requestUserPermission(request: PermissionRequest): Promise<PermissionResponse> {
    return new Promise((resolve) => {
      // Store pending request
      this.pendingRequests.set(request.id, { resolve })

      // Emit event for webview to handle
      this.onPermissionRequestEmitter.fire(request)

      // Also show VS Code notification as fallback
      this.showPermissionNotification(request)
    })
  }

  /**
   * Show VS Code notification for permission request
   */
  private async showPermissionNotification(request: PermissionRequest): Promise<void> {
    const actions = ['Allow Once', 'Allow Always', 'Deny']
    const result = await vscode.window.showInformationMessage(
      `[CCLocal] ${request.toolName}: ${request.description}`,
      { modal: false },
      ...actions
    )

    if (result) {
      const response = this.parseNotificationResponse(result)
      this.handlePermissionResponse(request.id, response.behavior, response.always)
    }
  }

  /**
   * Handle permission response from webview or notification
   */
  handlePermissionResponse(requestId: string, behavior: 'allow' | 'deny', always?: boolean): void {
    const pending = this.pendingRequests.get(requestId)
    if (!pending) {
      return
    }

    // Save permission if "always" is selected
    if (always && pending) {
      const request = Array.from(this.pendingRequests.entries())
        .find(([id]) => id === requestId)

      if (request) {
        // Get tool name from the request - we need to track this
        this.savedPermissions.set(requestId.split('-')[0], behavior)
      }
    }

    // Resolve the promise
    pending.resolve({ behavior, always })
    this.pendingRequests.delete(requestId)
  }

  // ─── Permission Rules ────────────────────────────────────────────────────────

  /**
   * Add a permission rule
   */
  addPermissionRule(toolName: string, behavior: 'allow' | 'deny'): void {
    this.savedPermissions.set(toolName, behavior)
    this.onPermissionChangeEmitter.fire()
  }

  /**
   * Remove a permission rule
   */
  removePermissionRule(toolName: string): void {
    this.savedPermissions.delete(toolName)
    this.onPermissionChangeEmitter.fire()
  }

  /**
   * Get all saved permissions
   */
  getSavedPermissions(): Map<string, 'allow' | 'deny'> {
    return new Map(this.savedPermissions)
  }

  /**
   * Clear all saved permissions
   */
  clearSavedPermissions(): void {
    this.savedPermissions.clear()
    this.onPermissionChangeEmitter.fire()
  }

  // ─── Utility Methods ─────────────────────────────────────────────────────────

  /**
   * Check if a tool is a file edit tool
   */
  isFileEditTool(toolName: string): boolean {
    return FILE_EDIT_TOOLS.includes(toolName)
  }

  /**
   * Check if a tool is dangerous
   */
  isDangerousTool(toolName: string): boolean {
    return DANGEROUS_TOOLS.includes(toolName)
  }

  /**
   * Get risk level for a tool
   */
  getRiskLevel(toolName: string): 'low' | 'medium' | 'high' {
    return TOOL_RISK_LEVELS[toolName] || 'medium'
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  get onPermissionRequest(): vscode.Event<PermissionRequest> {
    return this.onPermissionRequestEmitter.event
  }

  get onPermissionChange(): vscode.Event<void> {
    return this.onPermissionChangeEmitter.event
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  private generateRequestId(): string {
    return `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  private generateDescription(toolName: string, input: unknown): string {
    const inputObj = input as Record<string, unknown>

    switch (toolName) {
      case 'Read':
        return `Read file: ${inputObj?.file_path || 'unknown'}`

      case 'Edit':
        return `Edit file: ${inputObj?.file_path || 'unknown'}`

      case 'Write':
        return `Write file: ${inputObj?.file_path || 'unknown'}`

      case 'Bash':
        return `Execute command: ${(inputObj?.command as string)?.slice(0, 50) || 'unknown'}...`

      case 'Glob':
        return `Search files: ${inputObj?.pattern || 'unknown'}`

      case 'Grep':
        return `Search content: ${inputObj?.pattern || 'unknown'}`

      case 'WebFetch':
        return `Fetch URL: ${inputObj?.url || 'unknown'}`

      case 'WebSearch':
        return `Search web: ${inputObj?.query || 'unknown'}`

      default:
        return `Execute tool: ${toolName}`
    }
  }

  private parseNotificationResponse(result: string): { behavior: 'allow' | 'deny'; always?: boolean } {
    switch (result) {
      case 'Allow Once':
        return { behavior: 'allow' }
      case 'Allow Always':
        return { behavior: 'allow', always: true }
      case 'Deny':
        return { behavior: 'deny' }
      default:
        return { behavior: 'deny' }
    }
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.onPermissionRequestEmitter.dispose()
    this.onPermissionChangeEmitter.dispose()
    this.pendingRequests.clear()
  }
}
