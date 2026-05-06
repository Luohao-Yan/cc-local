import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

export default {
  type: 'local-jsx',
  name: 'diff',
  get description() { return t('command.description.diff') },
  load: () => import('./diff.js'),
} satisfies Command
