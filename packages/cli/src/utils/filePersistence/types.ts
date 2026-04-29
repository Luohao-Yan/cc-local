export const DEFAULT_UPLOAD_CONCURRENCY = 5
export const FILE_COUNT_LIMIT = 100
export const OUTPUTS_SUBDIR = 'outputs'

export type TurnStartTime = number

export type PersistedFile = {
  relativePath: string
  fileId?: string
  size: number
}

export type FailedPersistence = {
  relativePath: string
  error: string
}

export type FilesPersistedEventData = {
  persisted: PersistedFile[]
  failed: FailedPersistence[]
  totalFiles: number
  totalSize: number
  durationMs: number
}
