// /dream 手动记忆整合命令
// 参考 remember.ts 的注册模式，作为 bundled skill 注册
// 与 autoDream.ts 的后台 fork 子代理模式不同，手动 /dream 在主循环中运行，
// 拥有完整的工具权限，不需要工具限制或锁机制。返回 ContentBlockParam[] 由主循环执行。

import { getOriginalCwd, getSessionId } from '../../bootstrap/state.js'
import { isAutoMemoryEnabled, getAutoMemPath } from '../../memdir/paths.js'
import { buildConsolidationPrompt } from '../../services/autoDream/consolidationPrompt.js'
import {
  listSessionsTouchedSince,
  readLastConsolidatedAt,
  recordConsolidation,
} from '../../services/autoDream/consolidationLock.js'
import { getProjectDir } from '../../utils/sessionStorage.js'
import { registerBundledSkill } from '../bundledSkills.js'

/**
 * 注册 /dream 手动记忆整合命令。
 * 使用 isAutoMemoryEnabled() 作为可用性判断条件。
 */
export function registerDreamSkill(): void {
  registerBundledSkill({
    name: 'dream',
    description:
      'Manually trigger memory consolidation — review recent sessions and organize your memory files.',
    whenToUse:
      'Use when you want to manually consolidate and organize memory files, especially after a series of sessions or when auto-dream hasn\'t run recently.',
    userInvocable: true,
    isEnabled: () => isAutoMemoryEnabled(),
    async getPromptForCommand(args) {
      // 乐观记录整合时间戳（fire-and-forget），失败时静默忽略
      try {
        await recordConsolidation()
      } catch {
        // recordConsolidation 内部已有 logForDebugging 错误日志，此处静默忽略
      }

      // 读取上次整合时间，失败时默认为 0（等同于"从未整合过"）
      let lastAt = 0
      try {
        lastAt = await readLastConsolidatedAt()
      } catch {
        // 使用默认值 0 继续执行
      }

      // 获取自上次整合以来被修改的会话列表，失败时默认空数组
      let sessions: string[] = []
      try {
        sessions = await listSessionsTouchedSince(lastAt)
      } catch {
        // 跳过会话列表，仅使用基础整合提示词
      }

      // 过滤掉当前会话 ID
      const currentSession = getSessionId()
      const otherSessions = sessions.filter(id => id !== currentSession)

      // 构建 extra 附加上下文字符串
      let extra = ''
      if (otherSessions.length > 0) {
        extra += `\nSessions since last consolidation (${otherSessions.length}):\n${otherSessions.map(id => `- ${id}`).join('\n')}`
      }

      // 如果用户提供了额外参数，追加到 extra
      if (args) {
        extra += `\n\nUser request: ${args}`
      }

      // 获取记忆目录和转录目录路径
      const memoryRoot = getAutoMemPath()
      const transcriptDir = getProjectDir(getOriginalCwd())

      // 构建整合提示词并返回 ContentBlockParam[]
      const prompt = buildConsolidationPrompt(memoryRoot, transcriptDir, extra)
      return [{ type: 'text' as const, text: prompt }]
    },
  })
}
