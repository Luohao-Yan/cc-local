import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const stickers = {
  type: 'local',
  name: 'stickers',
  get description() { return t('command.description.stickers') },
  supportsNonInteractive: false,
  load: () => import('./stickers.js'),
} satisfies Command

export default stickers
