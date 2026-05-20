import type { Command } from '../../types/command.js'

const scrollSpeed = {
  type: 'local-jsx',
  name: 'scroll-speed',
  get description() {
    return 'Adjust mouse wheel scroll speed'
  },
  argumentHint: '<1-10>',
  userInvocable: true,
  load: () => import('./scroll-speed.js'),
} satisfies Command

export default scrollSpeed
