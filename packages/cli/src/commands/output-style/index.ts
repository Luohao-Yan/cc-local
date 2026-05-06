import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const outputStyle = {
  type: 'local-jsx',
  name: 'output-style',
  get description() { return t('command.description.output-style') },
  isHidden: true,
  load: () => import('./output-style.js'),
} satisfies Command

export default outputStyle
