/**
 * 会话存储
 * 提供会话和消息的 CRUD 操作
 */

import type { Message, Session, SessionMetadata } from '@cclocal/shared'
import { DatabaseConnection } from './connection.js'

export class SessionStore {
  private db = DatabaseConnection.getInstance().getDB()

  // 创建会话
  createSession(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, name, cwd, model, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      session.id,
      session.name,
      session.cwd,
      session.model,
      session.createdAt,
      session.updatedAt,
      JSON.stringify(session.metadata || {})
    )
  }

  // 获取会话
  getSession(id: string): Session | undefined {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?')
    const row = stmt.get(id) as {
      id: string
      name: string
      cwd: string
      model: string
      created_at: number
      updated_at: number
      metadata: string
    } | undefined

    if (!row) return undefined

    return {
      id: row.id,
      name: row.name,
      cwd: row.cwd,
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: this.getMessages(id),
      metadata: JSON.parse(row.metadata || '{}') as SessionMetadata,
    }
  }

  // 更新会话
  updateSession(id: string, updates: Partial<Session>): void {
    const sets: string[] = []
    const values: (string | number)[] = []

    if (updates.name !== undefined) {
      sets.push('name = ?')
      values.push(updates.name)
    }
    if (updates.cwd !== undefined) {
      sets.push('cwd = ?')
      values.push(updates.cwd)
    }
    if (updates.model !== undefined) {
      sets.push('model = ?')
      values.push(updates.model)
    }
    if (updates.updatedAt !== undefined) {
      sets.push('updated_at = ?')
      values.push(updates.updatedAt)
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?')
      values.push(JSON.stringify(updates.metadata))
    }

    if (sets.length === 0) return

    const stmt = this.db.prepare(`
      UPDATE sessions SET ${sets.join(', ')} WHERE id = ?
    `)
    stmt.run(...values, id)
  }

  // 删除会话
  deleteSession(id: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?')
    stmt.run(id)
  }

  // 列出所有会话（按更新时间倒序）
  listSessions(limit = 50): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      ORDER BY updated_at DESC 
      LIMIT ?
    `)
    
    const rows = stmt.all(limit) as Array<{
      id: string
      name: string
      cwd: string
      model: string
      created_at: number
      updated_at: number
      metadata: string
    }>

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      cwd: row.cwd,
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: [], // 列表查询不加载消息
      metadata: JSON.parse(row.metadata || '{}') as SessionMetadata,
    }))
  }

  // 添加消息
  addMessage(message: Message, sessionId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      message.id,
      sessionId,
      message.role,
      JSON.stringify(message.content),
      message.timestamp
    )

    // 更新会话时间
    this.db.prepare(`
      UPDATE sessions SET updated_at = ? WHERE id = ?
    `).run(Date.now(), sessionId)
  }

  // 获取会话的所有消息
  getMessages(sessionId: string): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `)
    
    const rows = stmt.all(sessionId) as Array<{
      id: string
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: number
    }>

    return rows.map(row => ({
      id: row.id,
      role: row.role,
      content: JSON.parse(row.content),
      timestamp: row.timestamp,
    }))
  }

  // 删除消息
  deleteMessage(id: string): void {
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?')
    stmt.run(id)
  }

  // 搜索会话（按名称或内容）
  searchSessions(query: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT s.* FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      WHERE s.name LIKE ? OR m.content LIKE ?
      ORDER BY s.updated_at DESC
      LIMIT 20
    `)
    
    const pattern = `%${query}%`
    const rows = stmt.all(pattern, pattern) as Array<{
      id: string
      name: string
      cwd: string
      model: string
      created_at: number
      updated_at: number
      metadata: string
    }>

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      cwd: row.cwd,
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: [],
      metadata: JSON.parse(row.metadata || '{}') as SessionMetadata,
    }))
  }
}

// 全局存储实例
export const sessionStore = new SessionStore()
