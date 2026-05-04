/**
 * 数据库连接管理
 * 使用 bun:sqlite 进行会话持久化
 * 支持 WAL 模式和异步操作
 */

import { Database } from 'bun:sqlite'
import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

export interface DatabaseOptions {
  /** 启用 WAL 模式（默认 true） */
  wal?: boolean
  /** 启用外键约束（默认 true） */
  foreignKeys?: boolean
}

export class DatabaseConnection {
  private db: Database
  private static instance: DatabaseConnection
  private readonly options: DatabaseOptions

  constructor(dbPath?: string, options: DatabaseOptions = {}) {
    this.options = { wal: true, foreignKeys: true, ...options }

    // 默认存储在用户主目录
    const path = dbPath || join(homedir(), '.cclocal', 'sessions.db')

    // 确保目录存在
    mkdirSync(dirname(path), { recursive: true })

    this.db = new Database(path)

    // 启用 WAL 模式提高并发性能
    if (this.options.wal) {
      this.db.exec('PRAGMA journal_mode = WAL')
    }

    // 启用外键约束
    if (this.options.foreignKeys) {
      this.db.exec('PRAGMA foreign_keys = ON')
    }

    // 优化设置
    this.db.exec('PRAGMA busy_timeout = 5000') // 5秒忙等待超时
    this.db.exec('PRAGMA cache_size = -10000') // 10MB 缓存

    this.initTables()
  }

  static getInstance(dbPath?: string, options?: DatabaseOptions): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(dbPath, options)
    }
    return DatabaseConnection.instance
  }

  getDB(): Database {
    return this.db
  }

  static create(dbPath: string, options?: DatabaseOptions): DatabaseConnection {
    return new DatabaseConnection(dbPath, options)
  }

  static resetInstance(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close()
      // @ts-expect-error reset singleton for tests
      delete DatabaseConnection.instance
    }
  }

  private initTables(): void {
    // 会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cwd TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT -- JSON
      )
    `)

    // 消息表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL, -- JSON array of MessageContent
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
    `)
  }

  /**
   * 执行事务
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)() as T
  }

  /**
   * 检查数据库健康状态
   */
  healthCheck(): { healthy: boolean; journalMode: string; pageCount: number } {
    const journalMode = this.db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }
    const pageCount = this.db.prepare('PRAGMA page_count').get() as { page_count: number }

    return {
      healthy: true,
      journalMode: journalMode?.journal_mode || 'unknown',
      pageCount: pageCount?.page_count || 0,
    }
  }

  close(): void {
    this.db.close()
  }
}
