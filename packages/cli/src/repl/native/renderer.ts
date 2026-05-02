/**
 * Terminal rich-text renderer for native REPL
 *
 * Renders markdown, syntax-highlighted code blocks, and unified diffs
 * using chalk, marked, cli-highlight, and diff — all already in package.json.
 */

import chalk from 'chalk'
import { marked } from 'marked'
import { highlight } from 'cli-highlight'
import * as Diff from 'diff'

// ─── Markdown → ANSI ────────────────────────────────────────────────

/** Custom marked renderer that outputs ANSI-colored text */
class AnsiRenderer extends marked.Renderer {
  override heading(text: string, depth: number): string {
    const styles = [chalk.bold.cyan, chalk.bold.blue, chalk.bold.magenta] as const
    const style = styles[Math.min(depth - 1, styles.length - 1)]
    return `\n${style(text)}\n`
  }

  override paragraph(text: string): string {
    return `${text}\n\n`
  }

  override code(code: string, lang: string | undefined): string {
    const highlighted = renderCodeBlock(code, lang)
    return `\n${highlighted}\n`
  }

  override codespan(code: string): string {
    return chalk.bgGray.black(` ${code} `)
  }

  override strong(text: string): string {
    return chalk.bold(text)
  }

  override em(text: string): string {
    return chalk.italic(text)
  }

  override link(href: string, title: string | undefined, text: string): string {
    const titlePart = title ? ` "${title}"` : ''
    return chalk.blue.underline(text) + chalk.dim(` (${href}${titlePart})`)
  }

  override list(body: string, ordered: boolean): string {
    return body
  }

  override listitem(text: string): string {
    return `  ${chalk.dim('•')} ${text}\n`
  }

  override blockquote(quote: string): string {
    const lines = quote.split('\n').filter(Boolean)
    return lines.map(l => chalk.dim('│ ') + chalk.dim(l)).join('\n') + '\n'
  }

  override hr(): string {
    return chalk.dim('─'.repeat(60)) + '\n'
  }

  override table(header: string, body: string): string {
    return `${header}${body}`
  }

  override tablerow(content: string): string {
    return `${content}\n`
  }

  override tablecell(
    content: string,
    flags: { header: boolean; align: 'center' | 'left' | 'right' | null },
  ): string {
    if (flags.header) return chalk.bold(content.padEnd(20))
    return content.padEnd(20)
  }
}

const ansiRenderer = new AnsiRenderer()

/** Render markdown string to ANSI-colored terminal output */
export function renderMarkdown(md: string): string {
  try {
    const tokens = marked.lexer(md, { gfm: true })
    const parts = tokens.map(token => {
      const raw = token.raw
      // Use our custom renderer for the full token
      return marked.parse(raw, { renderer: ansiRenderer, async: false }) as string
    })
    return parts.join('')
  } catch {
    // Fallback: return raw text if markdown parsing fails
    return md
  }
}

// ─── Code block highlighting ─────────────────────────────────────────

const LANG_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
}

/** Render a code block with syntax highlighting and border */
export function renderCodeBlock(code: string, lang?: string): string {
  const resolvedLang = lang ? (LANG_ALIASES[lang] ?? lang) : undefined
  const width = Math.min(process.stdout.columns || 80, 120)
  const border = chalk.dim('─'.repeat(width - 4))

  let highlighted: string
  try {
    highlighted = resolvedLang
      ? highlight(code.trim(), { language: resolvedLang, ignoreIllegals: true })
      : code.trim()
  } catch {
    highlighted = code.trim()
  }

  const header = resolvedLang ? chalk.dim(` ${resolvedLang} `) : ''
  const parts = [
    `  ${border}`,
    header ? `  ${header}` : '',
    ...highlighted.split('\n').map(l => `  ${l}`),
    `  ${border}`,
  ]
  return parts.filter(Boolean).join('\n')
}

// ─── Diff rendering ─────────────────────────────────────────────────

export interface DiffOptions {
  /** Number of context lines (default 3) */
  contextLines?: number
  /** Max lines to show (default 100) */
  maxLines?: number
}

