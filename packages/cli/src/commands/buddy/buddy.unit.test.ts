/**
 * 单元测试：属性卡片和命令路由
 *
 * 测试覆盖：
 * - renderStatBar 的边界值（1、50、100）— 需求 3.2
 * - mute/unmute/off 的 config 操作逻辑 — 需求 1.5, 1.6, 1.7
 * - 无 companion 时 pet/card/mute/unmute 的提示行为 — 需求 1.3, 1.4, 1.5, 1.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock 所有外部依赖，与 buddy.property.test.ts 保持一致的 mock 模式
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

// mock ink.js 的 Box 和 Text 组件
vi.mock('../../ink.js', () => ({
  Box: 'Box',
  Text: 'Text',
}))

// mock Spinner 组件
vi.mock('../../components/Spinner.js', () => ({
  Spinner: 'Spinner',
}))

// mock queryHaiku，AI 调用不在本测试范围内
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

// 在 mock 声明之后导入被测模块和 mock 模块
const { renderStatBar, call } = await import('./buddy.js')
const { getCompanion } = await import('../../buddy/companion.js')
const { saveGlobalConfig } = await import('../../utils/config.js')

/**
 * 构造最小化的 mock context，供 call 函数使用
 */
function createMockContext() {
  return {
    setAppState: vi.fn(),
    setMessages: vi.fn(),
    options: {
      dynamicMcpConfig: undefined,
      ideInstallationStatus: null,
      theme: 'dark' as const,
    },
    onChangeAPIKey: vi.fn(),
  } as any
}

// ============================================================
// renderStatBar 边界值测试 — 需求 3.2
// ============================================================
describe('renderStatBar 边界值测试', () => {
  it('renderStatBar(1, 20) → 0 个填充字符，20 个空白字符', () => {
    const bar = renderStatBar(1, 20)
    // Math.round(1/100*20) = Math.round(0.2) = 0
    const filledCount = (bar.match(/█/g) || []).length
    const emptyCount = (bar.match(/░/g) || []).length
    expect(filledCount).toBe(0)
    expect(emptyCount).toBe(20)
    expect(bar.length).toBe(20)
  })

  it('renderStatBar(50, 20) → 10 个填充字符，10 个空白字符', () => {
    const bar = renderStatBar(50, 20)
    // Math.round(50/100*20) = Math.round(10) = 10
    const filledCount = (bar.match(/█/g) || []).length
    const emptyCount = (bar.match(/░/g) || []).length
    expect(filledCount).toBe(10)
    expect(emptyCount).toBe(10)
    expect(bar.length).toBe(20)
  })

  it('renderStatBar(100, 20) → 20 个填充字符，0 个空白字符', () => {
    const bar = renderStatBar(100, 20)
    // Math.round(100/100*20) = Math.round(20) = 20
    const filledCount = (bar.match(/█/g) || []).length
    const emptyCount = (bar.match(/░/g) || []).length
    expect(filledCount).toBe(20)
    expect(emptyCount).toBe(0)
    expect(bar.length).toBe(20)
  })
})

