/**
 * Tab completion for native REPL
 *
 * Completes:
 *  - Slash commands (after /)
 *  - File paths (after space, if starts with ./  ../  /  ~ or common path chars)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { CommandRegistry } from '@cclocal/core'

/**
 * Create a readline completer function.
 *
 * @param commandRegistry — source of command names
 * @param cwd — current working directory for path completion
 */
export function createCompleter(
  commandRegistry: CommandRegistry,
  cwd?: string,
): (line: string) => [string[], string] {
  return (line: string): [string[], string] => {
    // Slash command completion
    if (line.startsWith('/')) {
      const partial = line.slice(1).toLowerCase()
      const all = commandRegistry.getAll()
      const hits = all
        .filter((c) => c.name.startsWith(partial))
        .map((c) => `/${c.name}`)
      return [hits, line]
    }

    // Path completion (only for last token)
    const lastSpace = line.lastIndexOf(' ')
    const lastToken = lastSpace >= 0 ? line.slice(lastSpace + 1) : ''
    const prefix = lastSpace >= 0 ? line.slice(0, lastSpace + 1) : ''

    if (lastToken && looksLikePath(lastToken)) {
      const hits = completePath(lastToken, cwd ?? process.cwd())
      const completions = hits.map((h) => prefix + h)
      return [completions, line]
    }

    return [[], line]
  }
}

/** Check if a token looks like it could be a file path */
function looksLikePath(token: string): boolean {
  if (token.startsWith('./')) return true
  if (token.startsWith('../')) return true
  if (token.startsWith('/')) return true
  if (token.startsWith('~')) return true
  if (token.length >= 2 && /^[A-Za-z]:/.test(token)) return true // Windows
  if (token.includes(path.sep)) return true
  return false
}

/** Expand ~ to home directory */
function expandHome(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1))
  }
  return p
}

/** Complete a path prefix against the filesystem */
function completePath(partial: string, cwd: string): string[] {
  const expanded = expandHome(partial)
  const resolved = path.isAbsolute(expanded) ? expanded : path.resolve(cwd, expanded)

  let dir: string
  let prefix: string

  // If partial ends with / or \, complete directory contents
  if (expanded.endsWith('/') || expanded.endsWith(path.sep)) {
    dir = resolved
    prefix = partial
  } else {
    dir = path.dirname(resolved)
    prefix = partial.slice(0, Math.max(partial.lastIndexOf('/'), partial.lastIndexOf(path.sep)) + 1)
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const baseName = path.basename(resolved).toLowerCase()
    const hits: string[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.') && !baseName.startsWith('.')) continue
      if (baseName && !entry.name.toLowerCase().startsWith(baseName)) continue

      const suffix = entry.isDirectory() ? '/' : ''
      // Preserve the original prefix style
      const completion = prefix + entry.name + suffix
      hits.push(completion)
    }

    return hits
  } catch {
    return []
  }
}
