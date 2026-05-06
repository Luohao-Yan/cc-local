import type { Command } from '../../types/command.js'
import { t } from '../../utils/i18n/index.js'

const assistantCommand: Command = {
  type: 'local',
  name: 'assistant',
  get description() { return t('command.description.assistant') },
  isEnabled: () => false,
  async call() {
    return { type: 'empty' as const }
  },
}

export default assistantCommand
