import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const memory: Command = {
  type: 'local-jsx',
  name: 'memory',
  get description() { return t('command.description.memory') },
  load: () => import('./memory.js'),
}

export default memory
