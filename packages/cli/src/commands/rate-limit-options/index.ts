import type { Command } from '../../commands.js'
import { isClaudeAISubscriber } from '../../utils/auth.js'
import { t } from '../../utils/i18n/index.js'

const rateLimitOptions = {
  type: 'local-jsx',
  name: 'rate-limit-options',
  get description() { return t('command.description.rate-limit-options') },
  isEnabled: () => {
    if (!isClaudeAISubscriber()) {
      return false
    }

    return true
  },
  isHidden: true, // Hidden from help - only used internally
  load: () => import('./rate-limit-options.js'),
} satisfies Command

export default rateLimitOptions
