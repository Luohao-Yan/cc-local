import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const files = {
  type: 'local',
  name: 'files',
  get description() { return t('command.description.files') },
  isEnabled: () => process.env.USER_TYPE === 'ant',
  supportsNonInteractive: true,
  load: () => import('./files.js'),
} satisfies Command

export default files
