/**
 * 属性测试：Observer 守卫条件正确性
 *
 * **Validates: Requirements 4.2**
 *
 * 使用 fast-check 生成随机的 companion 存在/不存在和 muted 状态组合，
 * 验证仅在 companion 存在且未静音时才调用 AI（queryHaiku）和 onReaction 回调。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ---- mock 所有外部依赖 ----

// mock companion 模块：getCompanion 返回值由测试动态控制
const mockGetCompanion = vi.fn()
vi.mock('./companion.js', () => ({
  getCompanion: (...args: unknown[]) => mockGetCompanion(...args),
  roll: vi.fn(() => ({
    bones: {
      rarity: 'common',
      species: 'duck',
      eye: 'normal',
      hat: 'none',
      shiny: false,
      stats: { debugging: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 },
    },
  })),
  companionUserId: vi.fn(() => 'test-user'),
}))

// mock config 模块：getGlobalConfig 返回值由测试动态控制
const mockGetGlobalConfig = vi.fn()
vi.mock('../utils/config.js', () => ({
  getGlobalConfig: (...args: unknown[]) => mockGetGlobalConfig(...args),
}))

// mock queryHaiku：返回一个包含反应文字的 AssistantMessage
const mockQueryHaiku = vi.fn()
vi.mock('../services/api/claude.js', () => ({
  queryHaiku: (...args: unknown[]) => mockQueryHaiku(...args),
}))

// mock bootstrap/state
vi.mock('../bootstrap/state.js', () => ({
  getIsNonInteractiveSession: vi.fn(() => false),
}))

// mock extractTextContent：从 content 中提取文本
vi.mock('../utils/messages.js', () => ({
  extractTextContent: vi.fn((content: Array<{ type: string; text?: string }>) => {
    if (typeof content === 'string') return content
    return content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('')
  }),
}))

// mock asSystemPrompt
vi.mock('../utils/systemPromptType.js', () => ({
  asSystemPrompt: vi.fn((v: string[]) => v),
}))

// 在 mock 声明之后导入被测模块
const { fireCompanionObserver } = await import('./observer.js')

// 构造一个有效的 companion 对象（包含 soul + bones 字段）
const MOCK_COMPANION = {
  name: 'TestBuddy',
  personality: '一只好奇的小鸭子',
  hatchedAt: Date.now(),
  rarity: 'common' as const,
  species: 'duck',
  eye: 'normal',
  hat: 'none',
  shiny: false,
  stats: { debugging: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 },
}

// 构造一个包含用户消息的 mock 消息数组
const MOCK_MESSAGES = [
  {
    type: 'user' as const,
    uuid: 'msg-1',
    timestamp: Date.now(),
    message: {
      role: 'user' as const,
      content: '请帮我写一个排序函数',
    },
  },
  {
    type: 'assistant' as const,
    uuid: 'msg-2',
    timestamp: Date.now(),
    message: {
      id: 'resp-1',
      model: 'test-model',
      role: 'assistant' as const,
      content: [{ type: 'text', text: '好的，这是一个快速排序实现...' }],
    },
  },
]

describe('属性 3：Observer 守卫条件正确性', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认 queryHaiku 返回有效的反应文字
    mockQueryHaiku.mockResolvedValue({
      type: 'assistant',
      uuid: 'reaction-1',
      timestamp: Date.now(),
      message: {
        id: 'haiku-resp',
        model: 'haiku',
        role: 'assistant',
        content: [{ type: 'text', text: '🦆 有趣的代码！' }],
      },
    })
  })

  it('仅在 companion 存在且未静音时才调用 queryHaiku 和 onReaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的 companion 存在状态
        fc.boolean(),
        // 生成随机的 muted 状态
        fc.boolean(),
        async (companionExists: boolean, isMuted: boolean) => {
          // 重置 mock 调用记录
          vi.clearAllMocks()

          // 重新设置 queryHaiku 的返回值（clearAllMocks 会清除之前的设置）
          mockQueryHaiku.mockResolvedValue({
            type: 'assistant',
            uuid: 'reaction-1',
            timestamp: Date.now(),
            message: {
              id: 'haiku-resp',
              model: 'haiku',
              role: 'assistant',
              content: [{ type: 'text', text: '🦆 有趣的代码！' }],
            },
          })

          // 根据生成的状态配置 mock
          mockGetCompanion.mockReturnValue(companionExists ? MOCK_COMPANION : undefined)
          mockGetGlobalConfig.mockReturnValue({ companionMuted: isMuted })

          const onReaction = vi.fn()

          await fireCompanionObserver(MOCK_MESSAGES as any, onReaction)

          // 核心断言：仅当 companion 存在且未静音时才应调用 AI 和 onReaction
          const shouldCallAI = companionExists && !isMuted

          if (shouldCallAI) {
            // companion 存在且未静音 → 应调用 queryHaiku 和 onReaction
            expect(mockQueryHaiku).toHaveBeenCalledTimes(1)
            expect(onReaction).toHaveBeenCalledTimes(1)
          } else {
            // companion 不存在或已静音 → 不应调用 queryHaiku 和 onReaction
            expect(mockQueryHaiku).not.toHaveBeenCalled()
            expect(onReaction).not.toHaveBeenCalled()
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
