import React, { useEffect, useState } from 'react'
import { Box, Text } from '../../ink.js'
import { useKeybindings } from '../../keybindings/useKeybinding.js'
import { useElapsedTime } from '../../hooks/useElapsedTime.js'
import { Dialog } from '../design-system/Dialog.js'
import { Byline } from '../design-system/Byline.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import type { MonitorMcpTaskState } from '../../tasks/MonitorMcpTask/MonitorMcpTask.js'
import figures from 'figures'

type Props = {
  task: MonitorMcpTaskState
  onKill?: () => void
  onBack?: () => void
}

export function MonitorMcpDetailDialog({ task, onKill, onBack }: Props): React.ReactNode {
  const elapsedTime = useElapsedTime(task.startTime, task.status === 'running', 1000, task.totalPausedMs ?? 0)

  useKeybindings(
    {
      'confirm:yes': onBack ?? (() => {}),
    },
    { context: 'Confirmation' },
  )

  const title = `${figures.eye} Monitor: ${task.command ?? 'MCP Server'}`
  const statusText = task.status === 'running' ? 'Running' : task.status === 'completed' ? 'Completed' : 'Stopped'

  return (
    <Dialog title={<Text>{title}</Text>}>
      <Box flexDirection="column" gap={1}>
        <Text dimColor>
          Status: {statusText} | Elapsed: {elapsedTime}
        </Text>

        {task.description && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Description</Text>
            <Text wrap="wrap">{task.description}</Text>
          </Box>
        )}

        {task.output && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold dimColor>Output</Text>
            <Text dimColor wrap="wrap">{task.output.length > 500 ? task.output.substring(0, 497) + '...' : task.output}</Text>
          </Box>
        )}

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
          {task.status === 'running' && onKill && (
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
