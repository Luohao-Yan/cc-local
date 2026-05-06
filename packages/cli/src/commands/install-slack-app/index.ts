import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const installSlackApp = {
  type: 'local',
  name: 'install-slack-app',
  get description() { return t('command.description.install-slack-app') },
  availability: ['claude-ai'],
  supportsNonInteractive: false,
  load: () => import('./install-slack-app.js'),
} satisfies Command

export default installSlackApp
