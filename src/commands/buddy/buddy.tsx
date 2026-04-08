/**
 * /buddy 命令实现 — 1:1 复刻官方 Claude Code 的 buddy 功能
 *
 * 子命令：
 *   (无参数)        — 已有 companion 时显示属性卡片，否则启动孵化
 *   pet             — 触发爱心动画 + 生成反应
 *   off             — 静音 companion
 *   on              — 取消静音
 *   rehatch [种类]  — 重新孵化，可选指定物种（如 cat、dragon 等）
 */
import * as React from 'react'
import { useEffect, useState } from 'react'
import { getCompanion, roll, companionUserId } from '../../buddy/companion.js'
import { RARITY_COLORS, RARITY_STARS, STAT_NAMES, SPECIES } from '../../buddy/types.js'
import type { Companion, CompanionBones, Species } from '../../buddy/types.js'
import { renderSprite } from '../../buddy/sprites.js'
import { queryHaiku } from '../../services/api/claude.js'
import { saveGlobalConfig, getGlobalConfig } from '../../utils/config.js'
import { extractTextContent } from '../../utils/messages.js'
import { asSystemPrompt } from '../../utils/systemPromptType.js'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { getRainbowColor } from '../../utils/thinking.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

// ── 属性条组件（官方用 10 格宽度）──
function StatBar({ name, value }: { name: string; value: number }) {
  const filled = Math.round(value / 10)
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
  return (
    <Box>
      <Text>{name.padEnd(10)} </Text>
      <Text>{bar} </Text>
      <Text dimColor>{String(value).padStart(3)}</Text>
    </Box>
  )
}

