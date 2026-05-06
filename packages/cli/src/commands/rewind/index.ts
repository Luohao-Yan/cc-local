import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const rewind = {
  get description() { return t('command.description.rewind') },
  name: 'rewind',
  aliases: ['checkpoint'],
  argumentHint: '',
  type: 'local',
  supportsNonInteractive: false,
  load: () => import('./rewind.js'),
} satisfies Command

export default rewind
