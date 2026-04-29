/**
 * 单元测试：/dream 手动记忆整合命令
 *
 * 测试覆盖：
 * - 注册验证：registerDreamSkill() 后 getBundledSkills() 包含 name='dream' — 需求 1.1
 * - 可用性判断：isAutoMemoryEnabled() 返回 false 时 isEnabled() 返回 false — 需求 1.2
 * - 静态配置：userInvocable=true，description 和 whenToUse 非空 — 需求 1.3, 1.4
 * - 提示词生成：getPromptForCommand 调用 buildConsolidationPrompt 并传入正确参数 — 需求 2.1
 * - 用户参数传递：args 包含在 extra 中 — 需求 2.2
 * - 无工具限制：不包含工具限制文本 — 需求 2.3
 * - 乐观记录：recordConsolidation() 在 buildConsolidationPrompt() 之前被调用 — 需求 3.1, 3.2
 * - 调用链：readLastConsolidatedAt() 返回值传递给 listSessionsTouchedSince() — 需求 4.1, 4.2
 * - 错误处理：各依赖失败时的降级行为 — 需求 6.1, 6.2, 6.3
 * - 边界条件：空会话列表和所有会话都是当前会话 — 需求 4.3, 4.4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BundledSkillDefinition } from '../bundledSkills.js'

// ---- mock 所有外部依赖 ----

// 捕获 registerBundledSkill 的调用参数，用于验证注册配置
let capturedDefinition: BundledSkillDefinition | null = null
vi.mock('../bundledSkills.js', () => ({
  registerBundledSkill: (def: BundledSkillDefinition) => {
    capturedDefinition = def
  },
}))

// mock bootstrap/state：提供 getSessionId 和 getOriginalCwd
vi.mock('../../bootstrap/state.js', () => ({
  getSessionId: vi.fn(() => 'current-session-id'),
  getOriginalCwd: vi.fn(() => '/mock/project/dir'),
}))

// mock memdir/paths：提供 isAutoMemoryEnabled 和 getAutoMemPath
const mockIsAutoMemoryEnabled = vi.fn(() => true)
vi.mock('../../memdir/paths.js', () => ({
  isAutoMemoryEnabled: (...args: unknown[]) => mockIsAutoMemoryEnabled(...args),
  getAutoMemPath: vi.fn(() => '/mock/memory/root'),
}))

// mock consolidationPrompt：提供 buildConsolidationPrompt
const mockBuildConsolidationPrompt = vi.fn(() => 'mock-consolidation-prompt')
vi.mock('../../services/autoDream/consolidationPrompt.js', () => ({
  buildConsolidationPrompt: (...args: unknown[]) => mockBuildConsolidationPrompt(...args),
}))

// mock consolidationLock：提供 recordConsolidation、readLastConsolidatedAt、listSessionsTouchedSince
const mockRecordConsolidation = vi.fn()
const mockReadLastConsolidatedAt = vi.fn(() => Promise.resolve(1000))
const mockListSessionsTouchedSince = vi.fn(() => Promise.resolve(['session-a', 'session-b']))
vi.mock('../../services/autoDream/consolidationLock.js', () => ({
  recordConsolidation: (...args: unknown[]) => mockRecordConsolidation(...args),
  readLastConsolidatedAt: (...args: unknown[]) => mockReadLastConsolidatedAt(...args),
  listSessionsTouchedSince: (...args: unknown[]) => mockListSessionsTouchedSince(...args),
}))

// mock sessionStorage：提供 getProjectDir
vi.mock('../../utils/sessionStorage.js', () => ({
  getProjectDir: vi.fn((cwd: string) => `/mock/projects/${cwd}`),
}))

// 在 mock 声明之后导入被测模块
const { registerDreamSkill } = await import('./dream.js')

// ============================================================
// 注册与静态配置测试 — 需求 1.1, 1.2, 1.3, 1.4
// ============================================================
describe('/dream 注册与静态配置', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDefinition = null
    // 重置默认 mock 返回值
    mockIsAutoMemoryEnabled.mockReturnValue(true)
    mockRecordConsolidation.mockResolvedValue(undefined)
    mockReadLastConsolidatedAt.mockResolvedValue(1000)
    mockListSessionsTouchedSince.mockResolvedValue(['session-a', 'session-b'])
  })

  it('registerDreamSkill() 调用 registerBundledSkill 注册 name="dream" 的命令', () => {
    registerDreamSkill()
    expect(capturedDefinition).not.toBeNull()
    expect(capturedDefinition!.name).toBe('dream')
  })

  it('isAutoMemoryEnabled() 返回 false 时 isEnabled() 返回 false', () => {
    mockIsAutoMemoryEnabled.mockReturnValue(false)
    registerDreamSkill()
    expect(capturedDefinition!.isEnabled!()).toBe(false)
  })

  it('isAutoMemoryEnabled() 返回 true 时 isEnabled() 返回 true', () => {
    mockIsAutoMemoryEnabled.mockReturnValue(true)
    registerDreamSkill()
    expect(capturedDefinition!.isEnabled!()).toBe(true)
  })

  it('userInvocable 为 true', () => {
    registerDreamSkill()
    expect(capturedDefinition!.userInvocable).toBe(true)
  })

  it('description 非空', () => {
    registerDreamSkill()
    expect(capturedDefinition!.description).toBeTruthy()
    expect(capturedDefinition!.description.length).toBeGreaterThan(0)
  })

  it('whenToUse 非空', () => {
    registerDreamSkill()
    expect(capturedDefinition!.whenToUse).toBeTruthy()
    expect(capturedDefinition!.whenToUse!.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 提示词生成测试 — 需求 2.1, 2.2, 2.3
// ============================================================
describe('/dream 提示词生成', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDefinition = null
    mockIsAutoMemoryEnabled.mockReturnValue(true)
    mockRecordConsolidation.mockResolvedValue(undefined)
    mockReadLastConsolidatedAt.mockResolvedValue(1000)
    mockListSessionsTouchedSince.mockResolvedValue(['session-a', 'session-b'])
    mockBuildConsolidationPrompt.mockReturnValue('mock-consolidation-prompt')
  })

  it('getPromptForCommand 调用 buildConsolidationPrompt 并传入正确的 memoryRoot 和 transcriptDir', async () => {
    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 buildConsolidationPrompt 被调用
    expect(mockBuildConsolidationPrompt).toHaveBeenCalledTimes(1)
    // 第一个参数是 memoryRoot（来自 getAutoMemPath）
    expect(mockBuildConsolidationPrompt.mock.calls[0]![0]).toBe('/mock/memory/root')
    // 第二个参数是 transcriptDir（来自 getProjectDir(getOriginalCwd())）
    expect(mockBuildConsolidationPrompt.mock.calls[0]![1]).toBe('/mock/projects//mock/project/dir')
  })

  it('用户参数传递：getPromptForCommand("重点整理调试记录") 将参数包含在 extra 中', async () => {
    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('重点整理调试记录', {} as any)

    // 验证 extra 参数（第三个参数）包含用户输入
    const extra = mockBuildConsolidationPrompt.mock.calls[0]![2] as string
    expect(extra).toContain('重点整理调试记录')
  })

  it('不包含工具限制文本', async () => {
    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 extra 参数不包含工具限制相关文本
    const extra = mockBuildConsolidationPrompt.mock.calls[0]![2] as string
    expect(extra).not.toContain('Tool constraints')
    expect(extra).not.toContain('tool_use')
  })

  it('返回 ContentBlockParam[] 格式', async () => {
    registerDreamSkill()
    const result = await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证返回值是数组，且包含 type='text' 的内容块
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('type', 'text')
    expect(result[0]).toHaveProperty('text', 'mock-consolidation-prompt')
  })
})

// ============================================================
// 调用顺序与调用链测试 — 需求 3.1, 3.2, 4.1, 4.2
// ============================================================
describe('/dream 调用顺序与调用链', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDefinition = null
    mockIsAutoMemoryEnabled.mockReturnValue(true)
    mockRecordConsolidation.mockResolvedValue(undefined)
    mockReadLastConsolidatedAt.mockResolvedValue(5000)
    mockListSessionsTouchedSince.mockResolvedValue(['session-a'])
    mockBuildConsolidationPrompt.mockReturnValue('mock-prompt')
  })

  it('recordConsolidation() 在 buildConsolidationPrompt() 之前被调用', async () => {
    // 使用调用顺序追踪来验证
    const callOrder: string[] = []
    mockRecordConsolidation.mockImplementation(async () => {
      callOrder.push('recordConsolidation')
    })
    mockBuildConsolidationPrompt.mockImplementation((..._args: unknown[]) => {
      callOrder.push('buildConsolidationPrompt')
      return 'mock-prompt'
    })

    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 recordConsolidation 在 buildConsolidationPrompt 之前被调用
    expect(callOrder.indexOf('recordConsolidation')).toBeLessThan(
      callOrder.indexOf('buildConsolidationPrompt'),
    )
  })

  it('readLastConsolidatedAt() 返回值传递给 listSessionsTouchedSince()', async () => {
    mockReadLastConsolidatedAt.mockResolvedValue(12345)

    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 listSessionsTouchedSince 被调用时传入了 readLastConsolidatedAt 的返回值
    expect(mockListSessionsTouchedSince).toHaveBeenCalledWith(12345)
  })
})

// ============================================================
// 错误处理测试 — 需求 6.1, 6.2, 6.3
// ============================================================
describe('/dream 错误处理', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDefinition = null
    mockIsAutoMemoryEnabled.mockReturnValue(true)
    mockRecordConsolidation.mockResolvedValue(undefined)
    mockReadLastConsolidatedAt.mockResolvedValue(1000)
    mockListSessionsTouchedSince.mockResolvedValue([])
    mockBuildConsolidationPrompt.mockReturnValue('mock-prompt')
  })

  it('readLastConsolidatedAt 失败时使用 0 作为默认值', async () => {
    // mock readLastConsolidatedAt 抛出异常
    mockReadLastConsolidatedAt.mockRejectedValue(new Error('读取失败'))

    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 listSessionsTouchedSince 被调用时传入 0（默认值）
    expect(mockListSessionsTouchedSince).toHaveBeenCalledWith(0)
    // 验证 buildConsolidationPrompt 仍然被调用（流程继续）
    expect(mockBuildConsolidationPrompt).toHaveBeenCalledTimes(1)
  })

  it('listSessionsTouchedSince 失败时跳过会话列表，仍返回有效提示词', async () => {
    // mock listSessionsTouchedSince 抛出异常
    mockListSessionsTouchedSince.mockRejectedValue(new Error('列出会话失败'))

    registerDreamSkill()
    const result = await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 buildConsolidationPrompt 仍然被调用
    expect(mockBuildConsolidationPrompt).toHaveBeenCalledTimes(1)
    // 验证返回有效结果
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })

  it('recordConsolidation 失败时不影响提示词生成', async () => {
    // mock recordConsolidation 抛出异常
    mockRecordConsolidation.mockRejectedValue(new Error('记录失败'))

    registerDreamSkill()
    const result = await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 buildConsolidationPrompt 仍然被调用
    expect(mockBuildConsolidationPrompt).toHaveBeenCalledTimes(1)
    // 验证返回有效结果
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 边界条件测试 — 需求 4.3, 4.4
// ============================================================
describe('/dream 边界条件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDefinition = null
    mockIsAutoMemoryEnabled.mockReturnValue(true)
    mockRecordConsolidation.mockResolvedValue(undefined)
    mockReadLastConsolidatedAt.mockResolvedValue(1000)
    mockBuildConsolidationPrompt.mockReturnValue('mock-prompt')
  })

  it('空会话列表时 extra 不包含会话信息', async () => {
    // mock 返回空会话列表
    mockListSessionsTouchedSince.mockResolvedValue([])

    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 extra 参数不包含 "Sessions since" 文本
    const extra = mockBuildConsolidationPrompt.mock.calls[0]![2] as string
    expect(extra).not.toContain('Sessions since')
  })

  it('所有会话都是当前会话时，过滤后为空，extra 不包含会话信息', async () => {
    // mock 返回的会话列表只包含当前会话 ID
    mockListSessionsTouchedSince.mockResolvedValue(['current-session-id'])

    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 extra 参数不包含 "Sessions since" 文本（当前会话被过滤掉后为空）
    const extra = mockBuildConsolidationPrompt.mock.calls[0]![2] as string
    expect(extra).not.toContain('Sessions since')
    expect(extra).not.toContain('current-session-id')
  })

  it('有其他会话时 extra 包含正确的会话数量和 ID', async () => {
    mockListSessionsTouchedSince.mockResolvedValue([
      'current-session-id',
      'session-x',
      'session-y',
    ])

    registerDreamSkill()
    await capturedDefinition!.getPromptForCommand('', {} as any)

    // 验证 extra 包含过滤后的会话信息（排除当前会话后剩余 2 个）
    const extra = mockBuildConsolidationPrompt.mock.calls[0]![2] as string
    expect(extra).toContain('2')
    expect(extra).toContain('session-x')
    expect(extra).toContain('session-y')
    // 验证当前会话 ID 不在 extra 中
    expect(extra).not.toContain('current-session-id')
  })
})
