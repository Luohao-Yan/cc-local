import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const agents = {
  type: 'local-jsx',
  name: 'agents',
  get description() { return t('command.description.agents') },
  load: () => import('./agents.js'),
} satisfies Command

export default agents
