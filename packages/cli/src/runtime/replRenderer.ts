/**
 * REPL 渲染器
 * 负责启动交互式 REPL 界面
 *
 * 支持两种模式:
 * 1. Legacy 模式: 使用 legacy UI 组件
 * 2. Native 模式: 使用 NativeBridgeAdapter
 */

import React from 'react'
import type { RootLaunchOptions } from './launchOptions.js'
import { launchRepl } from '../replLauncher.js'
import type { Root } from '../ink.js'
import type { AppState } from '../state/AppStateStore.js'
import type { StatsStore } from '../context/stats.js'
import type { FpsMetrics } from '../utils/fpsTracker.js'
import type { NativeBridgeMode } from '../bridge/nativeBridgeAdapter.js'

export interface RenderReplOptions {
  rootOptions: RootLaunchOptions
  appState: AppState
  stats?: StatsStore
  getFpsMetrics?: () => FpsMetrics | undefined
}

/**
 * Native 模式配置
 */
export interface NativeRenderOptions extends RenderReplOptions {
  /** Native 桥接模式 */
  bridgeMode: NativeBridgeMode
  /** 服务器 URL (远程模式) */
  serverUrl?: string
  /** 认证令牌 */
  authToken?: string
}

/**
 * 渲染交互式 REPL
 * 这是 packages-native 模式的入口点
 */
export async function renderInteractiveRepl(
  root: Root,
  options: RenderReplOptions | NativeRenderOptions
): Promise<void> {
  const { rootOptions, appState, stats, getFpsMetrics } = options

  // 检查是否是 Native 模式
  const isNativeMode = 'bridgeMode' in options

  if (isNativeMode) {
    return renderNativeRepl(root, options as NativeRenderOptions)
  }

  // Legacy 模式
  // 构建 REPL props
  const replProps = {
    model: rootOptions.model,
    cwd: rootOptions.cwd || process.cwd(),
    sessionId: rootOptions.sessionId,
    print: rootOptions.print,
    outputFormat: rootOptions.outputFormat || 'text',
    resume: Boolean(rootOptions.sessionId),
  }

  // 构建 App props
  const appProps = {
    getFpsMetrics: getFpsMetrics || (() => undefined),
    stats,
    initialState: appState,
  }

  // 使用标准的 renderAndRun 实现
  const { renderAndRun } = await import('../ink.js')

  await launchRepl(root, appProps, replProps, renderAndRun)
}

/**
 * 渲染 Native 模式 REPL
 */
async function renderNativeRepl(
  root: Root,
  options: NativeRenderOptions
): Promise<void> {
  const { rootOptions, appState, stats, getFpsMetrics, bridgeMode, serverUrl, authToken } = options

  // 创建 NativeBridgeAdapter
  const { NativeBridgeAdapter, createLocalBridgeAdapter, createRemoteBridgeAdapter } =
    await import('../bridge/nativeBridgeAdapter.js')

  let adapter
  if (bridgeMode === 'remote' && serverUrl) {
    adapter = createRemoteBridgeAdapter(serverUrl, {
      authToken,
      model: rootOptions.model,
    })
  } else {
    adapter = createLocalBridgeAdapter({
      model: rootOptions.model,
    })
  }

  try {
    await adapter.initialize()

    // 构建 REPL props (适配 native 模式)
    const replProps = {
      model: rootOptions.model,
      cwd: rootOptions.cwd || process.cwd(),
      sessionId: rootOptions.sessionId,
      print: rootOptions.print,
      outputFormat: rootOptions.outputFormat || 'text',
      resume: Boolean(rootOptions.sessionId),
      // 添加 adapter 供 REPL 使用
      nativeAdapter: adapter,
    }

    // 构建 App props
    const appProps = {
      getFpsMetrics: getFpsMetrics || (() => undefined),
      stats,
      initialState: appState,
    }

    // 使用标准的 renderAndRun 实现
    const { renderAndRun } = await import('../ink.js')

    await launchRepl(root, appProps, replProps, renderAndRun)
  } finally {
    await adapter.dispose()
  }
}

/**
 * 渲染单次提示模式
 */
export async function renderSinglePrompt(
  root: Root,
  options: RenderReplOptions
): Promise<void> {
  const { rootOptions, appState } = options

  if (!rootOptions.print) {
    throw new Error('No prompt provided for single-prompt mode')
  }

  // 单次提示模式 - 直接执行后退出
  const { Query } = await import('../query.js')
  const query = new Query({
    model: rootOptions.model,
    cwd: rootOptions.cwd || process.cwd(),
  })

  try {
    const result = await query.execute(rootOptions.print)
    console.log(result)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

/**
 * 使用 NativeBridgeAdapter 渲染单次提示
 */
export async function renderNativeSinglePrompt(
  prompt: string,
  options: {
    bridgeMode: NativeBridgeMode
    serverUrl?: string
    authToken?: string
    model?: string
    maxTurns?: number
  }
): Promise<string> {
  const { NativeBridgeAdapter, createLocalBridgeAdapter, createRemoteBridgeAdapter } =
    await import('../bridge/nativeBridgeAdapter.js')

  let adapter
  if (options.bridgeMode === 'remote' && options.serverUrl) {
    adapter = createRemoteBridgeAdapter(options.serverUrl, {
      authToken: options.authToken,
      model: options.model,
      maxTurns: options.maxTurns,
    })
  } else {
    adapter = createLocalBridgeAdapter({
      model: options.model,
      maxTurns: options.maxTurns,
    })
  }

  try {
    await adapter.initialize()

    const messages = [{
      id: `user_${Date.now()}`,
      role: 'user' as const,
      content: [{ type: 'text' as const, text: prompt }],
      timestamp: Date.now(),
    }]

    let fullResponse = ''

    for await (const event of adapter.query({ messages })) {
      if (event.type === 'stream_event') {
        const e = event.event as Record<string, unknown>
        if (e.type === 'content_block_delta') {
          const delta = e.delta as Record<string, unknown>
          if (delta.type === 'text_delta') {
            fullResponse += delta.text as string
          }
        }
      } else if (event.type === 'message') {
        // Final message received
        const msg = event.message
        if (msg && 'content' in msg) {
          const content = msg.content
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text') {
                fullResponse += block.text
              }
            }
          }
        }
      }
    }

    return fullResponse
  } finally {
    await adapter.dispose()
  }
}
