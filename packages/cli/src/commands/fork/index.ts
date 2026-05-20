import type { Command } from '../../commands.js'

const fork = {
  type: 'local-jsx',
  name: 'fork',
  description: 'Spawn a forked agent with current context',
  argumentHint: '<directive>',
  load: () => import('./fork.js'),
} satisfies Command

export default fork
