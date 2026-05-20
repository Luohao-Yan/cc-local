import chalk from 'chalk'
import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { readScrollSpeedBase } from '../../components/ScrollKeybindingHandler.js'
import type { LocalJSXCommandCall, LocalJSXCommandOnDone } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  context,
  args: string,
) => {
  const current = readScrollSpeedBase()

  // /scroll-speed with no args → show current value
  if (!args.trim()) {
    onDone(`Current scroll speed: ${current} (set via CLAUDE_CODE_SCROLL_SPEED env var)`, {
      display: 'system',
    })
    return <></>
  }

  const parsed = parseInt(args.trim(), 10)
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 20) {
    onDone('Scroll speed must be a number between 1 and 20', { display: 'system' })
    return <></>
  }

  // Set the env var for this session and persist it
  process.env.CLAUDE_CODE_SCROLL_SPEED = String(parsed)

  onDone(`Scroll speed set to ${parsed} for this session. Add CLAUDE_CODE_SCROLL_SPEED=${parsed} to your shell profile to persist.`, {
    display: 'system',
  })

  return <></>
}
