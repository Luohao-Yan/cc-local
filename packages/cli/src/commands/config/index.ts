import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const config = {
  aliases: ['settings'],
  type: 'local-jsx',
  name: 'config',
  get description() { return t('command.description.config') },
  load: () => import('./config.js'),
} satisfies Command

export default config
