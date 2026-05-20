import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const workflows = {
  type: 'local',
  name: 'workflows',
  get description() { return t('command.description.workflows') },
  isEnabled: () => true,
  supportsNonInteractive: true,
  argumentHint: undefined,
  load: () => import('./workflows.js'),
} satisfies Command

export default workflows
