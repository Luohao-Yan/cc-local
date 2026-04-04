/**
 * Companion 观察者模块
 *
 * 在每次 AI 回复结束后触发，让 companion 根据对话内容和自身性格
 * 生成一句简短的反应文字（≤60 字符），通过语音气泡展示。
 *
 * 采用 fire-and-forget 模式：失败时静默忽略，不影响主流程。
 */

import { getIsNonInteractiveSession } from '../bootstrap/state.js'
import { queryHaiku } from '../services/api/claude.js'
import type { Message } from '../types/message.js'
import { getGlobalConfig } from '../utils/config.js'
import { extractTextContent } from '../utils/messages.js'
import { asSystemPrompt } from '../utils/systemPromptType.js'
import { getCompanion, roll, companionUserId } from './companion.js'

/** 对话摘要最大字符数 */
const MAX_CONVERSATION_TEXT = 500

/**
 * 从消息数组中提取最近对话的文本摘要。
 * 只保留用户和助手消息的文本内容，截取末尾部分以聚焦最近上下文。
 */
function extractRecentText(messages: Message[]): string {
  const parts: string[] = []
  for (const msg of messages) {
    // 只处理用户和助手消息
    if (msg.type !== 'user' && msg.type !== 'assistant') continue
    const content = msg.message.content
    if (typeof content === 'string') {
      parts.push(content)
    } else if (Array.isArray(content)) {
      const text = extractTextContent(content)
      if (text) parts.push(text)
    }
  }
  const text = parts.join('\n')
  // 截取末尾部分，聚焦最近对话
  return text.length > MAX_CONVERSATION_TEXT
    ? text.slice(-MAX_CONVERSATION_TEXT)
    : text
}

/**
 * 构造 observer 的系统提示词。
 * 包含 companion 的性格描述和五维属性，引导 AI 生成符合角色的反应。
 */
function buildObserverPrompt(
  personality: string,
  stats: Record<string, number>,
): string {
  const statLines = Object.entries(stats)
    .map(([name, value]) => `${name}: ${value}/100`)
    .join(', ')

  return `You are a tiny terminal companion reacting to a coding conversation.

Personality: ${personality}
Stats: ${statLines}

Generate a SHORT reaction (max 60 characters) to the latest exchange.
The reaction should reflect your personality and stats.
Be playful, concise, and in-character. Use emoji sparingly.
Return ONLY the reaction text, nothing else.`
}

/**
 * Companion 观察者入口函数。
 *
 * 在每次 AI 回复结束后由 REPL 调用，检查 companion 是否存在且未静音，
 * 然后调用 queryHaiku 生成一句反应文字并通过 onReaction 回调传递。
 *
 * 整个函数用 try-catch 包裹，异常静默忽略，不影响主流程。
 */
export async function fireCompanionObserver(
  messages: Message[],
  onReaction: (reaction: string) => void,
): Promise<void> {
  try {
    // 检查 companion 是否存在
    const companion = getCompanion()
    if (!companion) return

    // 检查是否被静音
    if (getGlobalConfig().companionMuted === true) return

    // 提取最近对话消息的文本摘要
    const conversationText = extractRecentText(messages)
    if (!conversationText) return

    // 获取 companion 的属性数据
    const { bones } = roll(companionUserId())

    // 构造 prompt 并调用 queryHaiku 生成反应文字
    const controller = new AbortController()
    const result = await queryHaiku({
      systemPrompt: asSystemPrompt([
        buildObserverPrompt(companion.personality, bones.stats),
      ]),
      userPrompt: conversationText,
      signal: controller.signal,
      options: {
        querySource: 'buddy_observer',
        agents: [],
        isNonInteractiveSession: getIsNonInteractiveSession(),
        hasAppendSystemPrompt: false,
        mcpTools: [],
      },
    })

    // 提取反应文字
    const reaction = extractTextContent(result.message.content).trim()

    // 确保反应文字不超过 60 字符
    if (reaction) {
      onReaction(reaction.length > 60 ? reaction.slice(0, 60) : reaction)
    }
  } catch {
    // 静默忽略所有错误，不影响主流程
  }
}
