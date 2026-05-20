import React, { useEffect, useState } from 'react'
import { Box, Text } from '../../ink.js'
import { useKeybindings } from '../../keybindings/useKeybinding.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { useElapsedTime } from '../../hooks/useElapsedTime.js'
import { logForDebugging } from '../../utils/debug.js'
import { getWorkflowRun, type WorkflowRunState } from '../../tools/WorkflowTool/WorkflowTool.js'
import { Dialog } from '../design-system/Dialog.js'
import { Byline } from '../design-system/Byline.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import figures from 'figures'

type Props = {
  workflowTaskId: string
  workflowName: string
  onDone: () => void
  onKill?: () => void
  onBack?: () => void
}

const STATUS_ICONS: Record<string, string> = {
  pending: figures.circle,
  running: figures.play,
  completed: figures.tick,
  failed: figures.cross,
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'inactive',
  running: 'warning',
  completed: 'success',
  failed: 'error',
}

export function WorkflowDetailDialog({
  workflowTaskId,
  workflowName,
  onDone,
  onKill,
  onBack,
}: Props): React.ReactNode {
  const { columns } = useTerminalSize()
  const elapsedTime = useElapsedTime(Date.now(), true, 1000, 0)

  const [runState, setRunState] = useState<WorkflowRunState | undefined>(() =>
    getWorkflowRun(workflowTaskId),
  )

  // Poll for state updates
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getWorkflowRun(workflowTaskId)
      if (current !== runState) {
        setRunState(current)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [workflowTaskId, runState])

  useKeybindings(
    {
      'confirm:yes': onDone,
    },
    { context: 'Confirmation' },
  )

  if (!runState) {
    return (
      <Dialog>
        <Text>Workflow "{workflowName}" not found.</Text>
        <Byline>
          <Text dimColor>
            <KeyboardShortcutHint shortcut="space" action="close" />
          </Text>
        </Byline>
      </Dialog>
    )
  }

  const completedCount = runState.steps.filter(s => s.status === 'completed').length
  const totalCount = runState.steps.length

  return (
    <Dialog>
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>
            {figures.play} Workflow: {runState.workflowName}
          </Text>
          <Text dimColor>
            Status: {runState.status} | Steps: {completedCount}/{totalCount} | Elapsed:{' '}
            {elapsedTime}
          </Text>
        </Box>

        {/* Step DAG visualization */}
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Steps:</Text>
          {runState.steps.map(step => (
            <Box key={step.name} flexDirection="row" gap={1}>
              <Text color={STATUS_COLORS[step.status] as any}>
                {STATUS_ICONS[step.status] ?? figures.bullet}
              </Text>
              <Text>{step.name}</Text>
              {step.dependsOn.length > 0 && (
                <Text dimColor>(after: {step.dependsOn.join(', ')})</Text>
              )}
              <Text dimColor>— {step.status}</Text>
            </Box>
          ))}
        </Box>

        <Byline>
          <Text dimColor>
            <KeyboardShortcutHint shortcut="space" action="close" />
          </Text>
          {onBack && (
            <Text dimColor>
              {' '}
              <KeyboardShortcutHint shortcut="left" action="back" />
            </Text>
          )}
          {runState.status === 'running' && onKill && (
            <Text dimColor>
              {' '}
              <KeyboardShortcutHint shortcut="x" action="kill" />
            </Text>
          )}
        </Byline>
      </Box>
    </Dialog>
  )
}
