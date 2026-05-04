/**
 * Native Completions
 *
 * 提供 Native REST 命令和斜杠命令的自动补全
 */

/**
 * Native REST 命令
 */
export const NATIVE_REST_COMMANDS = [
  'mcp',
  'models',
  'sessions',
  'doctor',
  'context',
  'config',
  'tools',
  'metrics',
  'health',
  'version',
] as const

/**
 * Native REST 子命令
 */
export const NATIVE_REST_SUBCOMMANDS: Record<string, string[]> = {
  mcp: ['list', 'connect', 'disconnect', 'add', 'remove', 'status'],
  models: ['list', 'get', 'default'],
  sessions: ['list', 'create', 'delete', 'get', 'fork', 'resume'],
  doctor: ['run', 'full'],
  context: ['get', 'set', 'clear', 'add', 'remove'],
  config: ['get', 'set', 'list', 'reset'],
  tools: ['list', 'get', 'enable', 'disable'],
  metrics: ['tokens', 'requests', 'tasks'],
}

/**
 * 斜杠命令
 */
export const NATIVE_SLASH_COMMANDS = [
  '/help',
  '/?',
  '/clear',
  '/model',
  '/cwd',
  '/rename',
  '/resume',
  '/branch',
  '/fork',
  '/exit',
  '/quit',
  '/compact',
  '/token',
  '/budget',
  '/task',
  '/agent',
  '/ssh',
  '/ide',
] as const

/**
 * 补全结果
 */
export interface CompletionResult {
  /** 补全候选项 */
  completions: string[]
  /** 是否有更多候选项 */
  hasMore: boolean
  /** 补全类型 */
  type: 'command' | 'subcommand' | 'path' | 'model' | 'session' | 'tool' | 'none'
  /** 原始输入 */
  input: string
  /** 替换起始位置 */
  replaceFrom: number
  /** 替换结束位置 */
  replaceTo: number
}

/**
 * 获取 Native 命令补全
 */
export function getNativeCommandCompletions(input: string): CompletionResult {
  const trimmed = input.trimStart()

  // 空输入
  if (!trimmed) {
    return {
      completions: [...NATIVE_REST_COMMANDS, ...NATIVE_SLASH_COMMANDS],
      hasMore: false,
      type: 'command',
      input,
      replaceFrom: input.length - trimmed.length,
      replaceTo: input.length,
    }
  }

  // 斜杠命令补全
  if (trimmed.startsWith('/')) {
    return getSlashCommandCompletions(trimmed, input)
  }

  // REST 命令补全
  const parts = trimmed.split(/\s+/)
  const command = parts[0]?.toLowerCase() || ''
  const subcommands = NATIVE_REST_SUBCOMMANDS[command]

  if (subcommands && parts.length > 1) {
    // 子命令补全
    const currentSub = parts[parts.length - 1]?.toLowerCase() || ''
    const matches = subcommands.filter(s => s.startsWith(currentSub))

    return {
      completions: matches,
      hasMore: false,
      type: 'subcommand',
      input,
      replaceFrom: input.lastIndexOf(currentSub),
      replaceTo: input.length,
    }
  }

  // 命令补全
  const commandMatches = NATIVE_REST_COMMANDS.filter(c => c.startsWith(command))

  if (commandMatches.length > 0) {
    return {
      completions: commandMatches,
      hasMore: false,
      type: 'command',
      input,
      replaceFrom: input.length - trimmed.length,
      replaceTo: input.length,
    }
  }

  return {
    completions: [],
    hasMore: false,
    type: 'none',
    input,
    replaceFrom: 0,
    replaceTo: 0,
  }
}

/**
 * 获取斜杠命令补全
 */
function getSlashCommandCompletions(trimmed: string, input: string): CompletionResult {
  const slashPart = trimmed.split(/\s+/)[0] || ''
  const matches = NATIVE_SLASH_COMMANDS.filter(cmd => cmd.startsWith(slashPart))

  return {
    completions: matches,
    hasMore: false,
    type: 'command',
    input,
    replaceFrom: input.length - trimmed.length,
    replaceTo: input.length,
  }
}

/**
 * 模型名称列表（示例）
 */
const MODEL_NAMES = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-haiku-4-5-20251001',
  'default',
]

/**
 * 获取模型补全
 */
export function getModelCompletions(input: string): CompletionResult {
  const trimmed = input.trimStart().toLowerCase()
  const matches = MODEL_NAMES.filter(m => m.startsWith(trimmed))

  return {
    completions: matches,
    hasMore: false,
    type: 'model',
    input,
    replaceFrom: input.length - trimmed.length,
    replaceTo: input.length,
  }
}

/**
 * 合并补全结果
 */
export function mergeCompletions(
  nativeResult: CompletionResult,
  fileResult?: CompletionResult
): CompletionResult {
  if (!fileResult || fileResult.completions.length === 0) {
    return nativeResult
  }

  return {
    completions: [...nativeResult.completions, ...fileResult.completions],
    hasMore: nativeResult.hasMore || fileResult.hasMore,
    type: nativeResult.type,
    input: nativeResult.input,
    replaceFrom: nativeResult.replaceFrom,
    replaceTo: nativeResult.replaceTo,
  }
}

/**
 * 格式化补全显示
 */
export function formatCompletions(completions: string[], maxShow: number = 10): string {
  if (completions.length === 0) return ''

  const shown = completions.slice(0, maxShow)
  const remaining = completions.length - maxShow

  let result = shown.join('  ')
  if (remaining > 0) {
    result += `  ... and ${remaining} more`
  }

  return result
}
