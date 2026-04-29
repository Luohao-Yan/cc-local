export type QueueOperation = 'enqueue' | 'dequeue' | 'remove' | 'popAll'

export interface QueueOperationMessage {
  type: 'queue-operation'
  operation: QueueOperation
  timestamp: string
  sessionId: string
  content?: string
}
