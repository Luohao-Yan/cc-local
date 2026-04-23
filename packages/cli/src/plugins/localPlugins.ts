import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'

export interface DiscoveredPluginManifest {
  type: 'plugin' | 'marketplace'
  manifestPath: string
  rootPath: string
  name: string
  version?: string
  description?: string
}

export interface InstalledPluginRecord {
  name: string
  version?: string
  sourcePath: string
  installPath: string
  manifestPath: string
  installedAt: number
  updatedAt: number
}

type ValidationResult = {
  ok: boolean
  type?: 'plugin' | 'marketplace'
  manifestPath?: string
  rootPath?: string
  errors: string[]
  summary?: string
}

function safeReadJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function discoverManifestPath(targetPath: string): { type: 'plugin' | 'marketplace'; manifestPath: string; rootPath: string } | undefined {
  const absolutePath = resolve(targetPath)
  if (!existsSync(absolutePath)) {
    return undefined
  }

  const stats = statSync(absolutePath)
  if (stats.isFile()) {
    if (absolutePath.endsWith('plugin.json')) {
      return { type: 'plugin', manifestPath: absolutePath, rootPath: resolve(absolutePath, '..', '..') }
    }
    if (absolutePath.endsWith('marketplace.json')) {
      return { type: 'marketplace', manifestPath: absolutePath, rootPath: resolve(absolutePath, '..', '..') }
    }
    return undefined
  }

  const marketplacePath = join(absolutePath, '.claude-plugin', 'marketplace.json')
  if (existsSync(marketplacePath)) {
    return { type: 'marketplace', manifestPath: marketplacePath, rootPath: absolutePath }
  }

  const pluginPath = join(absolutePath, '.claude-plugin', 'plugin.json')
  if (existsSync(pluginPath)) {
    return { type: 'plugin', manifestPath: pluginPath, rootPath: absolutePath }
  }

  return undefined
}

export function validatePluginTarget(targetPath: string): ValidationResult {
  const discovered = discoverManifestPath(targetPath)
  if (!discovered) {
    return {
      ok: false,
      errors: ['No manifest found. Expected .claude-plugin/plugin.json or .claude-plugin/marketplace.json'],
    }
  }

  let manifest: unknown
  try {
    manifest = safeReadJson(discovered.manifestPath)
  } catch (error) {
    return {
      ok: false,
      type: discovered.type,
      manifestPath: discovered.manifestPath,
      rootPath: discovered.rootPath,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    }
  }

  if (!isRecord(manifest)) {
    return {
      ok: false,
      type: discovered.type,
      manifestPath: discovered.manifestPath,
      rootPath: discovered.rootPath,
      errors: ['Manifest must be a JSON object'],
    }
  }

  const errors: string[] = []
  if (discovered.type === 'plugin') {
    if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
      errors.push('plugin.json requires a non-empty "name"')
    }
    if (manifest.version !== undefined && typeof manifest.version !== 'string') {
      errors.push('plugin.json "version" must be a string when present')
    }
    if (manifest.description !== undefined && typeof manifest.description !== 'string') {
      errors.push('plugin.json "description" must be a string when present')
    }
  } else {
    if (!Array.isArray(manifest.plugins)) {
      errors.push('marketplace.json requires a "plugins" array')
    } else {
      for (const [index, entry] of manifest.plugins.entries()) {
        if (!isRecord(entry)) {
          errors.push(`marketplace.json plugins[${index}] must be an object`)
          continue
        }
        if (typeof entry.name !== 'string' || entry.name.trim() === '') {
          errors.push(`marketplace.json plugins[${index}] requires a non-empty "name"`)
        }
        if (typeof entry.source !== 'string' || entry.source.trim() === '') {
          errors.push(`marketplace.json plugins[${index}] requires a non-empty "source"`)
        }
      }
    }
  }

  const summary =
    discovered.type === 'plugin'
      ? `plugin:${typeof manifest.name === 'string' ? manifest.name : '(unnamed)'}`
      : `marketplace:${Array.isArray(manifest.plugins) ? manifest.plugins.length : 0} plugins`

  return {
    ok: errors.length === 0,
    type: discovered.type,
    manifestPath: discovered.manifestPath,
    rootPath: discovered.rootPath,
    errors,
    summary,
  }
}

function getConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
}

function getPluginInstallRoot(): string {
  return join(getConfigDir(), 'cclocal-plugins')
}

function getInstalledPluginsIndexPath(): string {
  return join(getPluginInstallRoot(), 'installed.json')
}

function sanitizePluginName(name: string): string {
  return name.replace(/[^a-zA-Z0-9@._-]/g, '-')
}