// 导出供测试使用
export function renderStatBar(value: number, width: number): string {
  const filled = Math.round((value / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

// ── CompanionCard 组件（官方样式：带圆角边框的面板）──
function CompanionCard({
  companion,
  lastReaction,
  onDone,
}: {
  companion: Companion
  lastReaction?: string
  onDone?: LocalJSXCommandOnDone
}) {
  const color = RARITY_COLORS[companion.rarity]
  const sprite = renderSprite(companion)

  // 按任意键关闭卡片（和官方一样）
  const handleKeyDown = React.useCallback(() => {
    onDone?.(undefined, { display: 'skip' })
  }, [onDone])

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={2}
      paddingY={1}
      width={40}
      flexShrink={0}
      tabIndex={0}
      autoFocus={!!onDone}
      onKeyDown={handleKeyDown}
    >
      {/* 稀有度 + 物种 */}
      <Box justifyContent="space-between">
        <Text bold color={color}>
          {RARITY_STARS[companion.rarity]} {companion.rarity.toUpperCase()}
        </Text>
        <Text color={color}>{companion.species.toUpperCase()}</Text>
      </Box>

      {/* 闪光标记 */}
      {companion.shiny && (
        <Text color="warning" bold>
          ✨ SHINY ✨
        </Text>
      )}

      {/* ASCII 精灵 */}
      <Box flexDirection="column" marginY={1}>
        {sprite.map((line, i) => (
          <Text key={i} color={color}>
            {line}
          </Text>
        ))}
      </Box>

      {/* 名字 */}
      <Text bold>{companion.name}</Text>

      {/* 性格描述 */}
      <Box marginY={1}>
        <Text dimColor italic>
          "{companion.personality}"
        </Text>
      </Box>

      {/* 五维属性条 */}
      <Box flexDirection="column">
        {STAT_NAMES.map((stat) => (
          <StatBar key={stat} name={stat} value={companion.stats[stat]} />
        ))}
      </Box>

      {/* 最后反应 */}
      {lastReaction && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>last said</Text>
          <Box borderStyle="round" borderColor="inactive" paddingX={1}>
            <Text dimColor italic>
              {lastReaction}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ── 蛋孵化动画帧（官方 ASCII 动画）──
const EGG_BASE = [
  '    _____    ',
  '   /     \\   ',
  '  /       \\  ',
  ' |         | ',
  '  \\       /  ',
  '   \\_____/   ',
]

const HATCH_FRAMES: { offset: number; lines: string[] }[] = [
  { offset: 0, lines: EGG_BASE },
  { offset: 1, lines: EGG_BASE },
  { offset: -1, lines: EGG_BASE },
  { offset: 1, lines: EGG_BASE },
  {
    offset: 0,
    lines: [
      '    _____    ',
      '   /     \\   ',
      '  /       \\  ',
      ' |    .    | ',
      '  \\       /  ',
      '   \\_____/   ',
    ],
  },
  {
    offset: -1,
    lines: [
      '    _____    ',
      '   /     \\   ',
      '  /       \\  ',
      ' |    ∕    | ',
      '  \\       /  ',
      '   \\_____/   ',
    ],
  },
  {
    offset: 1,
    lines: [
      '    _____    ',
      '   /     \\   ',
      '  /   .   \\  ',
      ' |   ∕ \\   | ',
      '  \\       /  ',
      '   \\_____/   ',
    ],
  },
  {
    offset: 0,
    lines: [
      '    _____    ',
      '   /  .  \\   ',
      '  /  ∕ \\  \\  ',
      ' |  ∕   \\  | ',
      '  \\   .   /  ',
      '   \\_____/   ',
    ],
  },
  {
    offset: -1,
    lines: [
      '    _____    ',
      '   / ∕ \\ \\   ',
      '  / ∕   \\ \\  ',
      ' | ∕     \\ | ',
      '  \\   ∨   /  ',
      '   \\__∨__/   ',
    ],
  },
  {
    offset: 1,
    lines: [
      '    __ __    ',
      '   / V V \\   ',
      '  / ∕   \\ \\  ',
      ' | ∕     \\ | ',
      '  \\   ∨   /  ',
      '   \\__∨__/   ',
    ],
  },
  {
    offset: 0,
    lines: [
      '   ·  ✦  ·   ',
      '  ·       ·  ',
      ' ·    ✦    · ',
      '  ✦       ✦  ',
      ' ·    ·    · ',
      '   ·  ✦  ·   ',
    ],
  },
]

const TICK_MS = 160
const WOBBLE_FRAMES = 4
const TRANSITION_FRAMES = HATCH_FRAMES.length - WOBBLE_FRAMES
const MIN_WOBBLE_CYCLES = 3

// ── 孵化流程组件 ──
function HatchFlow({
  hatching,
  onDone,
}: {
  hatching: Promise<Companion>
  onDone: LocalJSXCommandOnDone
}) {
  const { columns } = useTerminalSize()
  const [tick, setTick] = useState(0)
  const [soul, setSoul] = useState<Companion | null>(null)
  const [crackStart, setCrackStart] = useState<number | null>(null)
  const [revealed, setRevealed] = useState<Companion | null>(null)

  useEffect(() => {
    const timer = setInterval(
      (s: React.Dispatch<React.SetStateAction<number>>) => s((t) => t + 1),
      TICK_MS,
      setTick,
    )
    hatching.then(setSoul)
    return () => clearInterval(timer)
  }, [hatching])

  // 蛋摇晃够了且 soul 已生成 → 开始裂开
  const wobbleEnd = MIN_WOBBLE_CYCLES * WOBBLE_FRAMES
  if (crackStart === null && soul !== null && tick >= wobbleEnd) {
    setCrackStart(tick)
  }

  // 计算当前帧
  let frameIndex: number
  if (crackStart === null) {
    frameIndex = tick % WOBBLE_FRAMES
  } else {
    const elapsed = tick - crackStart
    if (elapsed < TRANSITION_FRAMES) {
      frameIndex = WOBBLE_FRAMES + elapsed
    } else {
      // 最后一帧（星光），显示 companion
      frameIndex = HATCH_FRAMES.length - 1
      if (!revealed && soul) {
        setRevealed(soul)
      }
    }
  }

  // 孵化完成 → 显示 CompanionCard + 提示信息
  if (revealed) {
    return (
      <Box flexDirection="column">
        <CompanionCard companion={revealed} onDone={onDone} />
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>
            {revealed.name} is here · it'll chime in as you code
          </Text>
          <Text dimColor>your buddy won't count toward your usage</Text>
          <Text dimColor>
            say its name to get its take · /buddy pet · /buddy off
          </Text>
          <Box marginTop={1}>
            <Text dimColor>press any key</Text>
          </Box>
        </Box>
      </Box>
    )
  }

  // 渲染蛋动画
  const frame = HATCH_FRAMES[frameIndex]!
  const padL = ' '.repeat(1 + frame.offset)
  const padR = ' '.repeat(1 - frame.offset)
  const borderColor = getRainbowColor(tick)

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      width={columns}
      borderStyle="round"
      borderColor={borderColor}
      paddingY={1}
    >
      {frame.lines.map((line, i) => (
        <Text key={i}>
          {padL}
          {line}
          {padR}
        </Text>
      ))}
      <Box flexDirection="column" alignItems="center" marginTop={1}>
        <Text dimColor>hatching a coding buddy…</Text>
        <Text dimColor>
          it'll watch you work and occasionally have opinions
        </Text>
      </Box>
    </Box>
  )
}

// ── Soul 生成（AI 生成名字和性格）──
function buildHatchPrompt(bones: CompanionBones): string {
  const statsText = STAT_NAMES.map(
    (stat) => `${stat}: ${bones.stats[stat]}/100`,
  ).join(', ')
  return [
    'You are naming a tiny terminal companion creature.',
    `Species: ${bones.species}`,
    `Rarity: ${bones.rarity}`,
    `Stats: ${statsText}`,
    '',
    'Generate a short, fun name and a one-sentence personality description.',
    'Return JSON: { "name": "...", "personality": "..." }',
    'The name should be 1-2 words (max 14 chars). The personality should be ≤80 characters.',
    'Make it memorable and distinct.',
  ].join('\n')
}

const FALLBACK_NAMES = ['Crumpet', 'Soup', 'Pickle', 'Biscuit', 'Moth', 'Gravy']

async function generateSoul(
  bones: CompanionBones,
  signal: AbortSignal,
): Promise<{ name: string; personality: string }> {
  try {
    const result = await queryHaiku({
      systemPrompt: asSystemPrompt([buildHatchPrompt(bones)]),
      userPrompt:
        'Generate a name and personality for this companion. Return JSON only.',
      signal,
      options: {
        querySource: 'buddy_hatch',
        agents: [],
        isNonInteractiveSession: false,
        hasAppendSystemPrompt: false,
        mcpTools: [],
      },
    })
    const content = extractTextContent(result.message.content)
    const parsed = JSON.parse(content)
    if (parsed.name && parsed.personality) return parsed
    throw new Error('missing fields')
  } catch {
    // fallback：确定性生成
    const idx =
      bones.species.charCodeAt(0) + bones.eye.charCodeAt(0)
    return {
      name: FALLBACK_NAMES[idx % FALLBACK_NAMES.length]!,
      personality: `A ${bones.rarity} ${bones.species} of few words.`,
    }
  }
}

async function hatchCompanion(): Promise<Companion> {
  const { bones } = roll(companionUserId())
  const controller = new AbortController()
  const soul = await generateSoul(bones, controller.signal)
  const hatchedAt = Date.now()
  saveGlobalConfig((config) => ({
    ...config,
    companion: { ...soul, hatchedAt },
  }))
  return { ...bones, ...soul, hatchedAt }
}

// ── 主命令入口（1:1 复刻官方逻辑）──
export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> => {
  const config = getGlobalConfig()
  const subcommand = args?.trim()

  // /buddy off → 静音
  if (subcommand === 'off') {
    if (config.companionMuted !== true) {
      saveGlobalConfig((c) => ({ ...c, companionMuted: true }))
    }
    onDone('companion muted', { display: 'system' })
    return null
  }

  // /buddy on → 取消静音
  if (subcommand === 'on') {
    if (config.companionMuted === true) {
      saveGlobalConfig((c) => ({ ...c, companionMuted: false }))
    }
    onDone('companion unmuted', { display: 'system' })
    return null
  }

  // /buddy pet → 爱心动画
  if (subcommand === 'pet') {
    const companion = getCompanion()
    if (!companion) {
      onDone('no companion yet · run /buddy first', { display: 'system' })
      return null
    }
    if (config.companionMuted === true) {
      saveGlobalConfig((c) => ({ ...c, companionMuted: false }))
    }
    context.setAppState((prev) => ({
      ...prev,
      companionPetAt: Date.now(),
    }))
    onDone(`petted ${companion.name}`, { display: 'system' })
    return null
  }

  // /buddy rehatch [species] → 重新孵化，可选指定物种
  if (subcommand?.startsWith('rehatch')) {
    const speciesArg = subcommand.replace('rehatch', '').trim().toLowerCase()
    // 清除当前 companion，触发重新孵化
    if (speciesArg && !SPECIES.includes(speciesArg as Species)) {
      onDone(
        `unknown species "${speciesArg}" · available: ${SPECIES.join(', ')}`,
        { display: 'system' },
      )
      return null
    }
    // 清除旧 companion 数据
    saveGlobalConfig((c) => ({ ...c, companion: undefined }))
    // 重新孵化
    const hatching = (async () => {
      const { bones } = roll(companionUserId())
      const finalBones = speciesArg
        ? { ...bones, species: speciesArg as Species }
        : bones
      const controller = new AbortController()
      const soul = await generateSoul(finalBones, controller.signal)
      const hatchedAt = Date.now()
      const stored = speciesArg
        ? { ...soul, hatchedAt, speciesOverride: speciesArg as Species }
        : { ...soul, hatchedAt }
      saveGlobalConfig((cfg) => ({ ...cfg, companion: stored }))
      return { ...finalBones, ...soul, hatchedAt } as Companion
    })()
    return <HatchFlow hatching={hatching} onDone={onDone} />
  }

  // 取消静音（如果当前是静音状态）
  if (config.companionMuted === true) {
    saveGlobalConfig((c) => ({ ...c, companionMuted: false }))
  }

  // 已有 companion → 显示属性卡片
  const companion = getCompanion()
  if (companion) {
    return <CompanionCard companion={companion} onDone={onDone} />
  }

  // 首次 → 启动孵化
  const hatching = hatchCompanion()
  return <HatchFlow hatching={hatching} onDone={onDone} />
}

// 导出供属性测试使用
const KNOWN_SUBCOMMANDS = new Set(['pet', 'off', 'on', 'rehatch'])
export function isKnownSubcommand(cmd: string): boolean {
  // rehatch 可能带参数，如 "rehatch cat"
  const first = cmd.trim().toLowerCase().split(/\s+/)[0] ?? ''
  return KNOWN_SUBCOMMANDS.has(first)
}
