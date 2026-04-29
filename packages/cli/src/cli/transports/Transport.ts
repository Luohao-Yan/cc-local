import type { StdoutMessage } from 'src/entrypoints/sdk/controlTypes.js'

/**
 * Bidirectional session transport (SSE/WebSocket) used by RemoteIO / CCR.
 */
export interface Transport {
  connect(): Promise<void>
  write(message: StdoutMessage): Promise<void>
  setOnData(callback: (data: string) => void): void
  setOnClose(callback: (closeCode?: number) => void): void
  setOnEvent(callback: (event: unknown) => void): void
  isConnectedStatus(): boolean
  isClosedStatus(): boolean
  close(): void
}
