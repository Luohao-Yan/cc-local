// @ts-nocheck
import { c as _c } from "react/compiler-runtime";
import React, { useMemo } from 'react';
import type { DeepImmutable } from '../../types/utils.js';
import { useElapsedTime } from '../../hooks/useElapsedTime.js';
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js';
import { Box, Text, useTheme } from '../../ink.js';
import { useKeybindings } from '../../keybindings/useKeybinding.js';
import type { MonitorMcpTaskState } from '../../tasks/MonitorMcpTask/MonitorMcpTask.js';
import { MonitorTool } from '../../tools/MonitorTool/MonitorTool.js';
import { formatNumber } from '../../utils/format.js';
import { Byline } from '../design-system/Byline.js';
import { Dialog } from '../design-system/Dialog.js';
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js';

type Props = {
  task: DeepImmutable<MonitorMcpTaskState>;
  onKill?: () => void;
  onBack?: () => void;
};

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  running: '▶',
  completed: '✓',
  killed: '✗',
  failed: '✗',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'inactive',
  running: 'warning',
  completed: 'success',
  killed: 'error',
  failed: 'error',
};

export function MonitorMcpDetailDialog({ task, onKill, onBack }: Props): React.ReactNode {
  const [theme] = useTheme();
  const elapsedTime = useElapsedTime(
    task.startTime,
    task.status === 'running',
    1000,
    task.totalPausedMs ?? 0,
  );

  useKeybindings(
    { 'confirm:yes': onBack ?? (() => {}) },
    { context: 'Confirmation' },
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      onBack?.();
    } else if (e.key === 'left' && onBack) {
      e.preventDefault();
      onBack();
    } else if (e.key === 'x' && task.status === 'running' && onKill) {
      e.preventDefault();
      onKill();
    }
  };

  const command = (task as any).command ?? '';
  const description = (task as any).description ?? '';
  const output = (task as any).output ?? '';
  const toolUseCount = (task as any).progress?.toolUseCount;
  const tokenCount = (task as any).progress?.tokenCount;

  const title = (
    <Text>
      {STATUS_ICONS[task.status] ?? '●'} Monitor: {command || 'MCP Server'}
    </Text>
  );

  const statusLabel =
    task.status === 'completed' ? 'Completed' :
    task.status === 'running' ? 'Running' :
    task.status === 'killed' ? 'Killed' :
    task.status === 'failed' ? 'Failed' : 'Stopped';

  const subtitle = (
    <Text>
      {task.status !== 'running' && (
        <Text color={STATUS_COLORS[task.status] as any}>
          {statusLabel} ·{' '}
        </Text>
      )}
      <Text dimColor>
        {elapsedTime}
        {tokenCount !== undefined && tokenCount > 0 && <> · {formatNumber(tokenCount)} tokens</>}
        {toolUseCount !== undefined && toolUseCount > 0 && <> · {toolUseCount} {toolUseCount === 1 ? 'tool' : 'tools'}</>}
      </Text>
    </Text>
  );

  const inputGuide = (exitState: { pending: boolean; keyName: string }) =>
    exitState.pending ? (
      <Text>Press {exitState.keyName} again to exit</Text>
    ) : (
      <Byline>
        {onBack && <KeyboardShortcutHint shortcut="←" action="go back" />}
        <KeyboardShortcutHint shortcut="Esc/Enter/Space" action="close" />
        {task.status === 'running' && onKill && (
          <KeyboardShortcutHint shortcut="x" action="stop" />
        )}
      </Byline>
    );

  return (
    <Box
      flexDirection="column"
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      <Dialog
        title={title}
        subtitle={subtitle}
        onCancel={onBack}
        color="background"
        inputGuide={inputGuide}
      >
        <Box flexDirection="column">
          {description && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold dimColor>Description</Text>
              <Text wrap="wrap">{description}</Text>
            </Box>
          )}

          {output && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold dimColor>Output</Text>
              <Text dimColor wrap="wrap">
                {output.length > 800 ? output.slice(0, 797) + '...' : output}
              </Text>
            </Box>
          )}

          {task.status === 'running' && !output && (
            <Box marginTop={1}>
              <Text dimColor>Waiting for output...</Text>
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
