import { getUILanguage } from '../utils/i18n/index.js'

// Past tense verbs for turn completion messages
// These verbs work naturally with "for [duration]" (e.g., "Worked for 5s")
const TURN_COMPLETION_VERBS_EN = [
  'Baked',
  'Brewed',
  'Churned',
  'Cogitated',
  'Cooked',
  'Crunched',
  'Sautéed',
  'Worked',
]

// Chinese playful past-tense style verbs
// Format: "XX了 {duration}" or just used with duration
const TURN_COMPLETION_VERBS_ZH = [
  '搞定了',
  '撸完了',
  '折腾了',
  '捣鼓了',
  '忙活了',
  '折腾完',
  '搞完啦',
  '搞定啦',
]

/**
 * Get turn completion verbs based on current UI language
 */
export function getTurnCompletionVerbs(): string[] {
  const lang = getUILanguage()
  if (lang === 'zh') {
    return TURN_COMPLETION_VERBS_ZH
  }
  return TURN_COMPLETION_VERBS_EN
}

// Keep original export for backward compatibility
export const TURN_COMPLETION_VERBS = TURN_COMPLETION_VERBS_EN
