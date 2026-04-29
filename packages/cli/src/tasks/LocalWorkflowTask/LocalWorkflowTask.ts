import type { SetAppState, Task, TaskStateBase } from '../../Task.js'

export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  isBackgrounded?: boolean
  [key: string]: unknown
}

export const LocalWorkflowTask: Task = {
  name: 'LocalWorkflow',
  type: 'local_workflow',
  async kill(_taskId: string, _setAppState: SetAppState): Promise<void> {},
}

export function killWorkflowTask(_taskId: string, _setAppState: SetAppState): void {}

export function skipWorkflowAgent(
  _workflowId: string,
  _agentId: string,
  _setAppState: SetAppState,
): void {}

export function retryWorkflowAgent(
  _workflowId: string,
  _agentId: string,
  _setAppState: SetAppState,
): void {}
