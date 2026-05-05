/**
 * Event Emitter for Native REPL
 *
 * Provides a unified event system for:
 * - Keyboard events
 * - Terminal events (resize, focus)
 * - UI state changes
 */

export type EventHandler<T = unknown> = (data: T) => void

export interface KeyEvent {
  /** Key name (e.g., 'enter', 'escape', 'up', 'down') */
  name: string
  /** Control key pressed */
  ctrl: boolean
  /** Meta/Alt key pressed */
  meta: boolean
  /** Shift key pressed */
  shift: boolean
  /** Raw sequence */
  sequence: string
}

export interface ResizeEvent {
  /** New terminal height */
  rows: number
  /** New terminal width */
  columns: number
}

export type EventMap = {
  'key:press': KeyEvent
  'key:submit': string
  'key:interrupt': void
  'terminal:resize': ResizeEvent
  'terminal:focus': void
  'terminal:blur': void
  'scroll:up': number
  'scroll:down': number
  'message:add': { id: string; content: string; type: string }
  'message:update': { id: string; updates: Record<string, unknown> }
  'mode:change': { from: string; to: string }
  'permission:request': { tool: string; input: unknown }
  'permission:response': { tool: string; allowed: boolean }
  'processing:start': void
  'processing:end': void
  'error': Error
}

/**
 * Type-safe event emitter
 */
export class EventEmitter<Events extends Record<string, unknown>> {
  private handlers: Map<keyof Events, Set<EventHandler<unknown>>> = new Map()
  private onceHandlers: Map<keyof Events, Set<EventHandler<unknown>>> = new Map()

  /**
   * Register an event handler
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>)

    // Return unsubscribe function
    return () => this.off(event, handler)
  }

  /**
   * Register a one-time event handler
   */
  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set())
    }
    this.onceHandlers.get(event)!.add(handler as EventHandler<unknown>)

    return () => {
      this.onceHandlers.get(event)?.delete(handler as EventHandler<unknown>)
    }
  }

  /**
   * Unregister an event handler
   */
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
    this.onceHandlers.get(event)?.delete(handler as EventHandler<unknown>)
  }

  /**
   * Emit an event
   */
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    // Call regular handlers
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in handler for ${String(event)}:`, error)
      }
    })

    // Call one-time handlers
    const onceSet = this.onceHandlers.get(event)
    if (onceSet) {
      onceSet.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in once handler for ${String(event)}:`, error)
        }
      })
      onceSet.clear()
    }
  }

  /**
   * Remove all handlers for an event
   */
  clear(event?: keyof Events): void {
    if (event) {
      this.handlers.delete(event)
      this.onceHandlers.delete(event)
    } else {
      this.handlers.clear()
      this.onceHandlers.clear()
    }
  }

  /**
   * Get handler count for an event
   */
  listenerCount(event: keyof Events): number {
    const handlers = this.handlers.get(event)?.size ?? 0
    const onceHandlers = this.onceHandlers.get(event)?.size ?? 0
    return handlers + onceHandlers
  }
}

/**
 * Create a typed event emitter
 */
export function createEventEmitter<Events extends Record<string, unknown>>(): EventEmitter<Events> {
  return new EventEmitter<Events>()
}

/**
 * Parse a key event from stdin
 */
export function parseKeyEvent(sequence: string, key: NodeJS.ReadStream['key']): KeyEvent | null {
  if (!key) return null

  return {
    name: key.name || '',
    ctrl: key.ctrl || false,
    meta: key.meta || false,
    shift: key.shift || false,
    sequence,
  }
}

/**
 * Format a key combination for display
 */
export function formatKeyEvent(event: KeyEvent): string {
  const parts: string[] = []

  if (event.ctrl) parts.push('Ctrl')
  if (event.meta) parts.push('Alt')
  if (event.shift && event.name.length > 1) parts.push('Shift')

  // Capitalize key name
  const keyName = event.name.charAt(0).toUpperCase() + event.name.slice(1)
  parts.push(keyName)

  return parts.join('+')
}

/**
 * Check if a key event matches a pattern
 */
export function keyMatches(event: KeyEvent, pattern: {
  name?: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
}): boolean {
  if (pattern.name !== undefined && event.name !== pattern.name) return false
  if (pattern.ctrl !== undefined && event.ctrl !== pattern.ctrl) return false
  if (pattern.meta !== undefined && event.meta !== pattern.meta) return false
  if (pattern.shift !== undefined && event.shift !== pattern.shift) return false
  return true
}

// Convenience type for Native REPL events
export type NativeReplEvents = EventMap
