import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const tag = {
  type: 'local-jsx',
  name: 'tag',
  get description() { return t('command.description.tag') },
  isEnabled: () => process.env.USER_TYPE === 'ant',
  argumentHint: '<tag-name>',
  load: () => import('./tag.js'),
} satisfies Command

export default tag
