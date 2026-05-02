/**
 * Chrome Integration for native REPL
 *
 * Non-React equivalent of the Chrome setup flow from main.tsx —
 * checks if Claude in Chrome should be enabled (via --chrome flag,
 * env var, or config default), calls setupClaudeInChrome() to get
 * MCP config / allowed tools / system prompt, and registers the
 * claude-in-chrome MCP server on the core's MCPManager.
 */

import {
  shouldEnableClaudeInChrome,
  shouldAutoEnableClaudeInChrome,
  setupClaudeInChrome,
} from '../utils/claudeInChrome/setup.js'
import {
  CLAUDE_IN_CHROME_SKILL_HINT,
  CLAUDE_IN_CHROME_SKILL_HINT_WITH_WEBBROWSER,
} from '../utils/claudeInChrome/prompt.js'
import type { MCPServerConfig } from '@cclocal/core'

export interface ChromeIntegrationResult {
  /** Whether Chrome integration was set up */
  enabled: boolean
  /** Chrome system prompt for injection (full or hint) */
  systemPrompt: string
}

/**
 * Detect and set up Chrome integration for the native REPL.
 *
 * Mirrors the decision flow from main.tsx:
 *  1. If `chromeFlag` is explicitly true/false, respect it
 *  2. Otherwise check env vars and config defaults
 *  3. If auto-enable conditions are met, install with hint-only prompt
 *  4. Register the MCP server on the core's MCPManager
 */
export async function setupChromeIntegration(
  chromeFlag: boolean | undefined,
  mcpManager: import('@cclocal/core').MCPManager,
): Promise<ChromeIntegrationResult> {
  const enableChrome = shouldEnableClaudeInChrome(chromeFlag)
  const autoEnable = !enableChrome && shouldAutoEnableClaudeInChrome()

  if (!enableChrome && !autoEnable) {
    return { enabled: false, systemPrompt: '' }
  }

  try {
    const { mcpConfig, allowedTools, systemPrompt } = setupClaudeInChrome()

    // Register the claude-in-chrome MCP server on the core's MCPManager
    const serverEntry = mcpConfig[Object.keys(mcpConfig)[0]!]
    if (serverEntry) {
      const mcpServerConfig: MCPServerConfig = {
        type: serverEntry.type as MCPServerConfig['type'],
        command: serverEntry.command,
        args: serverEntry.args,
        env: serverEntry.env as Record<string, string> | undefined,
        syncToolsToRegistry: true,
      }

      if (!mcpManager.getServer('claude-in-chrome')) {
        mcpManager.registerServer({
          name: 'claude-in-chrome',
          config: mcpServerConfig,
        })
        await mcpManager.connectServer('claude-in-chrome')
      }
    }

    if (enableChrome) {
      // Full enablement — use the complete system prompt
      return { enabled: true, systemPrompt: systemPrompt }
    } else {
      // Auto-enable — just inject the skill hint so the model knows
      // it can invoke the skill before using MCP tools
      const hint = CLAUDE_IN_CHROME_SKILL_HINT
      return { enabled: true, systemPrompt: hint }
    }
  } catch (err) {
    // Auto-enable failures are silent; explicit --chrome failures propagate
    if (enableChrome) {
      throw err
    }
    return { enabled: false, systemPrompt: '' }
  }
}
