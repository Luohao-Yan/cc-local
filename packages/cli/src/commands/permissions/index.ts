import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const permissions = {
  type: 'local-jsx',
  name: 'permissions',
  aliases: ['allowed-tools'],
  get description() { return t('command.description.permissions') },
  load: () => import('./permissions.js'),
} satisfies Command

export default permissions
