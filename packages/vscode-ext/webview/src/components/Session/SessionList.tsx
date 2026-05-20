import { useState, useCallback, useMemo } from 'react'
import type { Session } from '../../store/slices/sessionsSlice'
import './SessionList.css'

interface SessionListProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onDeleteSession?: (id: string) => void
  onRenameSession?: (id: string, name: string) => void
}

function SessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}: SessionListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // 过滤会话
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const query = searchQuery.toLowerCase()
    return sessions.filter(s => s.name.toLowerCase().includes(query))
  }, [sessions, searchQuery])

  const handleRename = useCallback((session: Session) => {
    setEditingId(session.id)
    setEditValue(session.name)
  }, [])

  const handleRenameSubmit = useCallback((id: string) => {
    if (editValue.trim() && onRenameSession) {
      onRenameSession(id, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }, [editValue, onRenameSession])

  const handleRenameCancel = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString()
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>历史会话</h3>
        <input
          type="text"
          className="session-list-search"
          placeholder="搜索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="session-list-content">
        {filteredSessions.length === 0 ? (
          <div className="session-list-empty">
            {searchQuery ? '没有找到匹配的会话' : '暂无历史会话'}
          </div>
        ) : (
          filteredSessions.map(session => (
            <div
              key={session.id}
              className={`session-list-item ${activeSessionId === session.id ? 'active' : ''}`}
              onClick={() => !editingId && onSelectSession(session.id)}
            >
              {editingId === session.id ? (
                <input
                  type="text"
                  className="session-list-edit-input"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(session.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameSubmit(session.id)
                    if (e.key === 'Escape') handleRenameCancel()
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <div className="session-list-item-info">
                    <span className="session-list-item-name">{session.name}</span>
                    <span className="session-list-item-meta">
                      {formatDate(session.updatedAt)} · {session.messageCount} 条消息
                    </span>
                  </div>
                  <div className="session-list-item-actions">
                    {onRenameSession && (
                      <button
                        className="session-list-action"
                        onClick={e => {
                          e.stopPropagation()
                          handleRename(session)
                        }}
                        title="重命名"
                      >
                        ✏
                      </button>
                    )}
                    {onDeleteSession && (
                      <button
                        className="session-list-action delete"
                        onClick={e => {
                          e.stopPropagation()
                          onDeleteSession(session.id)
                        }}
                        title="删除"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SessionList
