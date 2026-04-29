import type { Command } from 'commander'

export const REST_BACKED_COMMANDS = new Set([
  'mcp',
  'models',
  'sessions',
  'doctor',
  'context',
  'stats',
  'cost',
  'model',
  'export',
  'assistant',
])

export function getRawUserOptionValue(args: string[], flag: string): string | undefined {
  const equalsPrefix = `${flag}=`
  const equalsMatch = args.find((arg) => arg.startsWith(equalsPrefix))
  if (equalsMatch) {
    return equalsMatch.slice(equalsPrefix.length)
  }
  const index = args.lastIndexOf(flag)
  if (index === -1) {
    return undefined
  }
  const value = args[index + 1]
  return value && !value.startsWith('--') ? value : undefined
}

export function hasExplicitServerArg(args: string[]): boolean {
  return args.some((arg) => arg === '--server' || arg === '-s' || arg.startsWith('--server='))
}

export function hasLegacyFlag(args: string[]): boolean {
  return args.some((arg) => arg === '--legacy' || arg.startsWith('--legacy='))
}

export function shouldAutoStartEmbeddedServer(args: string[]): boolean {
  return !hasExplicitServerArg(args) && !hasLegacyFlag(args)
}

export function getCommandPath(command: Command): string[] {
  const names: string[] = []
  let current: Command | null = command
  while (current) {
    names.unshift(current.name())
    current = current.parent || null
  }
  return names
}

export function commandUsesRestApi(command: Command): boolean {
  const topLevelCommand = getCommandPath(command)[1]
  if (!topLevelCommand) {
    return true
  }

  if (topLevelCommand === 'model') {
    return command.name() !== 'current'
  }

  return REST_BACKED_COMMANDS.has(topLevelCommand)
}
