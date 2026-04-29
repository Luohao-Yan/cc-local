import type { Command } from '../../types/command.js'

const assistantCommand: Command = {
  type: 'local',
  name: 'assistant',
  description: 'Assistant (stub)',
  isEnabled: () => false,
  async call() {
    return { type: 'empty' as const }
  },
}

export default assistantCommand
