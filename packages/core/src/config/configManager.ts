/**
 * Configuration Manager - Persistent key-value configuration store
 *
 * Provides get/set/list/delete operations for runtime configuration.
 * Backed by the session store's metadata layer.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const CONFIG_DIR = join(homedir(), '.cclocal')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

interface ConfigData {
  [key: string]: unknown
}

let configCache: ConfigData | null = null

function loadConfig(): ConfigData {
  if (configCache) return configCache
  try {
    if (existsSync(CONFIG_FILE)) {
      configCache = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    } else {
      configCache = {}
    }
  } catch {
    configCache = {}
  }
  return configCache!
}

function saveConfig(config: ConfigData): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
  const tmpFile = CONFIG_FILE + '.tmp'
  writeFileSync(tmpFile, JSON.stringify(config, null, 2), 'utf-8')
  renameSync(tmpFile, CONFIG_FILE)
  configCache = config
}

function resolveKey(obj: ConfigData, key: string): unknown {
  const parts = key.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function setKey(obj: ConfigData, key: string, value: unknown): void {
  const parts = key.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {}
    }
    current = current[parts[i]] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

function deleteKey(obj: ConfigData, key: string): boolean {
  const parts = key.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      return false
    }
    current = current[parts[i]] as Record<string, unknown>
  }
  if (parts[parts.length - 1] in current) {
    delete current[parts[parts.length - 1]]
    return true
  }
  return false
}

export async function getConfig(key: string): Promise<unknown> {
  const config = loadConfig()
  return resolveKey(config, key)
}

export async function setConfig(key: string, value: string): Promise<void> {
  const config = loadConfig()
  // Try to parse as JSON, fall back to string
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    parsed = value
  }
  setKey(config, key, parsed)
  saveConfig(config)
}

export async function listConfig(): Promise<ConfigData> {
  return loadConfig()
}

export async function deleteConfig(key: string): Promise<boolean> {
  const config = loadConfig()
  const deleted = deleteKey(config, key)
  if (deleted) saveConfig(config)
  return deleted
}