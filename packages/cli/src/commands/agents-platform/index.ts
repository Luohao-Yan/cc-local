import type { Command } from '../../types/command.js'

const agentsPlatform: Command = {
  type: 'local',
  name: 'agents-platform',
  description: 'Agents platform (stub)',
  isEnabled: () => false,
  async call() {
    return { type: 'empty' as const }
  },
}

export default agentsPlatform
