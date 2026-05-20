import { useMemo } from 'react'
import './DiffEditor.css'

export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header'
  oldLineNumber?: number
  newLineNumber?: number
  content: string
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

interface DiffEditorProps {
  hunks: DiffHunk[]
  oldPath?: string
  newPath?: string
  maxHeight?: number
  onExpand?: () => void
}

function DiffEditor({ hunks, oldPath, newPath, maxHeight = 300, onExpand }: DiffEditorProps) {
  const stats = useMemo(() => {
    let additions = 0
    let deletions = 0

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') additions++
        if (line.type === 'remove') deletions++
      }
    }

    return { additions, deletions }
  }, [hunks])

  const expandable = onExpand !== undefined

  return (
    <div className="diff-editor">
      <div className="diff-editor-header">
        <div className="diff-editor-path">
          {oldPath && <span className="diff-editor-old-path">{oldPath}</span>}
          {newPath && oldPath !== newPath && (
            <>
              <span className="diff-editor-arrow">→</span>
              <span className="diff-editor-new-path">{newPath}</span>
            </>
          )}
        </div>
        <div className="diff-editor-stats">
          {stats.additions > 0 && (
            <span className="diff-editor-additions">+{stats.additions}</span>
          )}
          {stats.deletions > 0 && (
            <span className="diff-editor-deletions">-{stats.deletions}</span>
          )}
        </div>
      </div>

      <div className="diff-editor-content" style={{ maxHeight }}>
        {hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="diff-hunk">
            <div className="diff-hunk-header">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {hunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={`diff-line diff-line-${line.type}`}
              >
                <span className="diff-line-number diff-line-old-number">
                  {line.oldLineNumber ?? ''}
                </span>
                <span className="diff-line-number diff-line-new-number">
                  {line.newLineNumber ?? ''}
                </span>
                <span className="diff-line-prefix">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                <span className="diff-line-content">{line.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {expandable && (
        <button className="diff-editor-expand" onClick={onExpand}>
          展开完整差异视图
        </button>
      )}
    </div>
  )
}

export default DiffEditor

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Parse unified diff
// ─────────────────────────────────────────────────────────────────────────────

export function parseUnifiedDiff(diffText: string): DiffHunk[] {
  const hunks: DiffHunk[] = []
  const lines = diffText.split('\n')

  let currentHunk: DiffHunk | null = null
  let oldLineNumber = 0
  let newLineNumber = 0

  for (const line of lines) {
    // Hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk)
      }
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newLines: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
        lines: [],
      }
      oldLineNumber = currentHunk.oldStart
      newLineNumber = currentHunk.newStart
      continue
    }

    if (!currentHunk) continue

    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff') || line.startsWith('index')) {
      // Skip meta lines
      continue
    }

    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'add',
        newLineNumber: newLineNumber++,
        content: line.slice(1),
      })
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'remove',
        oldLineNumber: oldLineNumber++,
        content: line.slice(1),
      })
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'context',
        oldLineNumber: oldLineNumber++,
        newLineNumber: newLineNumber++,
        content: line.slice(1),
      })
    } else if (line === '\\ No newline at end of file') {
      // Skip this marker
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk)
  }

  return hunks
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Create diff from two strings
// ─────────────────────────────────────────────────────────────────────────────

export function createDiff(oldContent: string, newContent: string): DiffHunk[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null

  // Simple line-by-line diff (not a real diff algorithm)
  const maxLines = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === undefined && newLine !== undefined) {
      // Addition at end
      if (!currentHunk) {
        currentHunk = {
          oldStart: i + 1,
          oldLines: 0,
          newStart: i + 1,
          newLines: 0,
          lines: [],
        }
      }
      currentHunk.lines.push({
        type: 'add',
        newLineNumber: i + 1,
        content: newLine,
      })
      currentHunk.newLines++
    } else if (oldLine !== undefined && newLine === undefined) {
      // Deletion at end
      if (!currentHunk) {
        currentHunk = {
          oldStart: i + 1,
          oldLines: 0,
          newStart: i + 1,
          newLines: 0,
          lines: [],
        }
      }
      currentHunk.lines.push({
        type: 'remove',
        oldLineNumber: i + 1,
        content: oldLine,
      })
      currentHunk.oldLines++
    } else if (oldLine !== newLine) {
      // Changed line
      if (!currentHunk) {
        currentHunk = {
          oldStart: i + 1,
          oldLines: 0,
          newStart: i + 1,
          newLines: 0,
          lines: [],
        }
      }
      if (oldLine !== undefined) {
        currentHunk.lines.push({
          type: 'remove',
          oldLineNumber: i + 1,
          content: oldLine,
        })
        currentHunk.oldLines++
      }
      if (newLine !== undefined) {
        currentHunk.lines.push({
          type: 'add',
          newLineNumber: i + 1,
          content: newLine,
        })
        currentHunk.newLines++
      }
    } else {
      // Context line - if we have a hunk, add it
      if (currentHunk) {
        currentHunk.lines.push({
          type: 'context',
          oldLineNumber: i + 1,
          newLineNumber: i + 1,
          content: oldLine ?? newLine ?? '',
        })
        // End hunk after context
        hunks.push(currentHunk)
        currentHunk = null
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk)
  }

  return hunks.length > 0 ? hunks : [{
    oldStart: 1,
    oldLines: oldLines.length,
    newStart: 1,
    newLines: newLines.length,
    lines: oldLines.map((line, i) => ({
      type: 'context' as const,
      oldLineNumber: i + 1,
      newLineNumber: i + 1,
      content: line,
    })),
  }]
}
