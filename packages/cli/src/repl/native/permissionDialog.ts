/**
 * Enhanced permission dialog for native REPL
 *
 * Shows:
 *  - Tool name with color
 *  - Input preview (formatted for common tools)
 *  - Diff preview for file edits
 *  - "Don't ask again" option
 *
 * Replaces the simple y/N prompt in nativeRepl.ts
 */

import * as readline from 'readline'
import chalk from 'chalk'
import { renderDiff, renderCodeBlock } from './renderer.js'

export interface PermissionChoice {
  allowed: boolean
  /** If true, create a persistent rule for this tool+pattern */
  dontAskAgain: boolean
}

const TOOL_COLORS: Record<string, (s: string) => string> = {
  bash: chalk.yellow,
  file_write: chalk.magenta,
  file_edit: chalk.blue,
  file_read: chalk.dim,
  glob: chalk.cyan,
  grep: chalk.cyan,
  web_fetch: chalk.green,
  web_search: chalk.green,
}

/**
 * Show an enhanced permission dialog.
 *
 * Options:
 *  y — Allow this time
 *  d — Allow and don't ask again (creates persistent rule)
 *  n — Deny (default)
 */
export async function askPermissionEnhanced(
  rl: readline.Interface,
  toolName: string,
  input: unknown,
  reason?: string,
  diffPreview?: { oldText: string; newText: string; filename?: string },
): Promise<PermissionChoice> {
  const colorFn = TOOL_COLORS[toolName] ?? chalk.white

  console.log('')
  console.log(chalk.bold('┌─ Permission Required ─────────────────────'))

  // Tool name
  console.log(`│ ${colorFn.bold(toolName)}`)

  // Reason
  if (reason) {
    console.log(`│ ${chalk.dim(reason)}`)
  }

  // Input preview
  const inputStr = JSON.stringify(input, null, 2)
  if (inputStr.length > 300) {
    const preview = inputStr.slice(0, 297) + '...'
    console.log('│')
    for (const line of preview.split('\n').slice(0, 5)) {
      console.log(`│ ${chalk.dim(line)}`)
    }
  } else {
    console.log('│')
    for (const line of inputStr.split('\n')) {
      console.log(`│ ${chalk.dim(line)}`)
    }
  }

  // Diff preview for file edits
  if (diffPreview) {
    console.log('│')
    const diffStr = renderDiff(
      diffPreview.oldText,
      diffPreview.newText,
      diffPreview.filename,
      { maxLines: 20 },
    )
    for (const line of diffStr.split('\n')) {
      console.log(`│ ${line}`)
    }
  }

  console.log(chalk.bold('└──────────────────────────────────────────────'))
  console.log(
    `  ${chalk.green('[y]')} Allow  ` +
    `${chalk.blue('[d]')} Allow + don't ask again  ` +
    `${chalk.red('[n]')} Deny (default)`,
  )

  return new Promise((resolve) => {
    rl.question('  → ', (answer) => {
      const trimmed = answer.trim().toLowerCase()
      if (trimmed === 'y' || trimmed === 'yes') {
        resolve({ allowed: true, dontAskAgain: false })
      } else if (trimmed === 'd') {
        resolve({ allowed: true, dontAskAgain: true })
      } else {
        resolve({ allowed: false, dontAskAgain: false })
      }
    })
  })
}
