/**
 * Ink Bridge Renderer
 * Bridges to the Ink UI in packages-native mode
 */

import React from 'react'
import type { RootLaunchOptions } from './launchOptions.js'
import type { Root } from '../ink.js'

export interface InkBridgeOptions {
  rootOptions: RootLaunchOptions
  serverUrl?: string
  authToken?: string
}

/**
 * Initialize MCP servers from config for Bridge mode.
 * The core MCPManager will be used by QueryEngine for tool calls.
 */
async function initializeMcpServers(): Promise<void> {
  try {
    const { getMCPManager } = await import('@cclocal/core')
    const { getAllMcpConfigs } = await import('../services/mcp/config.js')

    const mcpManager = getMCPManager()
    const { servers } = await getAllMcpConfigs()

    // Register servers with the core MCPManager
    for (const [name, config] of Object.entries(servers)) {
      try {
        mcpManager.registerServer(name, config)
      } catch {
        // Server might already be registered
      }
    }

    // Connect all registered servers
    for (const server of mcpManager.listServers()) {
      if (server.status === 'registered' || server.status === 'disconnected') {
        try {
          await mcpManager.connectServer(server.name)
        } catch {
          // Connection failures are recorded in server record
        }
      }
    }
  } catch (error) {
    // MCP initialization failure shouldn't block the REPL
    console.error('MCP initialization failed:', error)
  }
}

/**
 * Render Ink Bridge REPL
 * Starts the Ink UI and communicates with backend via bridge
 */
export async function renderInkBridgeRepl(
  root: Root,
  options: InkBridgeOptions
): Promise<void> {
  const { rootOptions, serverUrl, authToken } = options

  // Initialize MCP servers for Bridge mode
  await initializeMcpServers()

  // Dynamically import Ink UI components
  const { App } = await import('../components/App.js')
  const { REPL } = await import('../screens/REPL.js')
  const { renderAndRun } = await import('../ink.js')

  // Build bridge client (if server URL provided)
  let bridgeClient: any = undefined
  if (serverUrl) {
    try {
      const { CCLocalClient } = await import('../client/CCLocalClient.js')
      bridgeClient = new CCLocalClient({
        serverUrl,
        authToken,
      })
      await bridgeClient.connect()
      console.log(`   Connected to server: ${serverUrl}`)
    } catch (error) {
      console.error('Failed to connect to server:', error)
      // Continue with local mode
    }
  }

  // Build REPL props
  const replProps = {
    model: rootOptions.model,
    cwd: rootOptions.cwd || process.cwd(),
    sessionId: rootOptions.sessionId,
    print: rootOptions.print,
    outputFormat: rootOptions.outputFormat || 'text',
    resume: Boolean(rootOptions.sessionId),
    bridgeClient,
  }

  // Build App props
  const appProps = {
    getFpsMetrics: () => undefined,
    stats: undefined,
    initialState: undefined,
  }

  // Render Ink UI
  await renderAndRun(
    root,
    React.createElement(App, appProps, React.createElement(REPL, replProps))
  )

  // Cleanup bridge client
  if (bridgeClient) {
    await bridgeClient.disconnect()
  }
}

/**
 * Check if Ink bridge mode should be used
 */
export function shouldUseInkBridge(args: string[]): boolean {
  return args.includes('--ink-bridge') || args.includes('--legacy-bridge') || args.includes('--ink') || args.includes('--legacy')
}

/**
 * Get bridge server URL
 */
export function getBridgeServerUrl(args: string[]): string | undefined {
  const serverIndex = args.indexOf('--server')
  if (serverIndex !== -1 && args[serverIndex + 1]) {
    return args[serverIndex + 1]
  }

  // Default local server address
  return 'http://127.0.0.1:5678'
}
