import './FileList.css'

export interface FileDiffInfo {
  path: string
  oldPath?: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
}

interface FileListProps {
  files: FileDiffInfo[]
  selectedPath?: string
  onSelect: (path: string) => void
}

function FileList({ files, selectedPath, onSelect }: FileListProps) {
  return (
    <div className="file-list">
      {files.map(file => (
        <div
          key={file.path}
          className={`file-list-item ${selectedPath === file.path ? 'selected' : ''}`}
          onClick={() => onSelect(file.path)}
        >
          <span className={`file-list-status file-list-status-${file.status}`}>
            {file.status === 'added' && 'A'}
            {file.status === 'modified' && 'M'}
            {file.status === 'deleted' && 'D'}
            {file.status === 'renamed' && 'R'}
          </span>
          <span className="file-list-path">{file.path}</span>
          <span className="file-list-stats">
            {file.additions > 0 && (
              <span className="file-list-additions">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="file-list-deletions">-{file.deletions}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

export default FileList
