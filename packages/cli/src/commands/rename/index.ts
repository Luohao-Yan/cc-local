import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const rename = {
  type: 'local-jsx',
  name: 'rename',
  get description() { return t('command.description.rename') },
  immediate: true,
  argumentHint: '[name]',
  load: () => import('./rename.js'),
} satisfies Command

export default rename
