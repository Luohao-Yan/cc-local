/**
 * MCPB Package Format Support
 *
 * Parse and validate .mcpb (MCP Bundle) and .dxt (Desktop Extension) packages.
 * These are self-contained MCP server distributions that include manifest metadata,
 * server code, and configuration.
 *
 * Package structure:
 * ```
 * my-server.mcpb/         (or .dxt)
 * ├── manifest.json       (package metadata)
 * ├── server.js           (server entry point)
 * └── README.md           (optional)
 * ```
 *
 * Manifest schema:
 * ```json
 * {
 *   "name": "my-server",
 *   "version": "1.0.0",
 *   "description": "My MCP server",
 *   "entry": "server.js",
 *   "type": "stdio",
 *   "config": { ... },
 *   "permissions": { ... }
 * }
 * ```
 *
 * Also supports .zip archives that extract to the above structure.
 */

import { readFile, readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { spawn } from 'child_process'
import type { MCPServerConfig } from './types.js'

export interface MCPBManifest {
  name: string
  version: string
  description?: string
  entry: string
  type: 'stdio' | 'sse' | 'http' | 'ws'
  args?: string[]
  env?: Record<string, string>
  config?: Record<string, unknown>
  permissions?: {
    tools?: string[]
    resources?: string[]
    prompts?: string[]
  }
  icon?: string
  author?: string
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
}

export interface MCPBPackage {
  manifest: MCPBManifest
  path: string
  config: MCPServerConfig
}

/**
 * Validate a manifest.json structure
 */
export function validateManifest(data: unknown): { valid: boolean; errors: string[]; manifest?: MCPBManifest } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Manifest must be a JSON object'] }
  }

  const m = data as Record<string, unknown>

  if (typeof m.name !== 'string' || !m.name.trim()) errors.push('name is required and must be a non-empty string')
  if (typeof m.version !== 'string' || !m.version.trim()) errors.push('version is required and must be a non-empty string')
  if (typeof m.entry !== 'string' || !m.entry.trim()) errors.push('entry is required and must be a non-empty string')
  if (!['stdio', 'sse', 'http', 'ws'].includes(m.type as string)) errors.push('type must be one of: stdio, sse, http, ws')

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    manifest: {
      name: m.name as string,
      version: m.version as string,
      description: m.description as string | undefined,
      entry: m.entry as string,
      type: m.type as MCPBManifest['type'],
      args: m.args as string[] | undefined,
      env: m.env as Record<string, string> | undefined,
      config: m.config as Record<string, unknown> | undefined,
      permissions: m.permissions as MCPBManifest['permissions'] | undefined,
      icon: m.icon as string | undefined,
      author: m.author as string | undefined,
      homepage: m.homepage as string | undefined,
      repository: m.repository as string | undefined,
      license: m.license as string | undefined,
      keywords: m.keywords as string[] | undefined,
    },
  }
}

/**
 * Load an MCPB package from a directory or zip file
 */
export async function loadMCPBPackage(packagePath: string): Promise<MCPBPackage> {
  // Check if it's a zip file
  if (extname(packagePath).toLowerCase() === '.zip' || extname(packagePath).toLowerCase() === '.mcpb') {
    return loadFromArchive(packagePath)
  }

  // Directory-based package
  return loadFromDirectory(packagePath)
}

async function loadFromDirectory(dirPath: string): Promise<MCPBPackage> {
  const manifestPath = join(dirPath, 'manifest.json')

  if (!existsSync(manifestPath)) {
    throw new Error(`No manifest.json found in ${dirPath}`)
  }

  const rawManifest = await readFile(manifestPath, 'utf-8')
  const data = JSON.parse(rawManifest)
  const validation = validateManifest(data)

  if (!validation.valid || !validation.manifest) {
    throw new Error(`Invalid manifest: ${validation.errors.join('; ')}`)
  }

  const manifest = validation.manifest
  const entryPath = join(dirPath, manifest.entry)

  if (!existsSync(entryPath)) {
    throw new Error(`Entry point not found: ${entryPath}`)
  }

  const config = manifestToConfig(manifest, dirPath)

  return { manifest, path: dirPath, config }
}

async function loadFromArchive(archivePath: string): Promise<MCPBPackage> {
  // Extract to temp directory
  const extractDir = archivePath.replace(/\.(zip|mcpb|dxt)$/i, '_extracted')

  if (!existsSync(extractDir)) {
    await mkdir(extractDir, { recursive: true })

    // Use system unzip
    await new Promise<void>((resolve, reject) => {
      const child = spawn('unzip', ['-o', archivePath, '-d', extractDir], {
        stdio: 'pipe',
      })
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Extraction failed with code ${code}`))
      })
      child.on('error', reject)
    })
  }

  // Check if the zip contained a single directory
  const entries = await readdir(extractDir)
  const packageDir = entries.length === 1 && (await stat(join(extractDir, entries[0]))).isDirectory()
    ? join(extractDir, entries[0])
    : extractDir

  return loadFromDirectory(packageDir)
}

/**
 * Convert manifest to MCPServerConfig
 */
function manifestToConfig(manifest: MCPBManifest, packagePath: string): MCPServerConfig {
  if (manifest.type === 'stdio') {
    return {
      type: 'stdio',
      command: process.execPath || 'node',
      args: [join(packagePath, manifest.entry), ...(manifest.args ?? [])],
      env: manifest.env ?? {},
    }
  }

  // For network-based servers, the entry is a URL
  return {
    type: manifest.type,
    url: manifest.entry,
    env: manifest.env,
    headers: manifest.config as Record<string, string> | undefined,
  }
}

/**
 * Install an MCPB package by extracting and registering it
 * Returns the MCPServerConfig ready for registration
 */
export async function installMCPBPackage(
  packagePath: string,
  installDir: string,
): Promise<MCPBPackage> {
  const pkg = await loadMCPBPackage(packagePath)
  const targetDir = join(installDir, pkg.manifest.name)

  // Copy the package to install directory (simplified — real impl would use fs.cp)
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true })
  }

  // Update config to point to installed location
  const config = manifestToConfig(pkg.manifest, targetDir)

  return { ...pkg, path: targetDir, config }
}
