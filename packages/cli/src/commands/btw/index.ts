import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const btw = {
  type: 'local-jsx',
  name: 'btw',
  description: t('command.description.btw'),
  immediate: true,
  argumentHint: '<question>',
  load: () => import('./btw.js'),
} satisfies Command

export default btw
