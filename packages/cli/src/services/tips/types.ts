import type { ThemeName } from '../../utils/theme.js'

export interface Tip {
  id: string
  content: (context?: TipContext) => Promise<string>
  cooldownSessions: number
  isRelevant: (context?: TipContext) => Promise<boolean>
  title?: string
  description?: string
  dismissible?: boolean
  priority?: number
}

export interface TipContext {
  tips: Tip[]
  dismissedTips: Set<string>
  dismissTip: (id: string) => void
  bashTools?: Set<string>
  readFileState?: Record<string, unknown>
  theme?: ThemeName
  [key: string]: unknown
}
