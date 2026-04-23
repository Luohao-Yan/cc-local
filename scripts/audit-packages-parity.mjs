#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join, relative } from 'path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function walk(dir, predicate, results = []) {
  const absolute = join(root, dir)
  if (!existsSync(absolute)) return results
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue
      walk(child, predicate, results)
    } else if (predicate(child)) {
      results.push(child)
    }
  }
  return results
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function extractRegexMatches(text, regex, mapper = (match) => match[1]) {
  return uniqueSorted([...text.matchAll(regex)].map(mapper).filter(Boolean))
}

function extractNamedCollection(text, name) {
  const match = text.match(new RegExp(`const\\s+${name}\\s*=\\s*new\\s+(?:Set|Map)\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`))
  if (!match) return []
  return uniqueSorted(
    match[1]
      .split('\n')
      .map((line) => line.match(/^\s*(?:\[\s*)?['"`]([^'"`]+)['"`]/)?.[1])
      .filter(Boolean)
  )
}

function extractOldTopLevelCommands() {
  const main = read('src/main.tsx')
  return uniqueSorted([
    ...extractRegexMatches(main, /program\.command\(['"`]([^'"` ]+)/g),
    ...extractRegexMatches(main, /const\s+\w+\s*=\s*program\.command\(['"`]([^'"` ]+)/g),
  ].map((name) => name.split('|')[0]))
}

function extractNewTopLevelCommands() {
  const cli = read('packages/cli/src/index.ts')
  return uniqueSorted([
    ...extractRegexMatches(cli, /program\.command\(['"`]([^'"` ]+)/g),
    ...extractRegexMatches(cli, /const\s+\w+\s*=\s*program\.command\(['"`]([^'"` ]+)/g),
  ].map((name) => name.split('|')[0]))
}

function extractNewLegacyBridgeCommands() {
  return extractNamedCollection(read('packages/cli/src/index.ts'), 'LEGACY_TOP_LEVEL_COMMANDS')
}

function extractOldTopLevelOptions() {
  const main = read('src/main.tsx')
  return uniqueSorted([
    ...extractRegexMatches(main, /\.option\(['"`]([^'"`]+)['"`]/g),
    ...extractRegexMatches(main, /new Option\(['"`]([^'"`]+)['"`]/g),
  ].flatMap((flags) => flags.split(/[,\s]+/).filter((flag) => flag.startsWith('--')).map((flag) => flag.replace(/[<[].*$/, ''))))
}

function extractNewTopLevelOptions() {
  const cli = read('packages/cli/src/index.ts')
  return uniqueSorted([
    ...extractRegexMatches(cli, /\.option\(['"`]([^'"`]+)['"`]/g),
  ].flatMap((flags) => flags.split(/[,\s]+/).filter((flag) => flag.startsWith('--')).map((flag) => flag.replace(/[<[].*$/, ''))))
}

function extractNewLegacyBridgeOptions() {
  return extractNamedCollection(read('packages/cli/src/index.ts'), 'LEGACY_ONLY_OPTIONS')
}

function extractOldSlashCommands() {
  const commandFiles = walk('src/commands', (path) => /\.(ts|tsx)$/.test(path))
  const names = []
  for (const file of commandFiles) {
    const text = read(file)
    names.push(...extractRegexMatches(text, /name:\s*['"`]([^'"`]+)['"`]/g))
  }
  return uniqueSorted(names)
}

function extractNewReplCommands() {
  const replPath = 'packages/cli/src/repl/simpleRepl.ts'
  if (!existsSync(join(root, replPath))) return []
  const text = read(replPath)
  return uniqueSorted([
    ...extractNamedCollection(text, 'LEGACY_REPL_COMPAT_COMMANDS'),
    ...extractRegexMatches(text, /case\s+['"`]\/?([^'"`]+)['"`]\s*:/g),
    ...extractRegexMatches(text, /context\.printLine\(['"`]\/([^'"`\s]+)/g),
  ])
}

function extractOldTools() {
  const toolFiles = walk('src/tools', (path) => /\.(ts|tsx)$/.test(path))
  const names = []
  for (const file of toolFiles) {
    const text = read(file)
    names.push(...extractRegexMatches(text, /name:\s*['"`]([^'"`]+)['"`]/g))
    names.push(...extractRegexMatches(text, /textTool\(\s*['"`]([^'"`]+)['"`]/g))
  }
  return uniqueSorted(names)
}

function extractNewTools() {
  const toolFiles = walk('packages/core/src/tools', (path) => /\.(ts|tsx)$/.test(path))
  const names = []
  for (const file of toolFiles) {
    const text = read(file)
    names.push(...extractRegexMatches(text, /name:\s*['"`]([^'"`]+)['"`]/g))
    names.push(...extractRegexMatches(text, /textTool\(\s*['"`]([^'"`]+)['"`]/g))
  }
  return uniqueSorted(names)
}

function diff(oldItems, newItems) {
  const next = new Set(newItems)
  return oldItems.filter((item) => !next.has(item))
}

function renderList(items) {
  if (items.length === 0) return '- None'
  return items.map((item) => `- \`${item}\``).join('\n')
}

const IGNORED_STATIC_SLASH_MATCHES = new Set([
  '\n        placeholder=',
  ' placeholder=',
  'copy${fileExtension(block_0.lang)}',
  'Default',
  'Local',
  'node',
  'Old',
  'on_the_horizon',
  'python',
  'TestBuddy',
])

function withoutIgnoredSlashMatches(items) {
  return items.filter((item) => !IGNORED_STATIC_SLASH_MATCHES.has(item))
}

const oldTopLevelCommands = extractOldTopLevelCommands()
const newTopLevelCommands = extractNewTopLevelCommands()
const newLegacyBridgeCommands = extractNewLegacyBridgeCommands()
const oldTopLevelOptions = extractOldTopLevelOptions()
const newTopLevelOptions = extractNewTopLevelOptions()
const newLegacyBridgeOptions = extractNewLegacyBridgeOptions()
const oldSlashCommands = extractOldSlashCommands()
const newReplCommands = extractNewReplCommands()
const oldTools = extractOldTools()
const newTools = extractNewTools()

const coveredTopLevelCommands = uniqueSorted([...newTopLevelCommands, ...newLegacyBridgeCommands])
const coveredTopLevelOptions = uniqueSorted([...newTopLevelOptions, ...newLegacyBridgeOptions])
const bridgedTopLevelCommands = oldTopLevelCommands.filter((item) => newLegacyBridgeCommands.includes(item) && !newTopLevelCommands.includes(item))
const bridgedTopLevelOptions = oldTopLevelOptions.filter((item) => newLegacyBridgeOptions.includes(item))
const missingTopLevelCommands = diff(oldTopLevelCommands, coveredTopLevelCommands)
const missingTopLevelOptions = diff(oldTopLevelOptions, coveredTopLevelOptions)
const missingSlashCommands = withoutIgnoredSlashMatches(diff(oldSlashCommands, newReplCommands))
const ignoredSlashMatches = diff(oldSlashCommands, newReplCommands).filter((item) => IGNORED_STATIC_SLASH_MATCHES.has(item))
const missingTools = diff(oldTools, newTools)

const report = `# Packages Parity Audit

This report is generated by \`scripts/audit-packages-parity.mjs\`.

Goal: \`packages/*\` must maintain functional parity with the legacy \`src/*\` CLI now that it is the official entrypoint.

Compatibility note: \`packages/cli\` keeps an explicit \`--legacy\` escape hatch. Top-level commands/options marked as bridged are user-visible through the new CLI but still execute the legacy \`src/entrypoints/cli.tsx\` implementation.

## Summary

| Area | Legacy count | Native packages count | Legacy bridge count | Remaining native gap count |
|---|---:|---:|---:|---:|
| Top-level commands | ${oldTopLevelCommands.length} | ${newTopLevelCommands.length} | ${bridgedTopLevelCommands.length} | ${missingTopLevelCommands.length} |
| Top-level options | ${oldTopLevelOptions.length} | ${newTopLevelOptions.length} | ${bridgedTopLevelOptions.length} | ${missingTopLevelOptions.length} |
| Slash commands | ${oldSlashCommands.length} | ${newReplCommands.length} | 0 | ${missingSlashCommands.length} |
| Tools | ${oldTools.length} | ${newTools.length} | 0 | ${missingTools.length} |

## Bridged Top-Level Commands

${renderList(bridgedTopLevelCommands)}

## Remaining Top-Level Command Gaps

${renderList(missingTopLevelCommands)}

## Bridged Top-Level Options

${renderList(bridgedTopLevelOptions)}

## Remaining Top-Level Option Gaps

${renderList(missingTopLevelOptions)}

## Missing Slash Commands

${renderList(missingSlashCommands)}

## Ignored Static Slash Matches

These are parser noise from compiler output, examples, labels, or template strings rather than real slash-command registrations.

${renderList(ignoredSlashMatches)}

## Missing Tools

${renderList(missingTools)}

## Current Packages Top-Level Commands

${renderList(newTopLevelCommands)}

## Current Packages Top-Level Options

${renderList(newTopLevelOptions)}

## Current Packages REPL Commands

${renderList(newReplCommands)}

## Current Packages Tools

${renderList(newTools)}
`

writeFileSync(join(root, 'PACKAGES_PARITY_AUDIT.md'), report)
console.log(`Wrote ${relative(root, join(root, 'PACKAGES_PARITY_AUDIT.md'))}`)

if (process.argv.includes('--check')) {
  const failures = [
    ['top-level commands', missingTopLevelCommands],
    ['top-level options', missingTopLevelOptions],
    ['slash commands', missingSlashCommands],
    ['tools', missingTools],
  ].filter(([, items]) => items.length > 0)

  if (failures.length > 0) {
    for (const [label, items] of failures) {
      console.error(`Parity check failed for ${label}: ${items.join(', ')}`)
    }
    process.exit(1)
  }

  console.log('Packages parity check passed.')
}
