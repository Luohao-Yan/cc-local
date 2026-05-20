import chalk from 'chalk'
import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { clearGoal, getGoalState, setGoalActive } from '../../state/autoContinueState.js'
import type { LocalJSXCommandCall, LocalJSXCommandOnDone } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  context,
  args: string,
) => {
  const current = getGoalState()

  // /goal with no args or "off"/"stop"/"clear" → deactivate
  if (!args.trim() || ['off', 'stop', 'clear'].includes(args.trim().toLowerCase())) {
    if (current.active) {
      clearGoal()
      onDone('Goal mode deactivated', { display: 'system' })
    } else {
      onDone('No active goal', { display: 'system' })
    }
    return <></>
  }

  // Set the goal
  const description = args.trim()
  setGoalActive(description)

  onDone(`Goal set: "${description}"`, {
    display: 'system',
    shouldQuery: true,
    metaMessages: [
      `GOAL: ${description}\n\nYou are now in goal mode. Work autonomously across turns to achieve this goal. When you have fully achieved the goal, respond with exactly: GOAL_ACHIEVED\n\nContinue working on the goal. Do not ask for confirmation or wait for user input between steps. Keep going until the goal is achieved.`,
    ],
  })

  return <></>
}
