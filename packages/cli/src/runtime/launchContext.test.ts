import { describe, expect, it } from 'vitest'
import {
  buildInteractiveLaunchContext,
  buildSinglePromptLaunchContext,
} from './launchContext.js'

describe('launch context', () => {
  it('does not create a single-prompt context without print input', () => {
    expect(buildSinglePromptLaunchContext({})).toBeUndefined()
  })

  it('builds a single-prompt context from effective launch options', () => {
    expect(buildSinglePromptLaunchContext({
      print: 'hello',
      model: 'sonnet',
      outputFormat: 'json',
      cwd: '/tmp/project',
      includePartialMessages: true,
      replayUserMessages: true,
      sessionPersistence: false,
    })).toEqual({
      prompt: 'hello',
      model: 'sonnet',
      outputFormat: 'json',
      cwd: '/tmp/project',
      includePartialMessages: true,
      replayUserMessages: true,
      ephemeral: true,
      shouldPrintJsonResult: true,
    })
  })

  it('defaults invalid or missing output format to text', () => {
    expect(buildSinglePromptLaunchContext({
      print: 'hello',
      outputFormat: 'xml' as never,
    })?.outputFormat).toBe('text')
  })

  it('builds an interactive launch context', () => {
    expect(buildInteractiveLaunchContext({ createSessionIfNeeded: true })).toEqual({
      createSessionIfNeeded: true,
    })
    expect(buildInteractiveLaunchContext()).toEqual({
      createSessionIfNeeded: false,
    })
  })
})
