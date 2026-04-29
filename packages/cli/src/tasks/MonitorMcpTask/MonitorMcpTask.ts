import type { AgentId } from '../../types/ids.js'
import type { AppState } from '../../state/AppState.js'
import type { SetAppState, Task, TaskStateBase } from '../../Task.js'

export type MonitorMcpTaskState = TaskStateBase & {
  type: 'monitor_mcp'
  isBackgrounded?: boolean
  [key: string]: unknown
}

export const MonitorMcpTask: Task = {
  name: 'MonitorMcp',
  type: 'monitor_mcp',
  async kill(_taskId: string, _setAppState: SetAppState): Promise<void> {},
}

export function killMonitorMcp(_taskId: string, _setAppState: SetAppState): void {}

export function killMonitorMcpTasksForAgent(
  _agentId: AgentId,
  _getAppState: () => AppState,
  _setAppState: SetAppState,
): void {}
