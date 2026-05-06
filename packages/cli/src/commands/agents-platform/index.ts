import type { Command } from '../../types/command.js'
import { t } from '../../utils/i18n/index.js'

const agentsPlatform: Command = {
  type: 'local',
  name: 'agents-platform',
  get description() { return t('command.description.agents-platform') },
  isEnabled: () => false,
  async call() {
    return { type: 'empty' as const }
  },
}

export default agentsPlatform
