import { existsSync } from 'fs'
import { describe, expect, it } from 'vitest'
import {
  findLegacyUiRepoRoot,
  legacyUiModuleUrls,
  resolveLegacyUiModuleMap,
} from './moduleMap.js'

describe('legacy UI module map', () => {
  it('finds the repository root that contains the legacy UI source tree', () => {
    const repoRoot = findLegacyUiRepoRoot()
    expect(repoRoot).toBeTruthy()
  })

  it('resolves the core legacy UI module entries', () => {
    const moduleMap = resolveLegacyUiModuleMap()

    expect(existsSync(moduleMap.appShellEntry)).toBe(true)
    expect(existsSync(moduleMap.replLauncherEntry)).toBe(true)
    expect(existsSync(moduleMap.replScreenEntry)).toBe(true)
    expect(existsSync(moduleMap.inkEntry)).toBe(true)
    expect(existsSync(moduleMap.appStateEntry)).toBe(true)
  })

  it('converts module entries to file URLs for lazy loading', () => {
    const urls = legacyUiModuleUrls(resolveLegacyUiModuleMap())
    expect(urls.appShellEntry.startsWith('file://')).toBe(true)
    expect(urls.replLauncherEntry.startsWith('file://')).toBe(true)
    expect(urls.replScreenEntry.startsWith('file://')).toBe(true)
  })
})
