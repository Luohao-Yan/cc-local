/**
 * Plugin Hot-Reload System
 *
 * Watches plugin directories for changes and automatically reloads
 * modified plugins without restarting the session.
 *
 * Features beyond official Claude Code:
 * - File system watcher with debounce for rapid changes
 * - Incremental reload (only changed plugin, not all)
 * - Dependency graph tracking (reload dependents of changed plugin)
 * - Rollback on failed reload (keep previous version)
 * - Reload events for UI notification
 *
 * Usage:
 * ```ts
 * const watcher = new PluginHotReloader(pluginManager)
 * watcher.watch('/path/to/plugins')
 * // On file change → plugin is reloaded automatically
 * watcher.stop()
 * ```
 */

import { watch, type FSWatcher } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, extname, dirname } from 'path'
import { EventEmitter } from 'events'

export interface PluginManifest {
  name: string
  version: string
  entry: string
  description?: string
  tools?: string[]
  hooks?: string[]
  dependencies?: string[]
}

export interface LoadedPlugin {
  name: string
  version: string
  path: string
  manifest: PluginManifest
  module: unknown
  loadedAt: number
}

export type ReloadEvent =
  | { type: 'reload_start'; pluginName: string; path: string }
  | { type: 'reload_success'; pluginName: string; durationMs: number }
  | { type: 'reload_failed'; pluginName: string; error: string }
  | { type: 'rollback'; pluginName: string; reason: string }
  | { type: 'dependency_reload'; pluginName: string; triggeredBy: string }

export interface HotReloadConfig {
  /** Debounce interval in ms for rapid file changes (default: 500) */
  debounceMs?: number
  /** Watched file extensions (default: ['.js', '.ts', '.json']) */
  extensions?: string[]
  /** Whether to track and reload dependent plugins (default: true) */
  trackDependencies?: boolean
  /** Whether to rollback on failed reload (default: true) */
  rollbackOnFailure?: boolean
  /** Ignored directories (default: ['node_modules', '.git', 'dist']) */
  ignoredDirs?: string[]
}

const DEFAULT_CONFIG: Required<HotReloadConfig> = {
  debounceMs: 500,
  extensions: ['.js', '.ts', '.json'],
  trackDependencies: true,
  rollbackOnFailure: true,
  ignoredDirs: ['node_modules', '.git', 'dist', '__pycache__'],
}

export class PluginHotReloader extends EventEmitter {
  private watchers: FSWatcher[] = []
  private plugins = new Map<string, LoadedPlugin>()
  private pendingReloads = new Map<string, ReturnType<typeof setTimeout>>()
  private dependencyGraph = new Map<string, Set<string>>() // pluginName → Set of dependent pluginNames
  private config: Required<HotReloadConfig>

  constructor(private pluginManager?: unknown, config?: HotReloadConfig) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Start watching a directory for plugin changes */
  watch(directory: string): void {
    const ignoredDirs = new Set(this.config.ignoredDirs)

    const watcher = watch(
      directory,
      { recursive: true },
      (event, filename) => {
        if (!filename) return
        if (ignoredDirs.has(filename.split(/[/\\]/)[0])) return

        const ext = extname(filename)
        if (!this.config.extensions.includes(ext)) return

        this.scheduleReload(join(directory, filename))
      },
    )

    this.watchers.push(watcher)
  }

  /** Stop all watchers */
  stop(): void {
    for (const w of this.watchers) {
      w.close()
    }
    this.watchers = []
    for (const timer of this.pendingReloads.values()) {
      clearTimeout(timer)
    }
    this.pendingReloads.clear()
  }

