/**
 * NativeREPL - Packages-Native 完整 REPL 入口
 *
 * 复用原版 REPL.tsx 组件，注入 Native 后端适配器
 * 保持 100% 功能兼容
 */

import React, { useMemo, useEffect, useState } from 'react'
import { REPL } from '../screens/REPL.js'
import { NativeBridgeAdapter } from '../bridge/nativeBridgeAdapter.js'
import type { NativeAdapterConfig, INativeAdapter } from '../types/nativeAdapter.js'

export interface NativeREPLProps {
  /** 适配器配置 */
  config: NativeAdapterConfig
  /** 模型 */
  model?: string
  /** 工作目录 */
  cwd?: string
  /** 调试模式 */
  debug?: boolean
  /** 初始消息 */
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  /** 其他 REPL props */
  [key: string]: unknown
}

/**
 * Native REPL 组件
 *
 * 包装原版 REPL，注入 Native 后端适配器
 */
export function NativeREPL(props: NativeREPLProps): React.ReactElement {
  const { config, model, cwd, debug, initialMessages, ...restProps } = props

  // 创建适配器实例
  const adapter = useMemo(() => {
    return new NativeBridgeAdapter({
      mode: config.mode,
      serverUrl: config.serverUrl,
      authToken: config.authToken,
      sessionId: config.sessionId,
    })
  }, [config.mode, config.serverUrl, config.authToken, config.sessionId])

  // 初始化状态
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<Error | null>(null)

  // 初始化适配器
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await adapter.initialize()
        if (mounted) {
          setIsInitialized(true)
        }
      } catch (error) {
        if (mounted) {
          setInitError(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }

    init()

    return () => {
      mounted = false
      adapter.dispose()
    }
  }, [adapter])

  // 错误处理
  if (initError) {
    return (
      <box flexDirection="column" padding={1}>
        <text color="red" bold>❌ Native Adapter 初始化失败</text>
        <text>{initError.message}</text>
        <text dimColor>请检查服务器配置和网络连接</text>
      </box>
    )
  }

  // 加载中
  if (!isInitialized) {
    return (
      <box flexDirection="column" padding={1}>
        <text>⏳ 正在连接 Native 后端...</text>
        <text dimColor>模式: {config.mode}</text>
        {config.serverUrl && <text dimColor>服务器: {config.serverUrl}</text>}
      </box>
    )
  }

  // 渲染原版 REPL，注入 Native 适配器
  return (
    <REPL
      {...restProps}
      model={model}
      cwd={cwd}
      debug={debug}
      initialMessages={initialMessages}
      nativeAdapter={adapter as INativeAdapter}
    />
  )
}

export default NativeREPL
