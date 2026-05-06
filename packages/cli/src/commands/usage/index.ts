import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

export default {
  type: 'local-jsx',
  name: 'usage',
  get description() { return t('command.description.usage') },
  availability: ['claude-ai'],
  load: () => import('./usage.js'),
} satisfies Command
