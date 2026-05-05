/**
 * Async Push Queue — bridges callback-based onStream to AsyncGenerator yield.
 *
 * Used by both queryEngineAdapter and nativeBridgeAdapter to convert
 * real-time stream callbacks into an iterable protocol the Ink UI can
 * consume via `for await (const event of …)`.
 */

export class EventQueue<T> {
  private queue: T[] = []
  private waiting: ((value: IteratorResult<T>) => void)[] = []
  private done = false

  push(item: T): void {
    if (this.done) return
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!
      resolve({ value: item, done: false })
    } else {
      this.queue.push(item)
    }
  }

  close(): void {
    this.done = true
    for (const resolve of this.waiting) {
      resolve({ value: undefined, done: true } as IteratorResult<T>)
    }
    this.waiting.length = 0
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.queue.length > 0) {
      return { value: this.queue.shift()!, done: false }
    }
    if (this.done) {
      return { value: undefined, done: true } as IteratorResult<T>
    }
    return new Promise<IteratorResult<T>>((resolve) => {
      this.waiting.push(resolve)
    })
  }
}
