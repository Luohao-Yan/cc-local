import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const theme = {
  type: 'local-jsx',
  name: 'theme',
  get description() { return t('command.description.theme') },
  load: () => import('./theme.js'),
} satisfies Command

export default theme
