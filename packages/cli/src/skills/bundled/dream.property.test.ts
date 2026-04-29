/**
 * 属性测试：会话过滤与提示词包含
 *
 * **Validates: Requirements 4.3, 4.4**
 *
 * 使用 fast-check 生成随机会话 ID 列表（0-20 个 UUID）和随机当前会话 ID，
 * 验证 getPromptForCommand 中的会话过滤逻辑：
 * - 当前会话 ID 绝不应出现在传递给 buildConsolidationPrompt() 的 extra 参数中
 * - 过滤后有剩余会话时 extra 包含正确的会话数量和每个剩余会话的 ID
 * - 过滤后无剩余会话时 extra 不包含会话列表信息
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import type { BundledSkillDefinition } from '../bundledSkills.js'

// ---- mock 所有外部依赖 ----

// 捕获 registerBundledSkill 的调用参数，用于获取 getPromptForCommand
let capturedDefinition: BundledSkillDefinition | null = null
vi.mock('../bundledSkills.js', () => ({
  registerBundledSkill: (def: BundledSkillDefinition) => {
    capturedDefinition = def
  },
}))

// mock bootstrap/state：getSessionId 和 getOriginalCwd
// getSessionId 的返回值会在每次测试迭代中动态设置
const mockGetSessionId = vi.fn(() => 'default-session-id')
vi.mock('../../bootstrap/state.js', () => ({
  getSessionId: (...args: unknown[]) => mockGetSessionId(...args),
  getOriginalCwd: vi.fn(() => '/mock/cwd'),
}))

// mock memdir/paths：isAutoMemoryEnabled 和 getAutoMemPath
vi.mock('../../memdir/paths.js', () => ({
  isAutoMemoryEnabled: vi.fn(() => true),
  getAutoMemPath: vi.fn(() => '/mock/memory'),
}))

// 捕获 buildConsolidationPrompt 的 extra 参数，用于属性验证
let capturedExtra: string = ''
vi.mock('../../services/autoDream/consolidationPrompt.js', () => ({
  buildConsolidationPrompt: (_memRoot: string, _transcriptDir: string, extra: string) => {
    capturedExtra = extra
    return 'mock-prompt'
  },
}))

// mock consolidationLock：recordConsolidation、readLastConsolidatedAt、listSessionsTouchedSince
// listSessionsTouchedSince 的返回值会在每次测试迭代中动态设置
const mockListSessionsTouchedSince = vi.fn(() => Promise.resolve([] as string[]))
vi.mock('../../services/autoDream/consolidationLock.js', () => ({
  recordConsolidation: vi.fn(() => Promise.resolve()),
  readLastConsolidatedAt: vi.fn(() => Promise.resolve(0)),
  listSessionsTouchedSince: (...args: unknown[]) => mockListSessionsTouchedSince(...args),
}))

// mock sessionStorage：getProjectDir
vi.mock('../../utils/sessionStorage.js', () => ({
  getProjectDir: vi.fn(() => '/mock/projects'),
}))

// 在 mock 声明之后导入被测模块
const { registerDreamSkill } = await import('./dream.js')

// ---- 自定义生成器 ----

/**
 * 生成 UUID v4 格式的随机字符串
 * 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
const uuidArb = fc.uuid()

/**
 * 生成 0-20 个随机 UUID 组成的会话 ID 列表
 */
const sessionListArb = fc.array(uuidArb, { minLength: 0, maxLength: 20 })

/**
 * 生成随机当前会话 ID（UUID 格式）
 */
const currentSessionArb = uuidArb

describe('Feature: dream-command, Property 1: 会话过滤与提示词包含', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDefinition = null
    capturedExtra = ''
  })

  it('当前会话 ID 绝不出现在 extra 参数中，且过滤后会话数量和 ID 正确', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionListArb,
        currentSessionArb,
        async (sessionIds: string[], currentSessionId: string) => {
          // 重置状态
          capturedExtra = ''
          capturedDefinition = null

          // 设置当前会话 ID
          mockGetSessionId.mockReturnValue(currentSessionId)
          // 设置 listSessionsTouchedSince 返回的会话列表
          mockListSessionsTouchedSince.mockResolvedValue([...sessionIds])

          // 注册并调用 getPromptForCommand
          registerDreamSkill()
          await capturedDefinition!.getPromptForCommand('', {} as any)

          // 计算期望的过滤结果：排除当前会话 ID
          const expectedOtherSessions = sessionIds.filter(id => id !== currentSessionId)

          // 属性 1：当前会话 ID 绝不应出现在 extra 中
          expect(capturedExtra).not.toContain(`- ${currentSessionId}`)

          if (expectedOtherSessions.length > 0) {
            // 属性 2：过滤后有剩余会话时，extra 包含正确的会话数量
            expect(capturedExtra).toContain(`(${expectedOtherSessions.length})`)

            // 属性 3：过滤后有剩余会话时，extra 包含每个剩余会话的 ID
            for (const sessionId of expectedOtherSessions) {
              expect(capturedExtra).toContain(sessionId)
            }

            // 属性 4：extra 包含 "Sessions since" 标记文本
            expect(capturedExtra).toContain('Sessions since last consolidation')
          } else {
            // 属性 5：过滤后无剩余会话时，extra 不包含会话列表信息
            expect(capturedExtra).not.toContain('Sessions since last consolidation')
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
