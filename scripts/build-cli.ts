#!/usr/bin/env bun

/**
 * Build CLI Executable Script
 * Compiles the CLI as a standalone executable for the current platform
 *
 * Note: Bun's --compile does not support cross-compilation.
 * For multi-platform builds, run this script on each target platform.
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { platform, arch } from 'os'

const ROOT_DIR = join(import.meta.dir, '..')
const PACKAGES_DIR = join(ROOT_DIR, 'packages')
const DIST_DIR = join(ROOT_DIR, 'dist')
const CLI_DIR = join(PACKAGES_DIR, 'cli')

// Determine current platform
const currentPlatform = platform()
const currentArch = arch()

// Map to our naming convention
const platformName = (() => {
  switch (currentPlatform) {
    case 'win32':
      return currentArch === 'x64' ? 'win32-x64' : 'win32-arm64'
    case 'darwin':
      return currentArch === 'x64' ? 'darwin-x64' : 'darwin-arm64'
    case 'linux':
      return currentArch === 'x64' ? 'linux-x64' : 'linux-arm64'
    default:
      return `${currentPlatform}-${currentArch}`
  }
})()

const ext = currentPlatform === 'win32' ? '.exe' : ''

console.log('🔨 Building CLI executable...\n')
console.log(`Platform: ${platformName}`)
console.log(`Architecture: ${currentArch}\n`)

// Ensure dist directory exists
if (!existsSync(DIST_DIR)) {
  mkdirSync(DIST_DIR, { recursive: true })
}

const outputFile = join(DIST_DIR, `cclocal-${platformName}${ext}`)
const entryPoint = join(CLI_DIR, 'src', 'index.ts')

console.log(`Entry point: ${entryPoint}`)
console.log(`Output: ${outputFile}\n`)

try {
  // Use bun build --compile for standalone executable
  // Note: This only works for the current platform
  execSync(
    `bun build "${entryPoint}" --compile --outfile="${outputFile}"`,
    {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    }
  )

  console.log(`\n✅ CLI executable created: ${outputFile}`)
} catch (error) {
  console.error(`\n❌ Failed to build CLI: ${error}`)
  process.exit(1)
}

// Create version info
try {
  const pkgJsonPath = join(CLI_DIR, 'package.json')
  const pkgJson = existsSync(pkgJsonPath)
    ? JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    : { version: '1.0.0' }

  const versionInfo = {
    version: pkgJson.version,
    buildDate: new Date().toISOString(),
    platform: platformName,
    node: process.versions.node,
    bun: process.versions.bun,
  }

  writeFileSync(join(DIST_DIR, 'version.json'), JSON.stringify(versionInfo, null, 2))
  console.log(`📄 Version info written to ${join(DIST_DIR, 'version.json')}`)
} catch (error) {
  console.log(`⚠️ Could not write version info: ${error}`)
}

console.log('\n✅ CLI build complete!')
console.log(`   Output: ${DIST_DIR}`)
console.log(`   Executable: cclocal-${platformName}${ext}`)

// Print note about cross-compilation
if (currentPlatform === 'win32') {
  console.log('\n📝 Note: For other platforms, run this script on:')
  console.log('   - macOS (Intel or ARM): bun run build:cli')
  console.log('   - Linux (x64 or ARM): bun run build:cli')
}
