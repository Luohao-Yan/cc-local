/**
 * Tests for Database Connection
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseConnection } from './connection.js'

describe('DatabaseConnection', () => {
  const tempDirs: string[] = []

  beforeEach(() => {
    // Create temp directory for each test
  })

  afterEach(async () => {
    // Give Windows time to release file locks
    await new Promise((resolve) => setTimeout(resolve, 100))

    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()
      if (dir) {
        try {
          rmSync(dir, { recursive: true, force: true })
        } catch {
          // Ignore cleanup errors on Windows
        }
      }
    }
  })

  it('creates database with WAL mode enabled by default', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-db-wal-'))
    tempDirs.push(tempDir)

    const dbPath = join(tempDir, 'test.db')
    const connection = new DatabaseConnection(dbPath)

    const health = connection.healthCheck()
    expect(health.journalMode).toBe('wal')

    connection.close()
  })

  it('creates database with delete mode when WAL is disabled', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-db-delete-'))
    tempDirs.push(tempDir)

    const dbPath = join(tempDir, 'test.db')
    const connection = new DatabaseConnection(dbPath, { wal: false })

    const health = connection.healthCheck()
    expect(health.journalMode).toBe('delete')

    connection.close()
  })

  it('enables foreign keys by default', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-db-fk-'))
    tempDirs.push(tempDir)

    const dbPath = join(tempDir, 'test.db')
    const connection = new DatabaseConnection(dbPath)

    const db = connection.getDB()
    const result = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }
    expect(result.foreign_keys).toBe(1)

    connection.close()
  })

  it('singleton pattern works correctly', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-db-singleton-'))
    tempDirs.push(tempDir)

    const dbPath = join(tempDir, 'test.db')

    DatabaseConnection.resetInstance()
    const conn1 = DatabaseConnection.getInstance(dbPath)
    const conn2 = DatabaseConnection.getInstance(dbPath)

    expect(conn1).toBe(conn2)

    conn1.close()
    DatabaseConnection.resetInstance()
  })

  it('transaction method works correctly', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-db-tx-'))
    tempDirs.push(tempDir)

    const dbPath = join(tempDir, 'test.db')
    const connection = new DatabaseConnection(dbPath)

    const db = connection.getDB()

    // Create a test table
    db.exec('CREATE TABLE test_tx (id INTEGER PRIMARY KEY, value TEXT)')

    // Test transaction
    connection.transaction(() => {
      db.exec("INSERT INTO test_tx (value) VALUES ('a')")
      db.exec("INSERT INTO test_tx (value) VALUES ('b')")
    })

    const rows = db.prepare('SELECT COUNT(*) as count FROM test_tx').get() as { count: number }
    expect(rows.count).toBe(2)

    connection.close()
  })
})
