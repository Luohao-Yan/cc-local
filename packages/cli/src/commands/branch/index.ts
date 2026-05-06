import { feature } from 'bun:bundle'
import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

const branch = {
  type: 'local-jsx',
  name: 'branch',
  // 'fork' alias only when /fork doesn't exist as its own command
  aliases: feature('FORK_SUBAGENT') ? [] : ['fork'],
  get description() { return t('command.description.branch') },
  argumentHint: '[name]',
  load: () => import('./branch.js'),
} satisfies Command

export default branch
