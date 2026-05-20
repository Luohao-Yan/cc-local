#!/usr/bin/env bun

/**
 * Download Native Dependencies Script
 * Downloads ripgrep for the current platform
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, copyFileSync, rmSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { platform, arch } from 'os'

const ROOT_DIR = join(import.meta.dir, '..')
const NATIVE_DIR = join(ROOT_DIR, 'native')

// Ensure native directory exists
if (!existsSync(NATIVE_DIR)) {
  mkdirSync(NATIVE_DIR, { recursive: true })
}

// Determine current platform
const currentPlatform = platform()
const currentArch = arch()

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

// Ripgrep releases
const RIPGREP_VERSION = '14.1.0'

interface RipgrepRelease {
  url: string
  binName: string
  archiveExt: string
}

const RIPGREP_RELEASES: Record<string, RipgrepRelease> = {
  'win32-x64': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-x86_64-pc-windows-msvc.zip`,
    binName: 'rg.exe',
    archiveExt: '.zip',
  },
  'darwin-x64': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-x86_64-apple-darwin.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
  },
  'darwin-arm64': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-aarch64-apple-darwin.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
  },
  'linux-x64': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-x86_64-unknown-linux-musl.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
  },
  'linux-arm64': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-aarch64-unknown-linux-gnu.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
  },
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  console.log(`  Downloading ${url}...`)

  try {
    execSync(`curl -L -o "${outputPath}" "${url}"`, { stdio: 'inherit' })
    console.log(`  ✅ Downloaded`)
  } catch (error) {
    console.error(`  ❌ Failed to download: ${error}`)
    throw error
  }
}

async function extractArchive(archivePath: string, outputDir: string): Promise<void> {
  console.log(`  Extracting...`)

  try {
    if (archivePath.endsWith('.zip')) {
      if (currentPlatform === 'win32') {
        execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${outputDir}' -Force"`, { stdio: 'inherit' })
      } else {
        execSync(`unzip -o "${archivePath}" -d "${outputDir}"`, { stdio: 'inherit' })
      }
    } else if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
      execSync(`tar -xzf "${archivePath}" -C "${outputDir}"`, { stdio: 'inherit' })
    }
    console.log(`  ✅ Extracted`)
  } catch (error) {
    console.error(`  ❌ Failed to extract: ${error}`)
    throw error
  }
}

async function main() {
  console.log('📦 Downloading native dependencies...\n')
  console.log(`Platform: ${platformName}\n`)

  const release = RIPGREP_RELEASES[platformName]
  if (!release) {
    console.error(`❌ Unsupported platform: ${platformName}`)
    console.log('Supported platforms:', Object.keys(RIPGREP_RELEASES).join(', '))
    process.exit(1)
  }

  const platformDir = join(NATIVE_DIR, platformName)
  if (!existsSync(platformDir)) {
    mkdirSync(platformDir, { recursive: true })
  }

  const archivePath = join(platformDir, `ripgrep${release.archiveExt}`)

  // Download
  await downloadFile(release.url, archivePath)

  // Extract
  await extractArchive(archivePath, platformDir)

  // Find and move the binary
  // The archive extracts to a subdirectory like ripgrep-14.1.0-x86_64-pc-windows-msvc/
  try {
    const entries = readdirSync(platformDir, { withFileTypes: true })
    const subDir = entries.find(e => e.isDirectory() && e.name.startsWith('ripgrep-'))

    if (subDir) {
      const subDirPath = join(platformDir, subDir.name)
      const srcBin = join(subDirPath, release.binName)
      const destBin = join(platformDir, release.binName)

      if (existsSync(srcBin)) {
        copyFileSync(srcBin, destBin)
        console.log(`  ✅ Binary copied to ${destBin}`)

        // Clean up archive and subdirectory
        rmSync(archivePath, { force: true })
        rmSync(subDirPath, { recursive: true, force: true })
        console.log(`  ✅ Cleaned up temporary files`)
      }
    }
  } catch (error) {
    console.log(`  ⚠️ Could not move binary: ${error}`)
  }

  // Create manifest
  const manifest = {
    version: RIPGREP_VERSION,
    platform: platformName,
    binaries: {
      ripgrep: `native/${platformName}/${release.binName}`,
    },
  }

  writeFileSync(join(NATIVE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log('\n✅ Native dependencies downloaded!')
  console.log(`   Output: ${NATIVE_DIR}`)
}

main().catch(console.error)
