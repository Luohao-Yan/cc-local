#!/usr/bin/env bun

/**
 * Package VS Code Extension Script
 * Creates a VSIX package with bundled CLI and native dependencies
 *
 * Output structure (matching official extension):
 *   bundle/
 *   ├── extension.js
 *   ├── webview-dist/
 *   │   ├── index.js
 *   │   └── index.css
 *   ├── resources/
 *   │   └── claude-code/
 *   │       ├── cclocal-{platform}  (CLI executable)
 *   │       └── vendor/
 *   │           └── ripgrep/
 *   │               └── {platform}/rg(.exe)
 *   └── cclocal-settings.schema.json
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { platform, arch } from 'os'

const ROOT_DIR = join(import.meta.dir, '..')
const DIST_DIR = join(ROOT_DIR, 'dist')
const NATIVE_DIR = join(ROOT_DIR, 'native')
const VSCODE_DIR = join(ROOT_DIR, 'packages', 'vscode-ext')

// Determine current platform
const currentPlatform = platform()
const currentArch = arch()

const platformName = (() => {
  switch (currentPlatform) {
    case 'win32':
      return currentArch === 'x64' ? 'x64-win32' : 'arm64-win32'
    case 'darwin':
      return currentArch === 'x64' ? 'x64-darwin' : 'arm64-darwin'
    case 'linux':
      return currentArch === 'x64' ? 'x64-linux' : 'arm64-linux'
    default:
      return `${currentArch}-${currentPlatform}`
  }
})()

// CLI naming (matches official pattern)
const cliPlatformName = (() => {
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
const cliFile = `cclocal-${cliPlatformName}${ext}`

// Check for --no-rebuild flag
const noRebuild = process.argv.includes('--no-rebuild')

console.log('📦 Packaging VS Code Extension...\n')
console.log(`Platform: ${platformName}`)
console.log(`CLI: ${cliFile}\n`)

// Step 1: Build CLI executable (if needed)
console.log('1️⃣ CLI executable...')
const cliPath = join(DIST_DIR, cliFile)
if (!noRebuild && !existsSync(cliPath)) {
  try {
    execSync('bun run build:cli', { cwd: ROOT_DIR, stdio: 'inherit' })
    console.log('   ✅ CLI executable built\n')
  } catch (error) {
    console.error('   ❌ Failed to build CLI:', error)
    process.exit(1)
  }
} else if (existsSync(cliPath)) {
  console.log('   ✅ CLI executable already exists\n')
} else {
  console.log('   ⏭️ Skipping CLI build (--no-rebuild)\n')
}

// Step 2: Check native dependencies
console.log('2️⃣ Native dependencies...')
const nativePath = join(NATIVE_DIR, cliPlatformName.replace('-', '-'))
if (!existsSync(nativePath)) {
  console.log('   Downloading...')
  try {
    execSync('bun run download:native', { cwd: ROOT_DIR, stdio: 'inherit' })
  } catch (error) {
    console.log('   ⚠️ Native dependencies download failed, continuing without them')
  }
} else {
  console.log('   ✅ Native dependencies already exist\n')
}

// Step 3: Build webview
console.log('3️⃣ Building webview...')
try {
  execSync('npm run build', { cwd: join(VSCODE_DIR, 'webview'), stdio: 'inherit' })
  console.log('   ✅ Webview built\n')
} catch (error) {
  console.error('   ❌ Failed to build webview:', error)
  process.exit(1)
}

// Step 4: Build VS Code extension
console.log('4️⃣ Building VS Code extension...')
try {
  execSync(
    'bunx esbuild src/extension.ts --bundle --outfile=out/extension.js --external:vscode --format=cjs --platform=node --minify',
    { cwd: VSCODE_DIR, stdio: 'inherit' }
  )
  console.log('   ✅ Extension built\n')
} catch (error) {
  console.error('   ❌ Failed to build extension:', error)
  process.exit(1)
}

// Step 5: Prepare bundle directory (official-like structure)
console.log('5️⃣ Preparing bundle directory...')
const BUNDLE_DIR = join(VSCODE_DIR, 'bundle')

// Clean bundle directory
if (existsSync(BUNDLE_DIR)) {
  rmSync(BUNDLE_DIR, { recursive: true, force: true })
}
mkdirSync(BUNDLE_DIR, { recursive: true })

// Create resources/claude-code structure (matching official)
const RESOURCES_DIR = join(BUNDLE_DIR, 'resources', 'claude-code')
mkdirSync(RESOURCES_DIR, { recursive: true })

// Copy CLI executable to resources/claude-code/
if (existsSync(cliPath)) {
  copyFileSync(cliPath, join(RESOURCES_DIR, cliFile))
  console.log(`   📄 Copied CLI: ${cliFile}`)
} else {
  console.log(`   ⚠️ CLI executable not found: ${cliPath}`)
}

// Create vendor/ripgrep structure (matching official)
const RIPGREP_DIR = join(RESOURCES_DIR, 'vendor', 'ripgrep', platformName)
mkdirSync(RIPGREP_DIR, { recursive: true })

// Copy ripgrep binary
const rgBin = currentPlatform === 'win32' ? 'rg.exe' : 'rg'
const nativePlatformDir = cliPlatformName.replace('-', '-')
const srcRgPath = join(NATIVE_DIR, nativePlatformDir, rgBin)
if (existsSync(srcRgPath)) {
  copyFileSync(srcRgPath, join(RIPGREP_DIR, rgBin))
  console.log(`   📄 Copied ripgrep: ${platformName}/${rgBin}`)
}

// Copy webview-dist
const WEBVIEW_DIST_SRC = join(VSCODE_DIR, 'webview-dist')
const WEBVIEW_DIST_DEST = join(BUNDLE_DIR, 'webview-dist')
if (existsSync(WEBVIEW_DIST_SRC)) {
  mkdirSync(WEBVIEW_DIST_DEST, { recursive: true })
  const webviewFiles = readdirSync(WEBVIEW_DIST_SRC)
  for (const file of webviewFiles) {
    const srcPath = join(WEBVIEW_DIST_SRC, file)
    const stat = statSync(srcPath)
    if (stat.isFile()) {
      copyFileSync(srcPath, join(WEBVIEW_DIST_DEST, file))
    }
  }
  console.log('   📁 Copied webview-dist/')
}

// Copy extension.js
copyFileSync(join(VSCODE_DIR, 'out', 'extension.js'), join(BUNDLE_DIR, 'extension.js'))
console.log('   📄 Copied extension.js')

// Copy settings schema
const schemaSrc = join(VSCODE_DIR, 'cclocal-settings.schema.json')
if (existsSync(schemaSrc)) {
  copyFileSync(schemaSrc, join(BUNDLE_DIR, 'cclocal-settings.schema.json'))
  console.log('   📄 Copied cclocal-settings.schema.json')
}

// Create resources manifest (for CLI discovery)
const manifest = {
  version: '1.0.0',
  buildDate: new Date().toISOString(),
  platform: platformName,
  cli: `resources/claude-code/${cliFile}`,
  ripgrep: `resources/claude-code/vendor/ripgrep/${platformName}/${rgBin}`,
}
writeFileSync(join(RESOURCES_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('   📄 Created manifest.json')

console.log('   ✅ Bundle prepared\n')

// Step 6: Create VSIX package
console.log('6️⃣ Creating VSIX package...')
try {
  execSync('bunx vsce package --no-dependencies --allow-star-activation', {
    cwd: VSCODE_DIR,
    stdio: 'inherit',
  })
  console.log('   ✅ VSIX package created\n')
} catch (error) {
  console.error('   ❌ Failed to create VSIX:', error)
  process.exit(1)
}

// Step 7: Report results
console.log('✅ Packaging complete!')
console.log('\nOutput files:')
const vsixFiles = readdirSync(VSCODE_DIR).filter(f => f.endsWith('.vsix'))
for (const file of vsixFiles) {
  const stat = statSync(join(VSCODE_DIR, file))
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2)
  console.log(`   📦 ${file} (${sizeMB} MB)`)
}

// Clean up bundle directory
console.log('\n🧹 Cleaning up...')
try {
  rmSync(BUNDLE_DIR, { recursive: true, force: true })
  console.log('   ✅ Cleaned up bundle directory')
} catch {
  // Ignore cleanup errors
}
