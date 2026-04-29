import type { RootLaunchOptions } from './launchOptions.js'

export type OutputFormat = 'text' | 'json' | 'stream-json'

export interface SinglePromptLaunchContext {
  prompt: string
  model?: string
  outputFormat: OutputFormat
  cwd?: string
  includePartialMessages: boolean
  replayUserMessages: boolean
  ephemeral: boolean
  shouldPrintJsonResult: boolean
}

export interface InteractiveLaunchContext {
  createSessionIfNeeded: boolean
}

export function buildSinglePromptLaunchContext(options: RootLaunchOptions): SinglePromptLaunchContext | undefined {
  if (!options.print) {
    return undefined
  }

  const outputFormat = normalizeOutputFormat(options.outputFormat)

  return {
    prompt: options.print,
    model: options.model,
    outputFormat,
    cwd: options.cwd,
    includePartialMessages: Boolean(options.includePartialMessages),
    replayUserMessages: Boolean(options.replayUserMessages),
    ephemeral: options.sessionPersistence === false,
    shouldPrintJsonResult: outputFormat === 'json',
  }
}

export function buildInteractiveLaunchContext(config: { createSessionIfNeeded?: boolean } = {}): InteractiveLaunchContext {
  return {
    createSessionIfNeeded: Boolean(config.createSessionIfNeeded),
  }
}

function normalizeOutputFormat(value: unknown): OutputFormat {
  if (value === 'json' || value === 'stream-json') {
    return value
  }
  return 'text'
}
