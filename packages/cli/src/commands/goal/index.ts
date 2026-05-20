import type { Command } from '../../types/command.js'

const goal = {
  type: 'local-jsx',
  name: 'goal',
  get description() {
    return 'Set a goal for Claude to achieve automatically across turns'
  },
  argumentHint: '<goal description>',
  userInvocable: true,
  load: () => import('./goal.js'),
} satisfies Command

export default goal
