import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const plan = {
  type: 'local-jsx',
  name: 'plan',
  get description() { return t('command.description.plan') },
  argumentHint: '[open|<description>]',
  load: () => import('./plan.js'),
} satisfies Command

export default plan
