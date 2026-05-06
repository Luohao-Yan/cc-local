import { getIsRemoteMode } from '../../bootstrap/state.js'
import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const session = {
  type: 'local-jsx',
  name: 'session',
  aliases: ['remote'],
  get description() { return t('command.description.session') },
  isEnabled: () => getIsRemoteMode(),
  get isHidden() {
    return !getIsRemoteMode()
  },
  load: () => import('./session.js'),
} satisfies Command

export default session
