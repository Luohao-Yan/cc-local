/**
 * useNativeQuery - Native 后端查询 Hook
 *
 * 封装 Native 后端的查询逻辑，提供与原版 useQuery 一致的接口
 */

import { useCallback, useRef, useState } from 'react'
import type { Message, StreamEvent, MessageOptions, Tool, PermissionPolicy } from '@cclocal/shared'
import type { NativeAdapterConfig, INativeAdapter } from '../types/nativeAdapter.js'

export interface NativeQueryOptions {
  messages: Message[]
  model?: string
  maxTurns?: number
  tools?: Tool[]
  permissionPolicy?: PermissionPolicy
  onPermissionCheck?: (tool: string, input: unknown, reason?: string) => Promise<boolean>
}

export interface NativeQueryResult {
  message: Message
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export interface NativeQueryState {
  isLoading: boolean
  error: Error | null
  abortController: AbortController | null
}

export interface UseNativeQueryReturn {
  query: (options: NativeQueryOptions) => Promise<NativeQueryResult>
  queryStream: (options: NativeQueryOptions, onEvent: (event: StreamEvent) => void) => Promise<NativeQueryResult>
  cancel: () => void
  isLoading: boolean
  error: Error | null
}

/**
 * Native 查询 Hook
 */
export function useNativeQuery(adapter: INativeAdapter | null): UseNativeQueryReturn {
  const [state, setState] = useState<NativeQueryState>({
    isLoading: false,
    error: null,
    abortController: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 执行查询（不使用流式回调）
   */
  const query = useCallback(async (options: NativeQueryOptions): Promise<NativeQueryResult> => {
    if (!adapter) {
      throw new Error('Native adapter not initialized')
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setState(prev => ({ ...prev, isLoading: true, error: null, abortController }))

    try {
      const events: StreamEvent[] = []
      let result: NativeQueryResult | null = null

      for await (const event of adapter.query({
        ...options,
        onStream: (e: any) => events.push(e),
      })) {
        if (abortController.signal.aborted) {
          throw new Error('Query aborted')
        }
      }

      // 从事件中构建结果
      result = buildResultFromEvents(events, options.messages)

      setState(prev => ({ ...prev, isLoading: false, abortController: null }))
      return result

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({ ...prev, isLoading: false, error: err, abortController: null }))
      throw err
    }
  }, [adapter])

  /**
   * 执行流式查询
   */
  const queryStream = useCallback(async (
    options: NativeQueryOptions,
    onEvent: (event: StreamEvent) => void
  ): Promise<NativeQueryResult> => {
    if (!adapter) {
      throw new Error('Native adapter not initialized')
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setState(prev => ({ ...prev, isLoading: true, error: null, abortController }))

    try {
      const events: StreamEvent[] = []

      for await (const event of adapter.query({
        ...options,
        onStream: (e: any) => {
          events.push(e)
          onEvent(e)
        },
      })) {
        if (abortController.signal.aborted) {
          throw new Error('Query aborted')
        }
      }

      const result = buildResultFromEvents(events, options.messages)

      setState(prev => ({ ...prev, isLoading: false, abortController: null }))
      return result

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({ ...prev, isLoading: false, error: err, abortController: null }))
      throw err
    }
  }, [adapter])

  /**
   * 取消查询
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      adapter?.cancel()
    }
    setState(prev => ({ ...prev, isLoading: false, abortController: null }))
  }, [adapter])

  return {
    query,
    queryStream,
    cancel,
    isLoading: state.isLoading,
    error: state.error,
  }
}

/**
 * 从事件构建结果
 */
function buildResultFromEvents(events: StreamEvent[], messages: Message[]): NativeQueryResult {
  let assistantContent = ''
  let inputTokens = 0
  let outputTokens = 0

  for (const event of events) {
    switch (event.type) {
      case 'stream_delta':
        if (event.delta?.type === 'text' && event.delta.text) {
          assistantContent += event.delta.text
        }
        break
      case 'usage':
        inputTokens = event.inputTokens ?? 0
        outputTokens = event.outputTokens ?? 0
        break
    }
  }

  const message: Message = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: [{ type: 'text', text: assistantContent }],
    timestamp: Date.now(),
  }

  return {
    message,
    usage: { inputTokens, outputTokens },
  }
}

export default useNativeQuery
