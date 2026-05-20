import * as React from 'react'
import { clearLoop, getLoopState, setLoopActive } from '../../state/autoContinueState.js'
import type { LocalJSXCommandCall, LocalJSXCommandOnDone } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  context,
  args: string,
) => {
  const current = getLoopState()

  // /loop stop → deactivate
  if (args.trim().toLowerCase() === 'stop') {
    if (current.active) {
      clearLoop()
      onDone('Loop mode stopped', { display: 'system' })
    } else {
      onDone('Loop mode is not active', { display: 'system' })
    }
    return <></>
  }

  // Activate loop mode
  setLoopActive()

  onDone('Loop mode active — press Esc to stop', {
    display: 'system',
    shouldQuery: true,
    metaMessages: [
      'LOOP_MODE: You are in loop mode. Continue working on the task autonomously. Do not ask for confirmation or wait for user input between steps. Keep iterating until the user presses Esc to stop.',
    ],
  })

  return <></>
}
