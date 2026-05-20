#!/usr/bin/env bun

/**
 * Download Native Dependencies for All Platforms
 * Downloads ripgrep for all 6 supported platforms
 *
 * Usage:
 *   bun run download:all-native [--platform <name>]
 *
 * Platforms:
 *   - x64-win32, arm64-win32
 *   - x64-darwin, arm64-darwin
 *   - x64-linux, arm64-linux
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, copyFileSync, rmSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const ROOT_DIR = join(import.meta.dir, '..')
const NATIVE_DIR = join(ROOT_DIR, 'native')

// Ensure native directory exists
if (!existsSync(NATIVE_DIR)) {
  mkdirSync(NATIVE_DIR, { recursive: true })
}

// Ripgrep version
const RIPGREP_VERSION = '14.1.0'

// All supported platforms
const ALL_PLATFORMS = [
  'x64-win32',
  'arm64-win32',
  'x64-darwin',
  'arm64-darwin',
  'x64-linux',
  'arm64-linux',
]

interface RipgrepRelease {
  url: string
  binName: string
  archiveExt: string
  platformDir: string
}

// Ripgrep releases for each platform
const RIPGREP_RELEASES: Record<string, RipgrepRelease> = {
  'x64-win32': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-x86_64-pc-windows-msvc.zip`,
    binName: 'rg.exe',
    archiveExt: '.zip',
    platformDir: `ripgrep-${RIPGREP_VERSION}-x86_64-pc-windows-msvc`,
  },
  'arm64-win32': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-aarch64-pc-windows-msvc.zip`,
    binName: 'rg.exe',
    archiveExt: '.zip',
    platformDir: `ripgrep-${RIPGREP_VERSION}-aarch64-pc-windows-msvc`,
  },
  'x64-darwin': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-x86_64-apple-darwin.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
    platformDir: `ripgrep-${RIPGREP_VERSION}-x86_64-apple-darwin`,
  },
  'arm64-darwin': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-aarch64-apple-darwin.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
    platformDir: `ripgrep-${RIPGREP_VERSION}-aarch64-apple-darwin`,
  },
  'x64-linux': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-x86_64-unknown-linux-musl.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
    platformDir: `ripgrep-${RIPGREP_VERSION}-x86_64-unknown-linux-musl`,
  },
  'arm64-linux': {
    url: `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/ripgrep-${RIPGREP_VERSION}-aarch64-unknown-linux-gnu.tar.gz`,
    binName: 'rg',
    archiveExt: '.tar.gz',
    platformDir: `ripgrep-${RIPGREP_VERSION}-aarch64-unknown-linux-gnu`,
  },
}

function downloadFile(url: string, outputPath: string): boolean {
  console.log(`  Downloading ${url}...`)

  try {
    // Use curl with retry and follow redirects
    execSync(`curl -L --retry 3 --retry-delay 2 -o "${outputPath}" "${url}"`, {
      stdio: 'pipe',
      timeout: 120000, // 2 minutes timeout
    })
    console.log(`  ✅ Downloaded`)
    return true
  } catch (error) {
    console.error(`  ❌ Failed to download: ${error}`)
    return false
  }
}

function extractArchive(archivePath: string, outputDir: string, archiveExt: string): boolean {
  console.log(`  Extracting...`)

  try {
    if (archiveExt === '.zip') {
      // Windows: use PowerShell
      if (process.platform === 'win32') {
        execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${outputDir}' -Force"`, { stdio: 'pipe' })
      } else {
        // Unix: use unzip
        execSync(`unzip -o "${archivePath}" -d "${outputDir}"`, { stdio: 'pipe' })
      }
    } else if (archiveExt === '.tar.gz') {
      execSync(`tar -xzf "${archivePath}" -C "${outputDir}"`, { stdio: 'pipe' })
    }
    console.log(`  ✅ Extracted`)
    return true
  } catch (error) {
    console.error(`  ❌ Failed to extract: ${error}`)
    return false
  }
}

async function downloadForPlatform(platform: string): Promise<boolean> {
  console.log(`\n📦 Downloading for ${platform}...`)

  const release = RIPGREP_RELEASES[platform]
  if (!release) {
    console.error(`  ❌ Unknown platform: ${platform}`)
    return false
  }

  const platformDir = join(NATIVE_DIR, platform)
  if (!existsSync(platformDir)) {
    mkdirSync(platformDir, { recursive: true })
  }

  // Check if already exists
  const binPath = join(platformDir, release.binName)
  if (existsSync(binPath)) {
    console.log(`  ✅ Already exists, skipping`)
    return true
  }

  const archivePath = join(platformDir, `ripgrep${release.archiveExt}`)

  // Download
  if (!downloadFile(release.url, archivePath)) {
    return false
  }

  // Extract
  if (!extractArchive(archivePath, platformDir, release.archiveExt)) {
    return false
  }

  // Move binary from subdirectory to platform directory
  try {
    const srcBin = join(platformDir, release.platformDir, release.binName)
    if (existsSync(srcBin)) {
      copyFileSync(srcBin, binPath)
      console.log(`  ✅ Binary copied to ${binPath}`)

      // Clean up
      rmSync(archivePath, { force: true })
      rmSync(join(platformDir, release.platformDir), { recursive: true, force: true })
      console.log(`  ✅ Cleaned up temporary files`)
    } else {
      console.error(`  ❌ Binary not found at ${srcBin}`)
      return false
    }
  } catch (error) {
    console.error(`  ❌ Failed to move binary: ${error}`)
    return false
  }

  return true
}

async function main() {
  console.log('📦 Downloading native dependencies for all platforms...\n')

  // Parse arguments
  const args = process.argv.slice(2)
  let platforms = ALL_PLATFORMS

  const platformIndex = args.indexOf('--platform')
  if (platformIndex !== -1 && args[platformIndex + 1]) {
    const specifiedPlatform = args[platformIndex + 1]
    if (RIPGREP_RELEASES[specifiedPlatform]) {
      platforms = [specifiedPlatform]
    } else {
      console.error(`❌ Unknown platform: ${specifiedPlatform}`)
      console.log('Available platforms:', Object.keys(RIPGREP_RELEASES).join(', '))
      process.exit(1)
    }
  }

  console.log(`Platforms: ${platforms.join(', ')}`)
  console.log(`Ripgrep version: ${RIPGREP_VERSION}\n`)

  // Download for each platform
  const results: Record<string, boolean> = {}

  for (const platform of platforms) {
    results[platform] = await downloadForPlatform(platform)
  }

  // Create manifest
  const manifest = {
    version: RIPGREP_VERSION,
    platforms: Object.fromEntries(
      Object.entries(results).map(([platform, success]) => [
        platform,
        {
          ripgrep: success ? `native/${platform}/${RIPGREP_RELEASES[platform].binName}` : null,
        },
      ])
    ),
    buildDate: new Date().toISOString(),
  }

  writeFileSync(join(NATIVE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:\n')

  const succeeded = Object.entries(results).filter(([, v]) => v)
  const failed = Object.entries(results).filter(([, v]) => !v)

  if (succeeded.length > 0) {
    console.log('✅ Succeeded:')
    for (const [platform] of succeeded) {
      console.log(`   ${platform}`)
    }
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed:')
    for (const [platform] of failed) {
      console.log(`   ${platform}`)
    }
    process.exit(1)
  }

  console.log('\n✅ All native dependencies downloaded!')
  console.log(`   Output: ${NATIVE_DIR}`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
