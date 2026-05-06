import type { Command } from '../../commands.js'
import { isKeybindingCustomizationEnabled } from '../../keybindings/loadUserBindings.js'
import { t } from '../../utils/i18n/index.js'

const keybindings = {
  name: 'keybindings',
  get description() { return t('command.description.keybindings') },
  isEnabled: () => isKeybindingCustomizationEnabled(),
  supportsNonInteractive: false,
  type: 'local',
  load: () => import('./keybindings.js'),
} satisfies Command

export default keybindings
