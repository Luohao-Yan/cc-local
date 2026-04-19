/**
 * 数据库连接管理
 * 使用 better-sqlite3 进行会话持久化
 */

import DatabaseConstructor from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'

type Database = import('better-sqlite3').default

export class DatabaseConnection {
  private db: Database
  private static instance: DatabaseConnection

  private constructor(dbPath?: string) {
    // 默认存储在用户主目录
    const path = dbPath || join(homedir(), '.cclocal', 'sessions.db')

    // 确保目录存在
    const { mkdirSync } = require('fs')
    const { dirname } = require('path')
    mkdirSync(dirname(path), { recursive: true })

    this.db = new DatabaseConstructor(path)
    this.initTables()
  }

  static getInstance(dbPath?: string): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(dbPath)
    }
    return DatabaseConnection.instance
  }

  getDB(): Database {
    return this.db
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

  close(): void {
    this.db.close()
  }
}
