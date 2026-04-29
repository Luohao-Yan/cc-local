/**
 * 属性测试：未识别子命令一律返回帮助
 *
 * **Validates: Requirements 1.8**
 *
 * 使用 fast-check 生成不属于已知子命令集合 {pet, card, mute, unmute, off} 的随机字符串，
 * 验证 isKnownSubcommand 返回 false，且 call 函数通过 onDone 返回帮助信息而非执行副作用。
 */
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// mock 所有外部依赖，隔离被测模块的核心路由逻辑
vi.mock('../../buddy/companion.js', () => ({
  getCompanion: vi.fn(() => null),
  roll: vi.fn(() => ({ bones: {} })),
  companionUserId: vi.fn(() => 'test-user'),
}))

vi.mock('../../buddy/types.js', () => ({
  RARITY_STARS: {},
  STAT_NAMES: [],
}))

vi.mock('../../buddy/sprites.js', () => ({
  renderSprite: vi.fn(() => []),
}))

vi.mock('../../utils/config.js', () => ({
  saveGlobalConfig: vi.fn(),
}))

// mock ink.js 的 Box 和 Text 组件，避免测试环境中的导入链问题
vi.mock('../../ink.js', () => ({
  Box: 'Box',
  Text: 'Text',
}))

// mock Spinner 组件，避免深层导入链问题
vi.mock('../../components/Spinner.js', () => ({
  Spinner: 'Spinner',
}))

// mock queryHaiku，孵化流程的 AI 调用不在本测试范围内
vi.mock('../../services/api/claude.js', () => ({
  queryHaiku: vi.fn(),
}))

// mock extractTextContent 和 asSystemPrompt
vi.mock('../../utils/messages.js', () => ({
  extractTextContent: vi.fn(() => ''),
}))

vi.mock('../../utils/systemPromptType.js', () => ({
  asSystemPrompt: vi.fn((v: string[]) => v),
}))

// 在 mock 声明之后导入被测模块
const { isKnownSubcommand, call } = await import('./buddy.js')

// 已知子命令集合（含大小写变体，用于过滤生成器）
const KNOWN_SUBCOMMANDS = ['pet', 'card', 'mute', 'unmute', 'off']

/**
 * 生成不属于已知子命令的随机字符串
 * 过滤掉 trim().toLowerCase() 后匹配已知子命令的字符串，以及空字符串
 */
const unknownSubcommandArb = fc.string({ minLength: 1 }).filter(s => {
  const normalized = s.trim().toLowerCase()
  // 排除空字符串（trim 后为空）和已知子命令
  return normalized.length > 0 && !KNOWN_SUBCOMMANDS.includes(normalized)
})

describe('属性 1：未识别子命令一律返回帮助', () => {
  it('isKnownSubcommand 对任意非已知子命令字符串返回 false', () => {
    fc.assert(
      fc.property(unknownSubcommandArb, (cmd: string) => {
        // 验证：非已知子命令应返回 false
        expect(isKnownSubcommand(cmd)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('call 对任意未识别子命令调用 onDone 返回帮助信息', async () => {
    await fc.assert(
      fc.asyncProperty(unknownSubcommandArb, async (cmd: string) => {
        const onDone = vi.fn()
        // 构造最小化的 mock context
        const context = {
          setAppState: vi.fn(),
          setMessages: vi.fn(),
          options: {
            dynamicMcpConfig: undefined,
            ideInstallationStatus: null,
            theme: 'dark' as const,
          },
          onChangeAPIKey: vi.fn(),
        } as any

        const result = await call(onDone, context, cmd)

        // 验证：onDone 被调用且包含帮助信息
        expect(onDone).toHaveBeenCalledTimes(1)
        const firstArg = onDone.mock.calls[0]![0] as string
        expect(firstArg).toContain('Usage: /buddy')
        expect(firstArg).toContain('Subcommands:')

        // 验证：返回 null（非 JSX 组件），说明未执行副作用渲染
        expect(result).toBeNull()

        // 验证：setAppState 未被调用（无副作用）
        expect(context.setAppState).not.toHaveBeenCalled()
      }),
      { numRuns: 100 },
    )
  })
})

// 直接导入纯函数 renderStatBar，无需 mock
import { renderStatBar } from './buddy.js'

/**
 * 属性测试：属性条渲染与数值成正比
 *
 * **Validates: Requirements 3.2**
 *
 * 使用 fast-check 生成 1-100 的随机整数作为属性值，10-50 的随机整数作为总宽度，
 * 验证填充字符数 = Math.round(value / 100 * width)，且填充 + 空白 = width。
 */
describe('属性 2：属性条渲染与数值成正比', () => {
  // 生成 1-100 的随机整数（属性值范围）
  const valueArb = fc.integer({ min: 1, max: 100 })
  // 生成 10-50 的随机整数（合理的进度条宽度）
  const widthArb = fc.integer({ min: 10, max: 50 })

  it('填充字符数 = Math.round(value / 100 * width)', () => {
    fc.assert(
      fc.property(valueArb, widthArb, (value: number, width: number) => {
        const bar = renderStatBar(value, width)
        // 计算期望的填充字符数
        const expectedFilled = Math.round((value / 100) * width)
        // 统计实际的填充字符数（█）
        const actualFilled = (bar.match(/█/g) || []).length
        expect(actualFilled).toBe(expectedFilled)
      }),
      { numRuns: 100 },
    )
  })

  it('填充字符数 + 空白字符数 = 总宽度', () => {
    fc.assert(
      fc.property(valueArb, widthArb, (value: number, width: number) => {
        const bar = renderStatBar(value, width)
        // 统计填充字符数（█）和空白字符数（░）
        const filledCount = (bar.match(/█/g) || []).length
        const emptyCount = (bar.match(/░/g) || []).length
        // 验证：填充 + 空白 = 总宽度
        expect(filledCount + emptyCount).toBe(width)
        // 验证：进度条总长度等于总宽度
        expect(bar.length).toBe(width)
      }),
      { numRuns: 100 },
    )
  })
})
