import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const releaseNotes: Command = {
  get description() { return t('command.description.release-notes') },
  name: 'release-notes',
  type: 'local',
  supportsNonInteractive: true,
  load: () => import('./release-notes.js'),
}

export default releaseNotes
