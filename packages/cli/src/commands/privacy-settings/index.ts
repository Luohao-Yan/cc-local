import type { Command } from '../../commands.js'
import { isConsumerSubscriber } from '../../utils/auth.js'
import { t } from '../../utils/i18n/index.js'

const privacySettings = {
  type: 'local-jsx',
  name: 'privacy-settings',
  get description() { return t('command.description.privacy-settings') },
  isEnabled: () => {
    return isConsumerSubscriber()
  },
  load: () => import('./privacy-settings.js'),
} satisfies Command

export default privacySettings