// ============================================================
// mute/unmute/off 的 config 操作逻辑 — 需求 1.5, 1.6, 1.7
// ============================================================
describe('mute/unmute/off config 操作逻辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mute：有 companion 时调用 saveGlobalConfig 设置 companionMuted: true', async () => {
    // mock getCompanion 返回一个存在的 companion
    vi.mocked(getCompanion).mockReturnValue({
      name: 'TestBuddy',
      personality: '活泼好动',
      hatchedAt: Date.now(),
    } as any)

    const onDone = vi.fn()
    const context = createMockContext()

    await call(onDone, context, 'mute')

    // 验证：saveGlobalConfig 被调用
    expect(saveGlobalConfig).toHaveBeenCalledTimes(1)
    // 验证：传入的更新函数将 companionMuted 设为 true
    const updater = vi.mocked(saveGlobalConfig).mock.calls[0]![0] as Function
    const result = updater({ someExisting: 'value' })
    expect(result).toEqual({ someExisting: 'value', companionMuted: true })
    // 验证：onDone 被调用且包含静音提示
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('unmute：有 companion 时调用 saveGlobalConfig 设置 companionMuted: false', async () => {
    // mock getCompanion 返回一个存在的 companion
    vi.mocked(getCompanion).mockReturnValue({
      name: 'TestBuddy',
      personality: '活泼好动',
      hatchedAt: Date.now(),
    } as any)

    const onDone = vi.fn()
    const context = createMockContext()

    await call(onDone, context, 'unmute')

    // 验证：saveGlobalConfig 被调用
    expect(saveGlobalConfig).toHaveBeenCalledTimes(1)
    // 验证：传入的更新函数将 companionMuted 设为 false
    const updater = vi.mocked(saveGlobalConfig).mock.calls[0]![0] as Function
    const result = updater({ someExisting: 'value', companionMuted: true })
    expect(result).toEqual({ someExisting: 'value', companionMuted: false })
    // 验证：onDone 被调用且包含取消静音提示
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('off：调用 saveGlobalConfig 设置 companion: undefined', async () => {
    const onDone = vi.fn()
    const context = createMockContext()

    await call(onDone, context, 'off')

    // 验证：saveGlobalConfig 被调用
    expect(saveGlobalConfig).toHaveBeenCalledTimes(1)
    // 验证：传入的更新函数将 companion 设为 undefined
    const updater = vi.mocked(saveGlobalConfig).mock.calls[0]![0] as Function
    const result = updater({ companion: { name: 'Old' }, otherField: 123 })
    expect(result).toEqual({ companion: undefined, otherField: 123 })
    // 验证：onDone 被调用
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})


// ============================================================
// 无 companion 时 pet/card/mute/unmute 的提示行为 — 需求 1.3, 1.4, 1.5, 1.6
// ============================================================
describe('无 companion 时的提示行为', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // mock getCompanion 返回 null（无 companion）
    vi.mocked(getCompanion).mockReturnValue(null as any)
  })

  it('pet：无 companion 时通过 onDone 提示 "No companion"', async () => {
    const onDone = vi.fn()
    const context = createMockContext()

    const result = await call(onDone, context, 'pet')

    // 验证：onDone 被调用且包含 "No companion" 提示
    expect(onDone).toHaveBeenCalledTimes(1)
    const message = onDone.mock.calls[0]![0] as string
    expect(message).toContain('No companion')
    // 验证：返回 null，不渲染任何组件
    expect(result).toBeNull()
    // 验证：setAppState 未被调用（无副作用）
    expect(context.setAppState).not.toHaveBeenCalled()
  })

  it('card：无 companion 时通过 onDone 提示 "No companion"', async () => {
    const onDone = vi.fn()
    const context = createMockContext()

    const result = await call(onDone, context, 'card')

    // 验证：onDone 被调用且包含 "No companion" 提示
    expect(onDone).toHaveBeenCalledTimes(1)
    const message = onDone.mock.calls[0]![0] as string
    expect(message).toContain('No companion')
    // 验证：返回 null
    expect(result).toBeNull()
  })

  it('mute：无 companion 时通过 onDone 提示 "No companion"', async () => {
    const onDone = vi.fn()
    const context = createMockContext()

    const result = await call(onDone, context, 'mute')

    // 验证：onDone 被调用且包含 "No companion" 提示
    expect(onDone).toHaveBeenCalledTimes(1)
    const message = onDone.mock.calls[0]![0] as string
    expect(message).toContain('No companion')
    // 验证：返回 null
    expect(result).toBeNull()
    // 验证：saveGlobalConfig 未被调用（无副作用）
    expect(saveGlobalConfig).not.toHaveBeenCalled()
  })

  it('unmute：无 companion 时通过 onDone 提示 "No companion"', async () => {
    const onDone = vi.fn()
    const context = createMockContext()

    const result = await call(onDone, context, 'unmute')

    // 验证：onDone 被调用且包含 "No companion" 提示
    expect(onDone).toHaveBeenCalledTimes(1)
    const message = onDone.mock.calls[0]![0] as string
    expect(message).toContain('No companion')
    // 验证：返回 null
    expect(result).toBeNull()
    // 验证：saveGlobalConfig 未被调用（无副作用）
    expect(saveGlobalConfig).not.toHaveBeenCalled()
  })
})