function readInstalledPluginsIndex(): Record<string, InstalledPluginRecord> {
  const filePath = getInstalledPluginsIndexPath()
  if (!existsSync(filePath)) {
    return {}
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, InstalledPluginRecord>
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeInstalledPluginsIndex(index: Record<string, InstalledPluginRecord>): void {
  const filePath = getInstalledPluginsIndexPath()
  mkdirSync(getPluginInstallRoot(), { recursive: true })
  writeFileSync(filePath, JSON.stringify(index, null, 2))
}

function readPluginManifest(manifestPath: string): { name: string; version?: string } {
  const manifest = safeReadJson(manifestPath)
  if (!isRecord(manifest) || typeof manifest.name !== 'string' || manifest.name.trim() === '') {
    throw new Error('plugin.json requires a non-empty "name"')
  }

  return {
    name: manifest.name,
    version: typeof manifest.version === 'string' ? manifest.version : undefined,
  }
}

function copyPlugin(sourceRoot: string, installPath: string): void {
  rmSync(installPath, { recursive: true, force: true })
  mkdirSync(getPluginInstallRoot(), { recursive: true })
  cpSync(sourceRoot, installPath, {
    recursive: true,
    filter: (source) => !source.includes(`${getPluginInstallRoot()}/`),
  })
}

export function listInstalledPlugins(): InstalledPluginRecord[] {
  return Object.values(readInstalledPluginsIndex()).sort((a, b) => a.name.localeCompare(b.name))
}

export function installLocalPlugin(sourcePath: string): InstalledPluginRecord {
  const validation = validatePluginTarget(sourcePath)
  if (!validation.ok || validation.type !== 'plugin' || !validation.manifestPath || !validation.rootPath) {
    throw new Error(validation.errors.join('; ') || 'Only local plugin manifests can be installed')
  }

  const manifest = readPluginManifest(validation.manifestPath)
  const now = Date.now()
  const installPath = join(getPluginInstallRoot(), sanitizePluginName(manifest.name))
  copyPlugin(validation.rootPath, installPath)

  const index = readInstalledPluginsIndex()
  const previous = index[manifest.name]
  const record: InstalledPluginRecord = {
    name: manifest.name,
    version: manifest.version,
    sourcePath: validation.rootPath,
    installPath,
    manifestPath: join(installPath, '.claude-plugin', 'plugin.json'),
    installedAt: previous?.installedAt || now,
    updatedAt: now,
  }
  index[manifest.name] = record
  writeInstalledPluginsIndex(index)
  return record
}

export function updateInstalledPlugin(name: string, sourcePath?: string): InstalledPluginRecord {
  const index = readInstalledPluginsIndex()
  const existing = index[name]
  if (!existing && !sourcePath) {
    throw new Error(`Plugin "${name}" is not installed`)
  }

  const nextSourcePath = sourcePath || existing!.sourcePath
  const record = installLocalPlugin(nextSourcePath)
  if (record.name !== name) {
    const refreshedIndex = readInstalledPluginsIndex()
    delete refreshedIndex[record.name]
    writeInstalledPluginsIndex(refreshedIndex)
    throw new Error(`Updated plugin name mismatch: expected "${name}", got "${record.name}"`)
  }
  return record
}

export function uninstallInstalledPlugin(name: string): InstalledPluginRecord {
  const index = readInstalledPluginsIndex()
  const existing = index[name]
  if (!existing) {
    throw new Error(`Plugin "${name}" is not installed`)
  }

  rmSync(existing.installPath, { recursive: true, force: true })
  delete index[name]
  writeInstalledPluginsIndex(index)
  return existing
}

function walkForPlugins(rootPath: string, depth: number, results: DiscoveredPluginManifest[]): void {
  if (depth < 0 || !existsSync(rootPath)) {
    return
  }

  const markerDir = join(rootPath, '.claude-plugin')
  const pluginManifest = join(markerDir, 'plugin.json')
  const marketplaceManifest = join(markerDir, 'marketplace.json')

  if (existsSync(pluginManifest)) {
    try {
      const manifest = safeReadJson(pluginManifest)
      if (isRecord(manifest)) {
        results.push({
          type: 'plugin',
          manifestPath: pluginManifest,
          rootPath,
          name: typeof manifest.name === 'string' ? manifest.name : '(unnamed)',
          version: typeof manifest.version === 'string' ? manifest.version : undefined,
          description: typeof manifest.description === 'string' ? manifest.description : undefined,
        })
      }
    } catch {
      results.push({
        type: 'plugin',
        manifestPath: pluginManifest,
        rootPath,
        name: '(invalid-json)',
      })
    }
  }

  if (existsSync(marketplaceManifest)) {
    try {
      const manifest = safeReadJson(marketplaceManifest)
      if (isRecord(manifest)) {
        results.push({
          type: 'marketplace',
          manifestPath: marketplaceManifest,
          rootPath,
          name: typeof manifest.name === 'string' ? manifest.name : '(marketplace)',
          description: Array.isArray(manifest.plugins) ? `${manifest.plugins.length} plugin entries` : undefined,
        })
      }
    } catch {
      results.push({
        type: 'marketplace',
        manifestPath: marketplaceManifest,
        rootPath,
        name: '(invalid-json)',
      })
    }
  }

  for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.claude-plugin') {
      continue
    }
    walkForPlugins(join(rootPath, entry.name), depth - 1, results)
  }
}

export function listLocalPlugins(rootPath: string, maxDepth = 3): DiscoveredPluginManifest[] {
  const results: DiscoveredPluginManifest[] = []
  walkForPlugins(resolve(rootPath), maxDepth, results)
  return results.sort((a, b) => a.manifestPath.localeCompare(b.manifestPath))
}