/** Render a unified diff between two strings */
export function renderDiff(
  oldStr: string,
  newStr: string,
  filename?: string,
  options: DiffOptions = {},
): string {
  const { contextLines = 3, maxLines = 100 } = options
  const hunks = Diff.structuredPatch(
    filename ?? 'a/file',
    filename ?? 'b/file',
    oldStr,
    newStr,
    '',
    '',
    { context: contextLines },
  )

  if (hunks.hunks.length === 0) {
    return chalk.dim('No changes')
  }

  const lines: string[] = []

  // Header
  lines.push(chalk.dim(`diff --git a/${filename ?? 'file'} b/${filename ?? 'file'}`))
  lines.push(chalk.dim(`--- a/${filename ?? 'file'}`))
  lines.push(chalk.dim(`+++ b/${filename ?? 'file'}`))

  for (const hunk of hunks.hunks) {
    lines.push(chalk.cyan(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`))

    for (const line of hunk.lines) {
      if (line.startsWith('+')) {
        lines.push(chalk.green(line))
      } else if (line.startsWith('-')) {
        lines.push(chalk.red(line))
      } else {
        lines.push(chalk.dim(line))
      }
    }
  }

  const result = lines.join('\n')

  // Truncate if too long
  const allLines = result.split('\n')
  if (allLines.length > maxLines) {
    const shown = allLines.slice(0, maxLines)
    const omitted = allLines.length - maxLines
    shown.push(chalk.dim(`... (${omitted} more lines)`))
    return shown.join('\n')
  }

  return result
}

/** Render a small inline diff for edit operations */
export function renderInlineDiff(oldStr: string, newStr: string): string {
  const changes = Diff.diffWords(oldStr, newStr)
  return changes
    .map(part => {
      if (part.added) return chalk.green.bgGreen.bold(part.value)
      if (part.removed) return chalk.red.bgRed.bold(part.value)
      return part.value
    })
    .join('')
}

// ─── Status line rendering ───────────────────────────────────────────

export interface StatusLineInfo {
  model: string
  mode: string
  tokensUsed?: number
  tokensLimit?: number
  costUsd?: number
  cwd?: string
}

/** Render a bottom status line */
export function renderStatusLine(info: StatusLineInfo): string {
  const parts: string[] = []

  parts.push(chalk.bold('CCLocal'))
  parts.push(chalk.dim('│'))
  parts.push(chalk.cyan(info.model))

  if (info.mode !== 'default') {
    parts.push(chalk.dim('│'))
    const modeColor = info.mode === 'auto' ? chalk.green : info.mode === 'plan' ? chalk.yellow : chalk.white
    parts.push(modeColor.bold(info.mode.toUpperCase()))
  }

  if (info.tokensUsed != null && info.tokensLimit != null) {
    parts.push(chalk.dim('│'))
    const pct = info.tokensUsed / info.tokensLimit
    const tokenColor = pct > 0.9 ? chalk.red : pct > 0.7 ? chalk.yellow : chalk.dim
    parts.push(tokenColor(`${Math.round(pct * 100)}% ctx`))
  }

  if (info.costUsd != null) {
    parts.push(chalk.dim('│'))
    parts.push(chalk.dim(`$${info.costUsd.toFixed(4)}`))
  }

  if (info.cwd) {
    parts.push(chalk.dim('│'))
    parts.push(chalk.dim(info.cwd))
  }

  return parts.join(' ')
}

// ─── Spinner ────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function spinnerFrame(tick: number): string {
  return chalk.cyan(SPINNER_FRAMES[tick % SPINNER_FRAMES.length])
}

// ─── Prompt prefix ──────────────────────────────────────────────────

/** Render the user prompt prefix with mode indicator */
export function renderPrompt(mode: string): string {
  const modeTag = mode === 'auto' ? chalk.green('⚡') : mode === 'plan' ? chalk.yellow('📋') : '>'
  return `${chalk.bold.cyan('You')} ${modeTag} `
}
