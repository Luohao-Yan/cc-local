/**
 * 单元测试：Observer 错误处理
 *
 * 验证需求 4.4 和 4.5：
 * - 4.4: AI 成功返回反应文字时，调用 onReaction 回调传递反应文字
 * - 4.5: AI 调用失败时，静默忽略错误，不影响主流程
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- mock 所有外部依赖（与 observer.property.test.ts 保持一致） ----

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

// mock queryHaiku：返回值由测试动态控制
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

// 构造一个有效的 companion 对象
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

// 构造包含用户和助手消息的 mock 消息数组
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

describe('Observer 错误处理', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认设置：companion 存在且未静音
    mockGetCompanion.mockReturnValue(MOCK_COMPANION)
    mockGetGlobalConfig.mockReturnValue({ companionMuted: false })
  })

  /**
   * 需求 4.5: queryHaiku 抛出异常时，不调用 onReaction 且不抛出错误
   *
   * fireCompanionObserver 内部 try-catch 应捕获所有异常，
   * 确保主流程不受影响。
   */
  it('queryHaiku 抛出异常时不调用 onReaction 且不抛出错误', async () => {
    // 模拟 queryHaiku 抛出网络错误
    mockQueryHaiku.mockRejectedValue(new Error('网络请求失败'))

    const onReaction = vi.fn()

    // fireCompanionObserver 不应抛出错误
    await expect(
      fireCompanionObserver(MOCK_MESSAGES as any, onReaction),
    ).resolves.toBeUndefined()

    // onReaction 不应被调用
    expect(onReaction).not.toHaveBeenCalled()
  })

  /**
   * 需求 4.4: 正常情况下 onReaction 被调用且传入反应文字
   *
   * companion 存在且未静音时，queryHaiku 成功返回后，
   * 应调用 onReaction 并传入提取到的反应文字。
   */
  it('正常情况下 onReaction 被调用且传入反应文字', async () => {
    const reactionText = '🦆 代码看起来不错！'

    // 模拟 queryHaiku 返回有效的反应文字
    mockQueryHaiku.mockResolvedValue({
      type: 'assistant',
      uuid: 'reaction-1',
      timestamp: Date.now(),
      message: {
        id: 'haiku-resp',
        model: 'haiku',
        role: 'assistant',
        content: [{ type: 'text', text: reactionText }],
      },
    })

    const onReaction = vi.fn()

    await fireCompanionObserver(MOCK_MESSAGES as any, onReaction)

    // onReaction 应被调用一次，且传入反应文字
    expect(onReaction).toHaveBeenCalledTimes(1)
    expect(onReaction).toHaveBeenCalledWith(reactionText)
  })
})