  /** Get all loaded plugins */
  getPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values())
  }

  /** Get a plugin by name */
  getPlugin(name: string): LoadedPlugin | undefined {
    return this.plugins.get(name)
  }

  /** Register a plugin (initial load) */
  registerPlugin(plugin: LoadedPlugin): void {
    this.plugins.set(plugin.name, plugin)

    // Update dependency graph
    if (this.config.trackDependencies && plugin.manifest.dependencies) {
      for (const dep of plugin.manifest.dependencies) {
        if (!this.dependencyGraph.has(dep)) {
          this.dependencyGraph.set(dep, new Set())
        }
        this.dependencyGraph.get(dep)!.add(plugin.name)
      }
    }
  }

  /** Unregister a plugin */
  unregisterPlugin(name: string): void {
    this.plugins.delete(name)
    this.dependencyGraph.delete(name)
  }

  /** Schedule a debounced reload for a changed file */
  private scheduleReload(filePath: string): void {
    // Cancel existing timer
    const existing = this.pendingReloads.get(filePath)
    if (existing) clearTimeout(existing)

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.pendingReloads.delete(filePath)
      void this.performReload(filePath)
    }, this.config.debounceMs)

    this.pendingReloads.set(filePath, timer)
  }

  /** Perform the actual reload */
  private async performReload(filePath: string): Promise<void> {
    // Find which plugin this file belongs to
    const plugin = this.findPluginForFile(filePath)
    if (!plugin) return

    this.emitReload({ type: 'reload_start', pluginName: plugin.name, path: filePath })

    const start = Date.now()
    const previousPlugin = { ...plugin }

    try {
      // Clear require cache for the changed file and its manifest
      this.clearRequireCache(filePath)
      const manifestPath = join(dirname(filePath), 'manifest.json')
      this.clearRequireCache(manifestPath)

      // Re-import the plugin
      const newModule = await this.importPlugin(filePath)
      const newManifest = await this.loadManifest(dirname(filePath))

      // Validate new version
      if (newManifest && !this.validatePlugin(newManifest)) {
        throw new Error(`Plugin manifest validation failed for ${plugin.name}`)
      }

      // Update the plugin
      const updatedPlugin: LoadedPlugin = {
        name: plugin.name,
        version: newManifest?.version ?? plugin.version,
        path: filePath,
        manifest: newManifest ?? plugin.manifest,
        module: newModule,
        loadedAt: Date.now(),
      }

      this.plugins.set(plugin.name, updatedPlugin)

      const durationMs = Date.now() - start
      this.emitReload({ type: 'reload_success', pluginName: plugin.name, durationMs })

      // Reload dependent plugins
      if (this.config.trackDependencies) {
        await this.reloadDependents(plugin.name)
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      this.emitReload({ type: 'reload_failed', pluginName: plugin.name, error: errMsg })

      // Rollback to previous version
      if (this.config.rollbackOnFailure) {
        this.plugins.set(plugin.name, previousPlugin as LoadedPlugin)
        this.emitReload({ type: 'rollback', pluginName: plugin.name, reason: errMsg })
      }
    }
  }

  /** Reload all plugins that depend on the changed plugin */
  private async reloadDependents(pluginName: string): Promise<void> {
    const dependents = this.dependencyGraph.get(pluginName)
    if (!dependents?.size) return

    for (const depName of dependents) {
      const dep = this.plugins.get(depName)
      if (dep) {
        this.emitReload({ type: 'dependency_reload', pluginName: depName, triggeredBy: pluginName })
        await this.performReload(dep.path)
      }
    }
  }

  /** Find which plugin a file belongs to */
  private findPluginForFile(filePath: string): LoadedPlugin | undefined {
    const normalizedPath = filePath.replace(/\\/g, '/')
    for (const plugin of this.plugins.values()) {
      const pluginDir = dirname(plugin.path).replace(/\\/g, '/')
      if (normalizedPath.startsWith(pluginDir)) {
        return plugin
      }
    }
    return undefined
  }

  /** Clear Node.js require cache for a file */
  private clearRequireCache(filePath: string): void {
    const normalizedPath = filePath.replace(/\\/g, '/')
    for (const key of Object.keys(require.cache)) {
      if (key.replace(/\\/g, '/').startsWith(dirname(normalizedPath))) {
        delete require.cache[key]
      }
    }
  }

  /** Import a plugin module */
  private async importPlugin(filePath: string): Promise<unknown> {
    try {
      // Try dynamic import first
      const mod = await import(`file://${filePath}?t=${Date.now()}`)
      return mod.default ?? mod
    } catch {
      // Fallback to require
      try {
        delete require.cache[require.resolve(filePath)]
        return require(filePath)
      } catch {
        throw new Error(`Failed to import plugin from ${filePath}`)
      }
    }
  }

  /** Load and parse a manifest.json */
  private async loadManifest(dir: string): Promise<PluginManifest | null> {
    const manifestPath = join(dir, 'manifest.json')
    try {
      const content = await import('fs/promises').then(m => m.readFile(manifestPath, 'utf-8'))
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /** Validate a plugin manifest */
  private validatePlugin(manifest: PluginManifest): boolean {
    return !!(
      manifest.name &&
      typeof manifest.name === 'string' &&
      manifest.version &&
      typeof manifest.version === 'string'
    )
  }

  private emitReload(event: ReloadEvent): void {
    this.emit('reload', event)
  }

  /** Subscribe to reload events */
  onReload(callback: (event: ReloadEvent) => void): () => void {
    const handler = (event: ReloadEvent) => callback(event)
    this.on('reload', handler)
    return () => this.off('reload', handler)
  }
}
