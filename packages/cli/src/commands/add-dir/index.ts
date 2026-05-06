import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const addDir = {
  type: 'local-jsx',
  name: 'add-dir',
  get description() { return t('command.description.add-dir') },
  argumentHint: '<path>',
  load: () => import('./add-dir.js'),
} satisfies Command

export default addDir
