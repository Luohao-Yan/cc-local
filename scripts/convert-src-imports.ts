/**
 * Convert all `from 'src/...'` alias imports to relative paths in packages/cli/src/.
 *
 * The `src/*` tsconfig path alias maps to `./src/*` which resolves through
 * pointer files in `src/` to `packages/cli/src/`. Since the importing files
 * are already IN `packages/cli/src/`, the relative path is just a matter of
 * computing the path difference.
 *
 * Usage:
 *   bun run scripts/convert-src-imports.ts           # dry run (print changes)
 *   bun run scripts/convert-src-imports.ts --write    # write changes
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative, dirname, sep, posix } from 'path'

const ROOT = join(import.meta.dir, '..')
const CLI_SRC = join(ROOT, 'packages', 'cli', 'src')

const writeMode = process.argv.includes('--write')

// Collect all .ts/.tsx files recursively
function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(full, exts))
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}

// Compute relative import path from sourceFile to targetModule
// Both are absolute paths; targetModule ends with .js (import spec)
function computeRelativeImport(sourceFile: string, targetModule: string): string {
  // targetModule is like "src/utils/debug.js" — the "src/" prefix maps to CLI_SRC
  const targetRel = targetModule.replace(/^src\//, '')
  const targetAbs = join(CLI_SRC, targetRel)

  const sourceDir = dirname(sourceFile)
  let rel = relative(sourceDir, targetAbs).split(sep).join('/')

  // Ensure relative starts with ./
  if (!rel.startsWith('.')) {
    rel = './' + rel
  }

  return rel
}

// Pattern: from 'src/...' or from "src/..." (with optional type keyword)
const importPattern = /(\bfrom\s+['"])(src\/[^'"]+)(['"])/g
// Pattern: import('src/...') dynamic imports
const dynamicImportPattern = /(import\s*\(\s*['"])(src\/[^'"]+)(['"]\s*\))/g
// Pattern: require('src/...')
const requirePattern = /(require\s*\(\s*['"])(src\/[^'"]+)(['"]\s*\))/g

function convertFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8')
  let newContent = content
  let replacements = 0

  function replaceMatch(
    _match: string,
    prefix: string,
    importPath: string,
    suffix: string,
  ): string {
    const relPath = computeRelativeImport(filePath, importPath)
    replacements += 1
    return prefix + relPath + suffix
  }

  newContent = newContent.replace(importPattern, replaceMatch)
  newContent = newContent.replace(dynamicImportPattern, replaceMatch)
  newContent = newContent.replace(requirePattern, replaceMatch)

  const changed = newContent !== content

  if (changed && writeMode) {
    writeFileSync(filePath, newContent, 'utf-8')
  }

  if (changed && !writeMode) {
    // Print a sample of changes for dry run
    console.log(`  ${relative(ROOT, filePath)}: ${replacements} import(s)`)
  }

  return { changed, replacements }
}

// Main
const files = walkDir(CLI_SRC, ['.ts', '.tsx'])
let totalChanged = 0
let totalReplacements = 0

console.log(`Scanning ${files.length} files in packages/cli/src/...`)
console.log(writeMode ? 'WRITE MODE' : 'DRY RUN (use --write to apply changes)')
console.log()

for (const file of files) {
  const result = convertFile(file)
  if (result.changed) {
    totalChanged += 1
    totalReplacements += result.replacements
  }
}

console.log()
console.log(`Files changed: ${totalChanged}`)
console.log(`Import replacements: ${totalReplacements}`)

if (!writeMode && totalChanged > 0) {
  console.log()
  console.log('Run with --write to apply changes.')
}
