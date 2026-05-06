import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const help = {
  type: 'local-jsx',
  name: 'help',
  get description() { return t('command.description.help') },
  load: () => import('./help.js'),
} satisfies Command

export default help
