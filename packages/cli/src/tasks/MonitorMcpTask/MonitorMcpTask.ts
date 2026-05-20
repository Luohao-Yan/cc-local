import type { ChildProcess } from 'child_process'
import type { AppState } from '../../state/AppState.js'
import type { AgentId } from '../../types/ids.js'
import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import { logForDebugging } from '../../utils/debug.js'

export type MonitorMcpTaskState = TaskStateBase & {
  type: 'monitor_mcp'
  isBackgrounded?: boolean
  childProcess?: ChildProcess
  agentId?: AgentId
  [key: string]: unknown
}

export const MonitorMcpTask: Task = {
  name: 'MonitorMcp',
  type: 'monitor_mcp',
  async kill(taskId: string, setAppState: SetAppState): Promise<void> {
    killMonitorMcp(taskId, setAppState)
  },
}

export function killMonitorMcp(taskId: string, setAppState: SetAppState): void {
  setAppState(prev => {
    const task = prev.tasks?.[taskId] as MonitorMcpTaskState | undefined
    if (!task || task.status === 'completed' || task.status === 'killed') {
      return prev
    }

    const childProcess = task.childProcess
    if (childProcess && !childProcess.killed) {
      try {
        childProcess.kill('SIGTERM')
        logForDebugging(`killMonitorMcp: sent SIGTERM to process ${childProcess.pid}`)
      } catch (err) {
        logForDebugging(`killMonitorMcp: error killing process: ${err}`)
      }
    }

    return {
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...task,
          status: 'killed',
          endTime: Date.now(),
        },
      },
    }
  })
}

export function killMonitorMcpTasksForAgent(
  agentId: AgentId,
  getAppState: () => AppState,
  setAppState: SetAppState,
): void {
  const state = getAppState()
  const tasks = state.tasks ?? {}
  const tasksToKill = Object.entries(tasks).filter(
    ([_id, task]) =>
      task.type === 'monitor_mcp' &&
      task.status !== 'completed' &&
      task.status !== 'killed' &&
      task.agentId === agentId,
  )

  for (const [taskId] of tasksToKill) {
    killMonitorMcp(taskId, setAppState)
  }
}
