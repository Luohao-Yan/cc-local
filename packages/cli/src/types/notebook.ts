export type NotebookCellType = 'code' | 'markdown'

export interface NotebookCellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  text?: string | string[]
  data?: Record<string, unknown>
  ename?: string
  evalue?: string
  traceback?: string[]
}

export interface NotebookCell {
  cell_type: NotebookCellType
  source: string | string[]
  id?: string
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
}

export interface NotebookContent {
  cells: NotebookCell[]
  metadata: {
    language_info?: { name?: string }
    [key: string]: unknown
  }
}

export interface NotebookOutputImage {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

export interface NotebookCellSourceOutput {
  output_type: string
  text?: string
  image?: NotebookOutputImage
}

export interface NotebookCellSource {
  cellType: NotebookCellType
  source: string
  cell_id?: string
  language?: string
  execution_count?: number | null
  outputs?: NotebookCellSourceOutput[]
}
