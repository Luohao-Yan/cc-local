import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const status = {
  type: 'local-jsx',
  name: 'status',
  description: t('command.description.status'),
  immediate: true,
  load: () => import('./status.js'),
} satisfies Command

export default status
