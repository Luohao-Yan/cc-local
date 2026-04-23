import { describe, expect, it } from 'vitest'
import { spawnSync } from 'child_process'

describe('packages parity audit', () => {
  it('has no uncovered legacy src capabilities in the packages migration matrix', () => {
    const result = spawnSync('bun', ['scripts/audit-packages-parity.mjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Packages parity check passed.')
    expect(result.stderr).toBe('')
  })
})
