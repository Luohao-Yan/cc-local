import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const mobile = {
  type: 'local-jsx',
  name: 'mobile',
  aliases: ['ios', 'android'],
  get description() { return t('command.description.mobile') },
  load: () => import('./mobile.js'),
} satisfies Command

export default mobile
