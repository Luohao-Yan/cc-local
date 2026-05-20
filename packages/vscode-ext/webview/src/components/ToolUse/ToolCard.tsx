import { useState, useCallback } from 'react'
import type { ToolUseBlock } from '../../store/slices/messagesSlice'
import './ToolCard.css'

/** 工具图标映射 */
const TOOL_ICONS: Record<string, string> = {
  Read: '📄',
  Write: '✏️',
  Edit: '📝',
  MultiEdit: '📝',
  Bash: '⌨️',
  Grep: '🔍',
  Glob: '📁',
  WebFetch: '🌐',
  WebSearch: '🔎',
  Task: '📋',
  mcp__: '🔧',
}

/** 工具分类 */
const TOOL_CATEGORIES: Record<string, string> = {
  Read: 'file',
  Write: 'file',
  Edit: 'file',
  MultiEdit: 'file',
  Bash: 'exec',
  Grep: 'search',
  Glob: 'search',
  WebFetch: 'web',
  WebSearch: 'web',
  Task: 'agent',
}

function getToolIcon(name: string): string {
  // MCP 工具: mcp__serverName__toolName
  if (name.startsWith('mcp__')) return TOOL_ICONS.mcp__
  return TOOL_ICONS[name] ?? '⚙️'
}

function getToolCategory(name: string): string {
  if (name.startsWith('mcp__')) return 'mcp'
  return TOOL_CATEGORIES[name] ?? 'tool'
}

interface ToolCardProps {
  toolUse: ToolUseBlock
  /** 消息 ID（用于 toggleToolExpanded dispatch） */
  messageId?: string
  blockIndex?: number
  onToggleExpand?: (messageId: string, blockIndex: number) => void
}

function ToolCard({ toolUse, messageId, blockIndex, onToggleExpand }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false)
  const name = toolUse.name
  const input = toolUse.input
  const status = toolUse.status
  const resultContent = toolUse.resultContent
  const isResultError = toolUse.isResultError
  const category = getToolCategory(name)
  const icon = getToolIcon(name)

  const isMcp = name.startsWith('mcp__')
  const displayName = isMcp
    ? name.split('__').slice(-1)[0] ?? name
    : name

  const handleToggle = useCallback(() => {
    setExpanded(v => !v)
    if (messageId != null && blockIndex != null && onToggleExpand) {
      onToggleExpand(messageId, blockIndex)
    }
  }, [messageId, blockIndex, onToggleExpand])

  // 状态指示器
  const statusIcon = status === 'running' ? '⏳'
    : status === 'completed' ? '✓'
    : status === 'error' ? '✗'
    : '○'

  const statusClass = status === 'running' ? 'running'
    : status === 'completed' ? 'success'
    : status === 'error' ? 'error'
    : 'pending'

  // 提取关键参数用于预览行
  const previewLine = getPreviewLine(name, input)

  return (
    <div className={`tool-card tool-card-${category}`} data-status={status}>
      <div className="tool-card-header" onClick={handleToggle}>
        <span className="tool-card-icon">{icon}</span>
        <span className="tool-card-name">{displayName}</span>
        {previewLine && !expanded && (
          <span className="tool-card-preview">{previewLine}</span>
        )}
        <span className={`tool-card-status tool-card-status-${statusClass}`}>
          <span className="tool-card-status-icon">{statusIcon}</span>
          {status === 'running' && <span className="tool-card-status-text">Running</span>}
        </span>
        <span className="tool-card-expand">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="tool-card-body">
          {/* 输入参数 */}
          <div className="tool-card-section">
            <div className="tool-card-section-title">Input</div>
            {Object.entries(input).map(([key, value]) => (
              <div key={key} className="tool-card-row">
                <span className="tool-card-key">{key}</span>
                <span className="tool-card-value">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>

          {/* 执行结果 */}
          {resultContent != null && (
            <div className={`tool-card-result ${isResultError ? 'tool-card-result-error' : ''}`}>
              <div className="tool-card-section-title">
                {isResultError ? 'Error' : 'Result'}
              </div>
              <pre>{resultContent.length > 2000
                ? resultContent.slice(0, 2000) + '\n… (truncated)'
                : resultContent
              }</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 生成预览行（工具名后显示关键参数） */
function getPreviewLine(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read': return String(input.file_path ?? '')
    case 'Write': return String(input.file_path ?? '')
    case 'Edit': return String(input.file_path ?? '')
    case 'MultiEdit': return `${Array.isArray(input.edits) ? input.edits.length : 0} edits`
    case 'Bash': {
      const cmd = String(input.command ?? '')
      return cmd.length > 60 ? cmd.slice(0, 57) + '…' : cmd
    }
    case 'Grep': return String(input.pattern ?? '')
    case 'Glob': return String(input.pattern ?? '')
    case 'WebFetch': return String(input.url ?? '')
    case 'WebSearch': return String(input.query ?? '')
    case 'Task': return String(input.description ?? '')
    default: {
      // MCP: 显示第一个字符串参数
      const vals = Object.values(input)
      const str = vals.find(v => typeof v === 'string')
      if (str) return String(str).slice(0, 60)
      return ''
    }
  }
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

export default ToolCard
