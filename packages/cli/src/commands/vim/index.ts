import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const command = {
  name: 'vim',
  get description() { return t('command.description.vim') },
  supportsNonInteractive: false,
  type: 'local',
  load: () => import('./vim.js'),
} satisfies Command

export default command
