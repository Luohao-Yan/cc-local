/**
 * IDE Integration for native REPL
 *
 * Non-React equivalent of useIDEIntegration — detects available IDEs via
 * lockfile polling, registers the IDE as a WebSocket MCP server on the core's
 * MCPManager, and provides IDE metadata for system-prompt injection.
 */

import type { DetectedIDEInfo } from '../utils/ide.js'
import {
  findAvailableIDE,
  initializeIdeIntegration,
  isSupportedTerminal,
} from '../utils/ide.js'
import { getGlobalConfig } from '../utils/config.js'
import { isEnvDefinedFalsy, isEnvTruthy } from '../utils/envUtils.js'
import type { MCPServerConfig } from '@cclocal/core'

export interface IdeIntegrationResult {
  /** The detected IDE info (null if none found) */
  ide: DetectedIDEInfo | null
  /** MCP server config for the IDE (null if no IDE) */
  mcpConfig: MCPServerConfig | null
  /** IDE metadata string for system-prompt injection */
  metadataString: string
}

/**
 * Detect and connect to an available IDE.
 *
 * This is the non-React counterpart of the useIDEIntegration hook.
 * It reuses the same `findAvailableIDE()` + `initializeIdeIntegration()`
 * utilities from utils/ide.ts, but instead of setting React state, it
 * returns the result directly.
 */
export async function detectAndConnectIDE(
  ideFlag: boolean,
  mcpManager: import('@cclocal/core').MCPManager,
): Promise<IdeIntegrationResult> {
  // Check if auto-connect is enabled (mirrors useIDEIntegration logic)
  const globalConfig = getGlobalConfig()
  const autoConnectEnabled =
    (globalConfig.autoConnectIde ||
      ideFlag ||
      isSupportedTerminal() ||
      process.env.CLAUDE_CODE_SSE_PORT ||
      isEnvTruthy(process.env.CLAUDE_CODE_AUTO_CONNECT_IDE)) &&
    !isEnvDefinedFalsy(process.env.CLAUDE_CODE_AUTO_CONNECT_IDE)

  if (!autoConnectEnabled) {
    return { ide: null, mcpConfig: null, metadataString: '' }
  }

  // Detect the IDE
  const ide = await findAvailableIDE()

  if (!ide) {
    return { ide: null, mcpConfig: null, metadataString: '' }
  }

  // Build MCP server config for the IDE
  const mcpConfig: MCPServerConfig = {
    type: ide.url.startsWith('ws:') ? 'ws' : 'sse',
    url: ide.url,
    syncToolsToRegistry: true,
    authToken: ide.authToken,
    ideRunningInWindows: ide.ideRunningInWindows,
  }

  // Register the IDE as an MCP server in the core's MCPManager
  try {
    if (!mcpManager.getServer('ide')) {
      mcpManager.registerServer({
        name: 'ide',
        config: mcpConfig,
      })
      await mcpManager.connectServer('ide')
    }
  } catch (err) {
    // Connection failure is non-fatal — the REPL can still work without IDE
    console.error(`IDE MCP connection failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Build IDE metadata string for system-prompt injection
  const metadataString = buildIdeMetadataString(ide)

  return { ide, mcpConfig, metadataString }
}

function buildIdeMetadataString(ide: DetectedIDEInfo): string {
  const lines: string[] = [
    `IDE: ${ide.name}`,
    `IDE workspace folders: ${ide.workspaceFolders.join(', ')}`,
  ]
  return lines.join('\n')
}
