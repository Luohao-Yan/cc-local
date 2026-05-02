import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const PACKAGE_ONLY_OPTIONS_WITH_VALUE = new Set([
  '--server',
  '-s',
  '--token',
  '-t',
  '--cwd',
  '--session',
])

const PACKAGE_ONLY_BOOLEAN_OPTIONS = new Set([
  '--server-embedded',
  '--legacy',
  '--native',
])

const LEGACY_UI_OPTIONS_WITH_VALUE = new Set([
  '--print',
  '-p',
  '--resume',
  '-r',
  '--model',
  '--permission-mode',
  '--allowedTools',
  '--allowed-tools',
  '--disallowedTools',
  '--disallowed-tools',
  '--tools',
  '--output-format',
  '--input-format',
  '--json-schema',
  '--system-prompt',
  '--system-prompt-file',
  '--append-system-prompt',
  '--append-system-prompt-file',
  '--settings',
  '--mcp-config',
  '--permission-prompt-tool',
  '--session-id',
  '--name',
  '-n',
  '--worktree',
  '-w',
  '--add-dir',
  '--agent',
  '--agents',
  '--fallback-model',
  '--file',
  '--max-budget-usd',
  '--max-thinking-tokens',
  '--max-turns',
  '--plugin-dir',
  '--prefill',
  '--workload',
  '--deep-link-repo',
  '--deep-link-last-fetch',
  '--setting-sources',
  '--betas',
])

const PACKAGES_MANAGEMENT_COMMANDS = new Set([
  'models',
  'sessions',
  'config',
  'context',
  'env',
  'stats',
  'cost',
  'permissions',
  'model',
  'setup-token',
])

const LEGACY_COMPATIBILITY_COMMANDS = new Set([
  'agents',
  'assistant',
  'auto-mode',
  'completion',
  'auth',
  'doctor',
  'error',
  'export',
  'install',
  'log',
  'mcp',
  'open',
  'plugin',
  'plugins',
  'remote-control',
  'rollback',
  'server',
  'ssh',
  'task',
  'update',
  'upgrade',
  'up',
])

const LEGACY_ONLY_OPTIONS: Set<string> = new Set([])

export function getUserArgs(argv: string[]): string[] {
  return argv.slice(2).filter((arg) => arg !== '--')
}

export function stripPackageOnlyArgs(args: string[]): string[] {
  const result: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (PACKAGE_ONLY_BOOLEAN_OPTIONS.has(arg)) {
      continue
    }
    if (PACKAGE_ONLY_OPTIONS_WITH_VALUE.has(arg)) {
      index += 1
      continue
    }
    if ([...PACKAGE_ONLY_OPTIONS_WITH_VALUE, ...PACKAGE_ONLY_BOOLEAN_OPTIONS].some((option) => arg.startsWith(`${option}=`))) {
      continue
    }
    result.push(arg)
  }
  return result
}

export function getFirstCommand(args: string[]): string | undefined {
  const stripped = stripPackageOnlyArgs(args)
  for (let index = 0; index < stripped.length; index += 1) {
    const arg = stripped[index]
    if (arg.startsWith('-')) {
      const option = arg.split('=')[0]
      if (!arg.includes('=') && LEGACY_UI_OPTIONS_WITH_VALUE.has(option)) {
        index += 1
      }
      continue
    }
    return arg
  }
  return undefined
}

export function shouldUseLegacyUi(args: string[]): boolean {
  if (args.some((arg) => arg === '--legacy' || arg.startsWith('--legacy='))) {
    return true
  }

  if (args.some((arg) => arg === '--native' || arg.startsWith('--native='))) {
    return false
  }

  // cclocal-next entry point: default to native unless --legacy is explicit
  if (process.env.CCLOCAL_DEFAULT_NATIVE === '1') {
    return false
  }

  if (args.some((arg) => arg === '--server' || arg === '-s' || arg.startsWith('--server=') || arg === '--token' || arg === '-t' || arg.startsWith('--token='))) {
    return false
  }

  const stripped = stripPackageOnlyArgs(args)
  const firstCommand = getFirstCommand(args)

  if (firstCommand && PACKAGES_MANAGEMENT_COMMANDS.has(firstCommand)) {
    return false
  }

  if (firstCommand && LEGACY_COMPATIBILITY_COMMANDS.has(firstCommand)) {
    return true
  }

  if (stripped.some((arg) => {
    const option = arg.split('=')[0]
    return LEGACY_ONLY_OPTIONS.has(option)
  })) {
    return true
  }

  // Default to legacy Ink UI (original behavior)
  // Use --native to use the new packages-native REPL
  return true
}

export function findLegacyRepoRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 8; depth += 1) {
    if (!existsSync(join(current, 'package.json'))) {
      current = dirname(current)
      continue
    }
    if (existsSync(join(current, 'packages', 'cli', 'src', 'entrypoints', 'cli.tsx'))) {
      return current
    }
    current = dirname(current)
  }
  return process.cwd()
}

export function resolveLegacyUiEntrypoint(repoRoot = findLegacyRepoRoot()): { entrypoint: string; cwd: string } {
  // Prefer compiled legacy-cli.js from dist (faster startup)
  const distEntrypoint = join(repoRoot, 'dist', 'legacy-cli.js')
  if (existsSync(distEntrypoint)) {
    return { entrypoint: distEntrypoint, cwd: repoRoot }
  }

  const monorepoEntrypoint = join(repoRoot, 'packages', 'cli', 'src', 'entrypoints', 'cli.tsx')
  if (existsSync(monorepoEntrypoint)) {
    return { entrypoint: monorepoEntrypoint, cwd: repoRoot }
  }

  return {
    entrypoint: join(dirname(fileURLToPath(import.meta.url)), 'legacy-cli.js'),
    cwd: process.cwd(),
  }
}

export function delegateToLegacyUi(args: string[]): never {
  const legacyArgs = stripPackageOnlyArgs(args)
  const { entrypoint, cwd } = resolveLegacyUiEntrypoint()

  // Use process.execPath (current bun executable) instead of 'bun'
  // to ensure we find bun even when running as a global command
  const result = spawnSync(process.execPath, [entrypoint, ...legacyArgs], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      CCLOCAL_SKIP_STDIN: '1', // Skip stdin reading in spawned process
      CCLOCAL_FORCE_INTERACTIVE: '1', // Force interactive mode (TTY is false on Windows spawnSync)
    },
  })

  if (result.error) {
    console.error(`Failed to delegate to legacy UI: ${result.error.message}`)
    process.exit(1)
  }
  process.exit(result.status ?? 0)
}
