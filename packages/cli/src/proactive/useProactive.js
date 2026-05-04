/**
 * useProactive Hook - Shim
 *
 * 用于主动模式的 React Hook
 * 原始功能在 PROACTIVE feature 启用时可用
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * 主动模式 Hook
 */
export function useProactive(options) {
  const {
    tickInterval = 30000,
    maxConsecutiveTicks = 100,
    enabled = false,
  } = options || {}

  const [state, setState] = useState({
    isActive: false,
    isPaused: false,
    consecutiveTicks: 0,
    lastTickAt: null,
  })

  const activate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      isPaused: false,
      consecutiveTicks: 0,
      lastTickAt: Date.now(),
    }))
  }, [])

  const deactivate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      isPaused: false,
      consecutiveTicks: 0,
      lastTickAt: null,
    }))
  }, [])

  const pause = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: true,
    }))
  }, [])

  const resume = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: false,
      lastTickAt: Date.now(),
    }))
  }, [])

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      consecutiveTicks: 0,
      lastTickAt: Date.now(),
    }))
  }, [])

  // Tick 计时器
  useEffect(() => {
    if (!enabled || !state.isActive || state.isPaused) {
      return
    }

    const timer = setInterval(() => {
      setState(prev => {
        const newCount = prev.consecutiveTicks + 1
        if (newCount >= maxConsecutiveTicks) {
          return {
            ...prev,
            isPaused: true,
            consecutiveTicks: newCount,
            lastTickAt: Date.now(),
          }
        }
        return {
          ...prev,
          consecutiveTicks: newCount,
          lastTickAt: Date.now(),
        }
      })
    }, tickInterval)

    return () => clearInterval(timer)
  }, [enabled, state.isActive, state.isPaused, tickInterval, maxConsecutiveTicks])

  return {
    ...state,
    activate,
    deactivate,
    pause,
    resume,
    reset,
  }
}

export default useProactive
