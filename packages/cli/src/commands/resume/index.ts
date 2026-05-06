import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const resume: Command = {
  type: 'local-jsx',
  name: 'resume',
  get description() { return t('command.description.resume') },
  aliases: ['continue'],
  argumentHint: '[conversation id or search term]',
  load: () => import('./resume.js'),
}

export default resume
