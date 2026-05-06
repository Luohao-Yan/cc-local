import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const heapDump = {
  type: 'local',
  name: 'heapdump',
  get description() { return t('command.description.heapdump') },
  isHidden: true,
  supportsNonInteractive: true,
  load: () => import('./heapdump.js'),
} satisfies Command

export default heapDump
