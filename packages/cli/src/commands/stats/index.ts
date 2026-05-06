import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const stats = {
  type: 'local-jsx',
  name: 'stats',
  get description() { return t('command.description.stats') },
  load: () => import('./stats.js'),
} satisfies Command

export default stats
