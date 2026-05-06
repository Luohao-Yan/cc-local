import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const ide = {
  type: 'local-jsx',
  name: 'ide',
  get description() { return t('command.description.ide') },
  argumentHint: '[open]',
  load: () => import('./ide.js'),
} satisfies Command

export default ide
