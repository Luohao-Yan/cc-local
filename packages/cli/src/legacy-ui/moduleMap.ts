import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

export interface LegacyUiModuleMap {
  repoRoot: string
  appShellEntry: string
  replLauncherEntry: string
  replScreenEntry: string
  inkEntry: string
  appStateEntry: string
}

export function findLegacyUiRepoRoot(fromPath = fileURLToPath(import.meta.url)): string | undefined {
  let current = dirname(fromPath)
  for (let depth = 0; depth < 10; depth += 1) {
    if (
      existsSync(join(current, 'package.json')) &&
      existsSync(join(current, 'AGENTS.md')) &&
      existsSync(join(current, 'src', 'components', 'App.tsx')) &&
      existsSync(join(current, 'src', 'screens', 'REPL.tsx')) &&
      existsSync(join(current, 'src', 'replLauncher.tsx'))
    ) {
      return current
    }
    current = dirname(current)
  }
  return undefined
}

export function resolveLegacyUiModuleMap(repoRoot = findLegacyUiRepoRoot()): LegacyUiModuleMap {
  if (!repoRoot) {
    throw new Error('Legacy UI source tree not found. Expected src/components/App.tsx and src/screens/REPL.tsx.')
  }

  return {
    repoRoot,
    appShellEntry: join(repoRoot, 'packages', 'cli', 'src', 'components', 'App.tsx'),
    replLauncherEntry: join(repoRoot, 'packages', 'cli', 'src', 'replLauncher.tsx'),
    replScreenEntry: join(repoRoot, 'packages', 'cli', 'src', 'screens', 'REPL.tsx'),
    inkEntry: join(repoRoot, 'packages', 'cli', 'src', 'ink.ts'),
    appStateEntry: join(repoRoot, 'packages', 'cli', 'src', 'state', 'AppState.tsx'),
  }
}

export function legacyUiModuleUrls(moduleMap: LegacyUiModuleMap): Record<keyof Omit<LegacyUiModuleMap, 'repoRoot'>, string> {
  return {
    appShellEntry: pathToFileURL(moduleMap.appShellEntry).href,
    replLauncherEntry: pathToFileURL(moduleMap.replLauncherEntry).href,
    replScreenEntry: pathToFileURL(moduleMap.replScreenEntry).href,
    inkEntry: pathToFileURL(moduleMap.inkEntry).href,
    appStateEntry: pathToFileURL(moduleMap.appStateEntry).href,
  }
}
