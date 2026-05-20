import type { Command } from '../../types/command.js'

const loop = {
  type: 'local-jsx',
  name: 'loop',
  get description() {
    return 'Loop the current prompt until you press Esc to stop'
  },
  userInvocable: true,
  load: () => import('./loop.js'),
} satisfies Command

export default loop
