/**
 * 会话存储
 * 提供会话和消息的 CRUD 操作
 */

import type { Message, Session, SessionMetadata } from '@cclocal/shared'
import { randomUUID } from 'crypto'
import { DatabaseConnection } from './connection.js'

export class SessionStore {
  private db: ReturnType<DatabaseConnection['getDB']>

  constructor(connection: DatabaseConnection = DatabaseConnection.getInstance()) {
    this.db = connection.getDB()
  }

  // 创建会话
  createSession(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, name, cwd, model, created_at, updated_at, metadata)
      VALUES ($id, $name, $cwd, $model, $createdAt, $updatedAt, $metadata)
    `)

    stmt.run({
      $id: session.id,
      $name: session.name,
      $cwd: session.cwd,
      $model: session.model,
      $createdAt: session.createdAt,
      $updatedAt: session.updatedAt,
      $metadata: JSON.stringify(session.metadata || {}),
    })
  }

  // 获取会话
  getSession(id: string): Session | undefined {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = $id')
    const row = stmt.get({ $id: id }) as {
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

  hasSession(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM sessions WHERE id = $id LIMIT 1')
    return Boolean(stmt.get({ $id: id }))
  }

  // 更新会话
  updateSession(id: string, updates: Partial<Session>): void {
    const sets: string[] = []
    const params: Record<string, string | number> = { $id: id }
    let paramIdx = 0

    if (updates.name !== undefined) {
      sets.push(`name = $p${paramIdx}`)
      params[`$p${paramIdx}`] = updates.name
      paramIdx++
    }
    if (updates.cwd !== undefined) {
      sets.push(`cwd = $p${paramIdx}`)
      params[`$p${paramIdx}`] = updates.cwd
      paramIdx++
    }
    if (updates.model !== undefined) {
      sets.push(`model = $p${paramIdx}`)
      params[`$p${paramIdx}`] = updates.model
      paramIdx++
    }
    if (updates.updatedAt !== undefined) {
      sets.push(`updated_at = $p${paramIdx}`)
      params[`$p${paramIdx}`] = updates.updatedAt
      paramIdx++
    }
    if (updates.metadata !== undefined) {
      sets.push(`metadata = $p${paramIdx}`)
      params[`$p${paramIdx}`] = JSON.stringify(updates.metadata)
      paramIdx++
    }

    if (sets.length === 0) return

    const stmt = this.db.prepare(`
      UPDATE sessions SET ${sets.join(', ')} WHERE id = $id
    `)
    stmt.run(params)
  }

  // 删除会话
  deleteSession(id: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = $id')
    stmt.run({ $id: id })
  }

  // 列出所有会话（按更新时间倒序）
  listSessions(limit = 50): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      ORDER BY updated_at DESC 
      LIMIT $limit
    `)

    const rows = stmt.all({ $limit: limit }) as Array<{
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
    const insertStmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp)
      VALUES ($id, $sessionId, $role, $content, $timestamp)
    `)

    const updateStmt = this.db.prepare(`
      UPDATE sessions SET updated_at = $now WHERE id = $sessionId
    `)

    const now = Date.now()

    this.db.transaction(() => {
      insertStmt.run({
        $id: message.id,
        $sessionId: sessionId,
        $role: message.role,
        $content: JSON.stringify(message.content),
        $timestamp: message.timestamp,
      })

      updateStmt.run({ $now: now, $sessionId: sessionId })
    })()
  }

  // 获取会话的所有消息
  getMessages(sessionId: string, options?: { limit?: number; offset?: number }): Message[] {
    const limit = options?.limit
    const offset = options?.offset ?? 0
    const query = limit === undefined
      ? `
        SELECT * FROM messages
        WHERE session_id = $sessionId
        ORDER BY timestamp ASC
      `
      : `
        SELECT * FROM messages
        WHERE session_id = $sessionId
        ORDER BY timestamp ASC
        LIMIT $limit
        OFFSET $offset
      `
    const stmt = this.db.prepare(query)

    const rows = (
      limit === undefined
        ? stmt.all({ $sessionId: sessionId })
        : stmt.all({ $sessionId: sessionId, $limit: limit, $offset: offset })
    ) as Array<{
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

  replaceMessages(sessionId: string, messages: Message[]): void {
    // bun:sqlite 使用事务
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM messages WHERE session_id = $sessionId').run({ $sessionId: sessionId })

      const insertStmt = this.db.prepare(`
        INSERT INTO messages (id, session_id, role, content, timestamp)
        VALUES ($id, $sessionId, $role, $content, $timestamp)
      `)

      for (const message of messages) {
        insertStmt.run({
          $id: message.id,
          $sessionId: sessionId,
          $role: message.role,
          $content: JSON.stringify(message.content),
          $timestamp: message.timestamp,
        })
      }

      this.db.prepare(`
        UPDATE sessions SET updated_at = $now WHERE id = $sessionId
      `).run({ $now: Date.now(), $sessionId: sessionId })
    })()
  }

  // 删除消息
  deleteMessage(id: string): void {
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = $id')
    stmt.run({ $id: id })
  }

  // 搜索会话（按名称或内容）
  searchSessions(query: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT s.* FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      WHERE s.name LIKE $pattern OR m.content LIKE $pattern
      ORDER BY s.updated_at DESC
      LIMIT 20
    `)

    const rows = stmt.all({ $pattern: `%${query}%` }) as Array<{
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

  // 按 cwd 查找最近更新的会话（供 --resume/--continue 使用）
  findSessionByCwd(cwd: string): Session | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE cwd = $cwd
      ORDER BY updated_at DESC
      LIMIT 1
    `)

    const row = stmt.get({ $cwd: cwd }) as {
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
      messages: [],
      metadata: JSON.parse(row.metadata || '{}') as SessionMetadata,
    }
  }

  // 分叉会话：创建新会话并复制消息（供 --fork-session 使用）
  forkSession(sourceId: string, options?: { name?: string; cwd?: string; model?: string }): Session {
    const source = this.getSession(sourceId)
    if (!source) {
      throw new Error(`Session ${sourceId} not found`)
    }
    const now = Date.now()
    const newId = randomUUID()
    const newName = options?.name ?? `${source.name} (fork)`

    this.db.transaction(() => {
      // 创建新会话
      this.db.prepare(`
        INSERT INTO sessions (id, name, cwd, model, created_at, updated_at, metadata)
        VALUES ($id, $name, $cwd, $model, $now, $now, $metadata)
      `).run({
        $id: newId,
        $name: newName,
        $cwd: options?.cwd ?? source.cwd,
        $model: options?.model ?? source.model,
        $now: now,
        $metadata: JSON.stringify(source.metadata ?? {}),
      })

      // 复制消息（分配新 ID 避免主键冲突）
      const messages = this.getMessages(sourceId)
      const insertStmt = this.db.prepare(`
        INSERT INTO messages (id, session_id, role, content, timestamp)
        VALUES ($id, $sessionId, $role, $content, $timestamp)
      `)
      for (const msg of messages) {
        insertStmt.run({
          $id: randomUUID(),
          $sessionId: newId,
          $role: msg.role,
          $content: JSON.stringify(msg.content),
          $timestamp: msg.timestamp,
        })
      }
    })()

    return {
      id: newId,
      name: newName,
      cwd: options?.cwd ?? source.cwd,
      model: options?.model ?? source.model,
      createdAt: now,
      updatedAt: now,
      messages: [],
      metadata: source.metadata ?? {},
    }
  }
}

// 全局存储实例 - 延迟初始化
let _sessionStore: SessionStore | undefined

export function getSessionStore(): SessionStore {
  if (!_sessionStore) {
    _sessionStore = new SessionStore()
  }
  return _sessionStore
}

// 兼容旧代码的导出
export const sessionStore = new Proxy({} as SessionStore, {
  get(_target, prop) {
    const instance = getSessionStore()
    const value = instance[prop as keyof SessionStore]
    // Bind methods to the instance so destructuring doesn't lose `this`
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  },
})
