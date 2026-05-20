/**
 * Simple Observable State Management
 * A lightweight MobX-like implementation for reactive state
 */

type Reaction = () => void
type ComputedGetter<T> = () => T
type Action = () => void

// 当前正在执行的 reaction（用于依赖追踪）
let currentReaction: Reaction | null = null

// 所有 reaction 的集合
const reactions = new Set<Reaction>()

/**
 * 创建可观察值
 */
export function observable<T>(value: T): { get: () => T; set: (v: T) => void } {
  const subscribers = new Set<Reaction>()

  return {
    get() {
      // 追踪依赖
      if (currentReaction) {
        subscribers.add(currentReaction)
      }
      return value
    },
    set(newValue: T) {
      if (newValue !== value) {
        value = newValue
        // 触发更新
        for (const reaction of subscribers) {
          reaction()
        }
      }
    },
  }
}

/**
 * 创建计算值
 */
export function computed<T>(getter: () => T): () => T {
  let cachedValue: T
  let isDirty = true
  const dependencies = new Set<Reaction>()

  const computedGetter = () => {
    if (isDirty) {
      // 重新计算
      const prevReaction = currentReaction
      currentReaction = () => {
        isDirty = true
      }
      cachedValue = getter()
      currentReaction = prevReaction
      isDirty = false
    }
    return cachedValue
  }

  return computedGetter
}

/**
 * 自动追踪依赖并响应变化
 */
export function autorun(fn: Reaction): () => void {
  const reaction = () => {
    const prevReaction = currentReaction
    currentReaction = reaction
    fn()
    currentReaction = prevReaction
  }

  reactions.add(reaction)
  reaction() // 立即执行一次

  return () => {
    reactions.delete(reaction)
  }
}

/**
 * 创建动作（批量更新）
 */
export function action<T extends Action>(fn: T): T {
  return ((...args: unknown[]) => {
    const prevReaction = currentReaction
    currentReaction = null // 暂停依赖追踪
    fn()
    currentReaction = prevReaction
  }) as T
}

/**
 * 观察对象（将对象属性转换为 observable）
 */
export function observableObject<T extends object>(obj: T): T {
  const result: any = {}

  for (const key of Object.keys(obj)) {
    const obs = observable((obj as any)[key])
    Object.defineProperty(result, key, {
      get: obs.get,
      set: obs.set,
      enumerable: true,
      configurable: true,
    })
  }

  return result
}

/**
 * 创建观察数组
 */
export function observableArray<T>(items: T[]): {
  get: () => T[]
  push: (item: T) => number
  pop: () => T | undefined
  splice: (start: number, deleteCount?: number) => T[]
  set: (index: number, value: T) => void
  length: () => number
} {
  const subscribers = new Set<Reaction>()
  let arr = [...items]

  return {
    get() {
      if (currentReaction) {
        subscribers.add(currentReaction)
      }
      return arr
    },
    push(item: T) {
      const result = arr.push(item)
      for (const reaction of subscribers) {
        reaction()
      }
      return result
    },
    pop() {
      const result = arr.pop()
      for (const reaction of subscribers) {
        reaction()
      }
      return result
    },
    splice(start: number, deleteCount?: number) {
      const result = arr.splice(start, deleteCount)
      for (const reaction of subscribers) {
        reaction()
      }
      return result
    },
    set(index: number, value: T) {
      arr[index] = value
      for (const reaction of subscribers) {
        reaction()
      }
    },
    length: () => arr.length,
  }
}

/**
 * React Hook: 使用 observable 值
 */
import { useState, useEffect, useCallback } from 'react'

export function useObservable<T>(
  obs: { get: () => T; set: (v: T) => void }
): [T, (v: T) => void] {
  const [value, setValue] = useState(() => obs.get())

  useEffect(() => {
    const dispose = autorun(() => {
      setValue(obs.get())
    })
    return dispose
  }, [obs])

  const set = useCallback((v: T) => {
    obs.set(v)
  }, [obs])

  return [value, set]
}

/**
 * React Hook: 使用 computed 值
 */
export function useComputed<T>(getter: () => T): T {
  const [value, setValue] = useState(() => getter())

  useEffect(() => {
    const dispose = autorun(() => {
      setValue(getter())
    })
    return dispose
  }, [getter])

  return value
}
