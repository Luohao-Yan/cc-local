#!/usr/bin/env bun
/**
 * CCLocal 启动入口点
 *
 * 这个文件作为唯一的启动入口，负责路由到正确的 UI 模式。
 * 关键：在任何模块导入之前判断路由方向。
 */

// HTTP_PROXY 处理
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy
if (httpProxy && !process.env.CCLOCAL_NO_PROXY_SET) {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || ''
  if (!noProxy.includes('127.0.0.1') && !noProxy.includes('localhost')) {
    const result = Bun.spawnSync([process.execPath, process.argv[1], ...process.argv.slice(2)], {
      env: { ...process.env, NO_PROXY: '127.0.0.1,localhost', CCLOCAL_NO_PROXY_SET: '1' },
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    process.exit(result.exitCode ?? 0)
  }
}

// ============================================================================
// 路由判断逻辑（内联，避免任何导入）
// ============================================================================

const INK_CHECK_OPTIONS = new Set(['--ink', '--legacy'])
const NATIVE_CHECK_OPTIONS = new Set(['--native', '--server', '-s', '--token', '-t'])
const PACKAGES_MANAGEMENT_COMMANDS = new Set([
  'models', 'sessions', 'config', 'context', 'env', 'stats', 'cost', 'permissions', 'model', 'setup-token',
])

function getFirstCommand(args: string[]): string | undefined {
  for (const arg of args) {
    if (!arg.startsWith('-')) return arg
  }
  return undefined
}

function shouldUseInkUi(args: string[]): boolean {
  if (args.some((arg) => INK_CHECK_OPTIONS.has(arg) || arg.startsWith('--ink=') || arg.startsWith('--legacy='))) {
    return true
  }
  if (args.some((arg) => NATIVE_CHECK_OPTIONS.has(arg) || arg.startsWith('--native='))) {
    return false
  }
  const firstCommand = getFirstCommand(args)
  if (firstCommand && PACKAGES_MANAGEMENT_COMMANDS.has(firstCommand)) {
    return false
  }
  return true
}

// Packages-only options to strip
const PACKAGES_ONLY_OPTIONS = new Set(['--server-embedded', '--native'])

function stripPackagesOnlyOptions(args: string[]): string[] {
  return args.filter((arg) => !PACKAGES_ONLY_OPTIONS.has(arg))
}

// Determine routing
const userArgs = process.argv.slice(2).filter((arg) => arg !== '--')
const useInk = shouldUseInkUi(userArgs)

// ============================================================================
// 主入口逻辑
// ============================================================================

async function main(): Promise<void> {
  if (useInk) {
    await runInkUi()
  } else {
    await runPackagesNative()
  }
}

async function runInkUi(): Promise<void> {
  // 动态导入
  const { existsSync } = await import('fs')
  const { join, dirname } = await import('path')

  // Find repo root
  let repoRoot = import.meta.dir
  for (let depth = 0; depth < 8; depth += 1) {
    const parentDir = dirname(repoRoot)
    try {
      if (existsSync(join(parentDir, 'package.json')) && existsSync(join(parentDir, 'packages'))) {
        repoRoot = parentDir
        break
      }
    } catch {
      // continue
    }
    repoRoot = parentDir
  }

  // Find entrypoint - prefer source for development
  const srcEntrypoint = join(repoRoot, 'packages', 'cli', 'src', 'entrypoints', 'cli.tsx')
  const distEntrypoint = join(repoRoot, 'dist', 'legacy-cli.js')

  let entrypoint: string
  if (existsSync(srcEntrypoint)) {
    entrypoint = srcEntrypoint
  } else if (existsSync(distEntrypoint)) {
    entrypoint = distEntrypoint
  } else {
    console.error('Cannot find Ink UI entrypoint')
    process.exit(1)
    return
  }

  // Prepare args and environment
  const inkArgs = stripPackagesOnlyOptions(userArgs)
  process.argv = [process.argv[0]!, entrypoint, ...inkArgs]
  process.env.CCLOCAL_FORCE_INTERACTIVE = '1'

  // Dynamic import - cli.tsx will auto-execute via void main()
  await import(entrypoint)
}

async function runPackagesNative(): Promise<void> {
  // 设置环境变量标记
  process.env.CCLOCAL_PACKAGES_NATIVE = '1'

  // 动态导入 index.ts
  await import('./index.js')
}

// 运行
main().catch((error) => {
  console.error('Startup error:', error)
  process.exit(1)
})
