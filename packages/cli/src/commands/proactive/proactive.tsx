/**
 * /proactive 命令 UI 实现
 */
import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  isProactiveActive,
  isProactivePaused,
  activateProactive,
  deactivateProactive,
  pauseProactive,
  resumeProactive,
  getActivationInfo,
  getProactiveConfig,
  subscribeToProactiveChanges,
  getProactiveState,
} from '../../proactive/index.js'
import { Box, Text } from '../../ink.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

// ── 状态面板组件 ────────────────────────────────────────────────────────────

function StatusPanel(): React.ReactElement {
  const [state, setState] = useState(getProactiveState())
  const [info] = useState(getActivationInfo)
  const config = getProactiveConfig()

  useEffect(() => {
    return subscribeToProactiveChanges(() => {
      setState(getProactiveState())
    })
  }, [])

  const statusColor =
    state === 'active' ? 'green' : state === 'paused' ? 'yellow' : 'gray'

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={statusColor} paddingX={2} paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold color={statusColor}>
          Proactive Mode
        </Text>
        <Text color={statusColor}>
          {state.toUpperCase()}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Tick interval: {config.tickIntervalMs / 1000}s
        </Text>
        <Text dimColor>
          Max consecutive ticks: {config.maxConsecutiveTicks}
        </Text>
        {info.activatedAt && (
          <Text dimColor>
            Active for: {Math.round((Date.now() - info.activatedAt) / 1000)}s
          </Text>
        )}
        {info.consecutiveTicks > 0 && (
          <Text dimColor>
            Ticks this session: {info.consecutiveTicks}
          </Text>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Commands:</Text>
        <Text dimColor>  /proactive on     — Start autonomous mode</Text>
        <Text dimColor>  /proactive off    — Stop autonomous mode</Text>
        <Text dimColor>  /proactive pause  — Pause temporarily</Text>
        <Text dimColor>  /proactive resume — Resume after pause</Text>
      </Box>
    </Box>
  )
}

// ── 主命令入口 ──────────────────────────────────────────────────────────────

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> => {
  const subcommand = args?.trim().toLowerCase() || ''

  // /proactive on
  if (subcommand === 'on' || subcommand === 'start' || subcommand === 'enable') {
    if (isProactiveActive()) {
      onDone('Proactive mode is already active', { display: 'system' })
      return null
    }
    activateProactive('command')
    onDone('Proactive mode activated — Claude will work autonomously when idle', { display: 'system' })
    return null
  }

  // /proactive off
  if (subcommand === 'off' || subcommand === 'stop' || subcommand === 'disable') {
    if (!isProactiveActive() && !isProactivePaused()) {
      onDone('Proactive mode is already inactive', { display: 'system' })
      return null
    }
    deactivateProactive()
    onDone('Proactive mode deactivated', { display: 'system' })
    return null
  }

  // /proactive pause
  if (subcommand === 'pause') {
    if (!isProactiveActive()) {
      onDone('Cannot pause: proactive mode is not active', { display: 'system' })
      return null
    }
    pauseProactive()
    onDone('Proactive mode paused — will resume with /proactive resume', { display: 'system' })
    return null
  }

  // /proactive resume
  if (subcommand === 'resume') {
    if (!isProactivePaused()) {
      onDone('Cannot resume: proactive mode is not paused', { display: 'system' })
      return null
    }
    resumeProactive()
    onDone('Proactive mode resumed', { display: 'system' })
    return null
  }

  // /proactive status (无参数也显示状态)
  if (subcommand === '' || subcommand === 'status') {
    return <StatusPanel />
  }

  // 未知子命令
  onDone(`Unknown subcommand: ${subcommand}. Use: on, off, pause, resume, status`, { display: 'system' })
  return null
}
