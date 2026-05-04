/**
 * Legacy Bridge 渲染器
 * 在 packages-native 模式下桥接到 legacy UI
 */

import React from 'react'
import type { RootLaunchOptions } from './launchOptions.js'
import type { Root } from '../ink.js'

export interface LegacyBridgeOptions {
  rootOptions: RootLaunchOptions
  serverUrl?: string
  authToken?: string
}

/**
 * 渲染 Legacy Bridge REPL
 * 启动 legacy UI 但通过 bridge 与后端通信
 */
export async function renderLegacyBridgeRepl(
  root: Root,
  options: LegacyBridgeOptions
): Promise<void> {
  const { rootOptions, serverUrl, authToken } = options

  // 动态导入 legacy UI 组件
  const { App } = await import('../components/App.js')
  const { REPL } = await import('../screens/REPL.js')
  const { renderAndRun } = await import('../ink.js')

  // 构建 bridge 客户端（如果提供了服务器地址）
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
      // 继续使用本地模式
    }
  }

  // 构建 REPL props
  const replProps = {
    model: rootOptions.model,
    cwd: rootOptions.cwd || process.cwd(),
    sessionId: rootOptions.sessionId,
    print: rootOptions.print,
    outputFormat: rootOptions.outputFormat || 'text',
    resume: Boolean(rootOptions.sessionId),
    bridgeClient,
  }

  // 构建 App props
  const appProps = {
    getFpsMetrics: () => undefined,
    stats: undefined,
    initialState: undefined,
  }

  // 渲染 legacy UI
  await renderAndRun(
    root,
    React.createElement(App, appProps, React.createElement(REPL, replProps))
  )

  // 清理 bridge 客户端
  if (bridgeClient) {
    await bridgeClient.disconnect()
  }
}

/**
 * 检查是否应该使用 legacy bridge 模式
 */
export function shouldUseLegacyBridge(args: string[]): boolean {
  return args.includes('--legacy-bridge') || args.includes('--legacy')
}

/**
 * 获取 bridge 服务器地址
 */
export function getBridgeServerUrl(args: string[]): string | undefined {
  const serverIndex = args.indexOf('--server')
  if (serverIndex !== -1 && args[serverIndex + 1]) {
    return args[serverIndex + 1]
  }

  // 默认本地服务器地址
  return 'http://127.0.0.1:5678'
}
