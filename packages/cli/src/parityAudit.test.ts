import { describe, expect, it } from 'vitest'
import { spawnSync, execSync } from 'child_process'

const BUN = (() => {
  try {
    const result = execSync('which bun 2>/dev/null || where bun 2>NUL', { encoding: 'utf-8' })
    const raw = result.split(/\r?\n/).filter(Boolean)[0].trim()
    if (process.platform === 'win32' && !raw.endsWith('.exe')) {
      const exePath = raw.replace(/[^/\\]+$/, 'node_modules/bun/bin/bun.exe')
      try { execSync(`"${exePath}" --version`, { stdio: 'ignore' }); return exePath } catch { /* fallthrough */ }
      return raw + '.cmd'
    }
    return raw
  } catch {
    return 'bun'
  }
})()

describe('packages parity audit', () => {
  it('has no uncovered legacy src capabilities in the packages migration matrix', () => {
    const result = spawnSync(BUN, ['scripts/audit-packages-parity.mjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Packages parity check passed.')
    expect(result.stderr).toBe('')
  })
})
