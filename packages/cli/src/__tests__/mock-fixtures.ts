/**
 * Mock fixtures for external integration testing
 *
 * Provides deterministic stubs for IDE, Chrome, tmux, worktree,
 * plugin, and auth integrations so that native REPL and
 * QueryEngine paths can be exercised without real external deps.
 */

import { randomUUID } from 'crypto'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// ─── IDE Integration Mock ─────────────────────────────────────

export function createMockIdeMetadata() {
  return {
    ide: {
      name: 'vscode',
      version: '1.85.0',
      sessionId: randomUUID(),
      connected: true,
    },
    openFiles: [
      { path: '/project/src/index.ts', language: 'typescript', line: 42 },
      { path: '/project/src/utils.ts', language: 'typescript', line: 10 },
    ],
    diagnostics: [
      { file: '/project/src/utils.ts', severity: 'error', message: "Cannot find name 'foo'" },
    ],
  }
}

// ─── Chrome Integration Mock ──────────────────────────────────

export function createMockChromeMetadata() {
  return {
    chrome: {
      enabled: true,
      tabTitle: 'Test Page',
      tabUrl: 'https://example.com',
      connected: true,
    },
  }
}

// ─── Tmux Integration Mock ────────────────────────────────────

export function createMockTmuxMetadata(mode: 'native' | 'classic' = 'native') {
  return {
    tmux: {
      mode,
      sessionName: 'cclocal-test',
      paneId: '0',
      connected: true,
    },
  }
}

// ─── Worktree Mock ────────────────────────────────────────────

export function createMockWorktreeDir(prefix = 'cclocal-worktree-test') {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'README.md'), '# Test Worktree')
  writeFileSync(join(dir, 'test.ts'), 'export const x = 1\n')
  return {
    path: dir,
    cleanup() {
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

// ─── Plugin Mock ──────────────────────────────────────────────

export function createMockPluginDir(prefix = 'cclocal-plugin-test') {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}`)
  const pluginDir = join(dir, '.claude-plugin')
  mkdirSync(pluginDir, { recursive: true })

  const manifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test plugin for integration testing',
    commands: [
      { name: 'test-cmd', description: 'A test command' },
    ],
    tools: [
      { name: 'test-tool', description: 'A test tool' },
    ],
  }

  writeFileSync(join(pluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2))

  return {
    path: dir,
    pluginDir,
    manifest,
    cleanup() {
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

// ─── Auth Token Mock ──────────────────────────────────────────

export function createMockAuthToken() {
  return {
    apiToken: `sk-test-${randomUUID()}`,
    serverUrl: 'http://127.0.0.1:5678',
  }
}

// ─── Session Mock ─────────────────────────────────────────────

export function createMockSession(cwd = process.cwd()) {
  return {
    id: randomUUID(),
    name: `Test Session ${new Date().toISOString()}`,
    cwd,
    model: 'claude-sonnet-4-6',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ─── Message Mock ─────────────────────────────────────────────

export function createMockUserMessage(text: string) {
  return {
    id: randomUUID(),
    role: 'user' as const,
    content: [{ type: 'text' as const, text }],
    timestamp: Date.now(),
  }
}

export function createMockAssistantMessage(text: string) {
  return {
    id: randomUUID(),
    role: 'assistant' as const,
    content: [{ type: 'text' as const, text }],
    timestamp: Date.now(),
  }
}
