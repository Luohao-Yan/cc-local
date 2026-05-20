/**
 * Type declarations for the Ink resize-event module.
 * Part of the Ink terminal UI framework internals.
 */
export interface ResizeEvent {
  columns: number
  rows: number
}

export function onResize(cb: (event: ResizeEvent) => void): () => void
