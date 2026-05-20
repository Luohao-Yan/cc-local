import { useEffect, useRef, useCallback, useState } from 'react'
import * as monaco from 'monaco-editor'
import './MonacoDiffEditor.css'

interface MonacoDiffEditorProps {
  originalContent: string
  modifiedContent: string
  originalPath?: string
  modifiedPath?: string
  language?: string
  readOnly?: boolean
  maxHeight?: number
  onAccept?: () => void
  onReject?: () => void
}

function MonacoDiffEditor({
  originalContent,
  modifiedContent,
  originalPath,
  modifiedPath,
  language = 'plaintext',
  readOnly = true,
  maxHeight = 300,
  onAccept,
  onReject,
}: MonacoDiffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
  const [isFullHeight, setIsFullHeight] = useState(false)

  // 计算统计信息
  const stats = {
    additions: modifiedContent.split('\n').length - originalContent.split('\n').length,
    deletions: originalContent.split('\n').length - modifiedContent.split('\n').length,
  }

  // 初始化 Diff Editor
  useEffect(() => {
    if (containerRef.current && !diffEditorRef.current) {
      // 创建 diff editor
      diffEditorRef.current = monaco.editor.createDiffEditor(containerRef.current, {
        theme: 'vscode-dark',
        readOnly,
        renderSideBySide: true,
        enableSplitViewResizing: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        folding: false,
        lineNumbers: 'on',
        renderOverviewRuler: true,
        overviewRulerLanes: 2,
        glyphMargin: false,
        renderLineHighlight: 'none',
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        diffEditor: {
          ignoreTrimWhitespace: true,
          renderIndicators: true,
          renderMarginRevertIcon: true,
        },
      })

      // 设置模型
      const originalModel = monaco.editor.createModel(originalContent, language)
      const modifiedModel = monaco.editor.createModel(modifiedContent, language)

      diffEditorRef.current.setModel({
        original: originalModel,
        modified: modifiedModel,
      })
    }

    return () => {
      const model = diffEditorRef.current?.getModel()
      model?.original?.dispose()
      model?.modified?.dispose()
      diffEditorRef.current?.dispose()
      diffEditorRef.current = null
    }
  }, [])

  // 更新内容
  useEffect(() => {
    const model = diffEditorRef.current?.getModel()
    if (model) {
      model.original.setValue(originalContent)
      model.modified.setValue(modifiedContent)
    }
  }, [originalContent, modifiedContent])

  // 切换全高
  const toggleFullHeight = useCallback(() => {
    setIsFullHeight(prev => !prev)
  }, [])

  // 处理接受
  const handleAccept = useCallback(() => {
    onAccept?.()
  }, [onAccept])

  // 处理拒绝
  const handleReject = useCallback(() => {
    onReject?.()
  }, [onReject])

  return (
    <div className={`monaco-diff-editor ${isFullHeight ? 'full-height' : ''}`}>
      <div className="monaco-diff-header">
        <div className="monaco-diff-paths">
          {originalPath && (
            <span className="monaco-diff-path monaco-diff-path-original">
              {originalPath}
            </span>
          )}
          <span className="monaco-diff-arrow">→</span>
          {modifiedPath && (
            <span className="monaco-diff-path monaco-diff-path-modified">
              {modifiedPath}
            </span>
          )}
        </div>
        <div className="monaco-diff-stats">
          {stats.additions > 0 && (
            <span className="monaco-diff-stat monaco-diff-stat-add">
              +{stats.additions}
            </span>
          )}
          {stats.deletions > 0 && (
            <span className="monaco-diff-stat monaco-diff-stat-delete">
              -{Math.abs(stats.deletions)}
            </span>
          )}
        </div>
      </div>

      <div
        className="monaco-diff-container"
        ref={containerRef}
        style={{ height: isFullHeight ? 'auto' : maxHeight, maxHeight: isFullHeight ? 'none' : maxHeight }}
      />

      <div className="monaco-diff-actions">
        <button className="monaco-diff-action monaco-diff-action-expand" onClick={toggleFullHeight}>
          {isFullHeight ? '收起' : '展开'}
        </button>
        {onAccept && (
          <button className="monaco-diff-action monaco-diff-action-accept" onClick={handleAccept}>
            ✓ 接受
          </button>
        )}
        {onReject && (
          <button className="monaco-diff-action monaco-diff-action-reject" onClick={handleReject}>
            ✗ 拒绝
          </button>
        )}
      </div>
    </div>
  )
}

export default MonacoDiffEditor

// ─────────────────────────────────────────────────────────────────────────────
// Inline Diff (simple line-by-line comparison)
// ─────────────────────────────────────────────────────────────────────────────

interface InlineDiffProps {
  originalLines: string[]
  modifiedLines: string[]
}

export function InlineDiff({ originalLines, modifiedLines }: InlineDiffProps) {
  // 简单的行级差异比较
  const diffLines: Array<{
    type: 'add' | 'remove' | 'context'
    oldNumber?: number
    newNumber?: number
    content: string
  }> = []

  let oldLine = 1
  let newLine = 1

  // 使用简单的 LCS 算法
  const lcs = computeLCS(originalLines, modifiedLines)

  let i = 0
  let j = 0
  let k = 0

  while (i < originalLines.length || j < modifiedLines.length) {
    if (k < lcs.length && i < originalLines.length && originalLines[i] === lcs[k]) {
      // 匹配行
      diffLines.push({
        type: 'context',
        oldNumber: oldLine++,
        newNumber: newLine++,
        content: originalLines[i],
      })
      i++
      j++
      k++
    } else if (j < modifiedLines.length && (k >= lcs.length || modifiedLines[j] !== lcs[k])) {
      // 添加行
      diffLines.push({
        type: 'add',
        newNumber: newLine++,
        content: modifiedLines[j],
      })
      j++
    } else if (i < originalLines.length) {
      // 删除行
      diffLines.push({
        type: 'remove',
        oldNumber: oldLine++,
        content: originalLines[i],
      })
      i++
    }
  }

  return (
    <div className="inline-diff">
      {diffLines.map((line, index) => (
        <div key={index} className={`inline-diff-line inline-diff-${line.type}`}>
          <span className="inline-diff-number">{line.oldNumber ?? ''}</span>
          <span className="inline-diff-number">{line.newNumber ?? ''}</span>
          <span className="inline-diff-prefix">
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          <span className="inline-diff-content">{line.content}</span>
        </div>
      ))}
    </div>
  )
}

// 简单的 LCS 算法
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // 回溯
  const lcs: string[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}
