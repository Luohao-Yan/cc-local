import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import { createTaskStateBase, generateTaskId } from '../../Task.js'
import { logForDebugging } from '../../utils/debug.js'
import {
  getWorkflowRun,
  type WorkflowRunState,
  type WorkflowStepState,
} from '../../tools/WorkflowTool/WorkflowTool.js'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  isBackgrounded?: boolean
  workflowTaskId: string
  workflowName: string
  stepStatuses: Record<string, StepStatus>
}

/**
 * Create the initial state for a local workflow task.
 */
export function createLocalWorkflowTaskState(
  workflowTaskId: string,
  workflowName: string,
  stepStates: WorkflowStepState[],
  toolUseId?: string,
): LocalWorkflowTaskState {
  const stepStatuses: Record<string, StepStatus> = {}
  for (const step of stepStates) {
    stepStatuses[step.name] = step.status as StepStatus
  }

  return {
    ...createTaskStateBase(
      generateTaskId('local_workflow'),
      'local_workflow',
      `Workflow: ${workflowName}`,
      toolUseId,
    ),
    type: 'local_workflow' as const,
    isBackgrounded: true,
    workflowTaskId,
    workflowName,
    stepStatuses,
  }
}

export const LocalWorkflowTask: Task = {
  name: 'LocalWorkflow',
  type: 'local_workflow',
  async kill(taskId: string, setAppState: SetAppState): Promise<void> {
    logForDebugging(`LocalWorkflowTask.kill: taskId=${taskId}`)
    setAppState(prev => {
      const task = prev.tasks?.[taskId] as LocalWorkflowTaskState | undefined
      if (!task) return prev

      // Find the workflow run and abort all running steps
      const run = getWorkflowRun(task.workflowTaskId)
      if (run) {
        for (const step of run.steps) {
          if (step.status === 'running') {
            step.status = 'failed'
          }
        }
        run.status = 'killed'
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
  },
}

export function killWorkflowTask(taskId: string, setAppState: SetAppState): void {
  void LocalWorkflowTask.kill(taskId, setAppState)
}

/**
 * Skip a specific agent step within a workflow.
 * Marks the step as failed so downstream steps are also skipped.
 */
export function skipWorkflowAgent(
  workflowId: string,
  agentName: string,
  setAppState: SetAppState,
): void {
  logForDebugging(`skipWorkflowAgent: workflowId=${workflowId}, agent=${agentName}`)
  const run = getWorkflowRun(workflowId)
  if (!run) return

  const step = run.steps.find(s => s.name === agentName)
  if (step && (step.status === 'running' || step.status === 'pending')) {
    step.status = 'failed'
    logForDebugging(`skipWorkflowAgent: step "${agentName}" skipped`)

    // Update task state
    setAppState(prev => {
      const taskEntry = Object.values(prev.tasks ?? {}).find(
        t => t.type === 'local_workflow' && (t as LocalWorkflowTaskState).workflowTaskId === workflowId,
      ) as LocalWorkflowTaskState | undefined
      if (!taskEntry) return prev

      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskEntry.id]: {
            ...taskEntry,
            stepStatuses: {
              ...taskEntry.stepStatuses,
              [agentName]: 'failed',
            },
          },
        },
      }
    })
  }
}

/**
 * Retry a specific agent step within a workflow.
 * Resets the step to running and re-spawns the forked agent.
 */
export function retryWorkflowAgent(
  workflowId: string,
  agentName: string,
  setAppState: SetAppState,
): void {
  logForDebugging(`retryWorkflowAgent: workflowId=${workflowId}, agent=${agentName}`)
  const run = getWorkflowRun(workflowId)
  if (!run) return

  const step = run.steps.find(s => s.name === agentName)
  if (step && step.status === 'failed') {
    // Check all dependencies still met
    const allMet = step.dependsOn.every(dep => {
      const depStep = run.steps.find(s => s.name === dep)
      return depStep?.status === 'completed'
    })

    if (allMet) {
      step.status = 'running'
      logForDebugging(`retryWorkflowAgent: retrying step "${agentName}"`)

      // Re-spawn the agent (same pattern as initial spawn)
      import('../../utils/forkedAgent.js')
        .then(({ runForkedAgent }) =>
          runForkedAgent({
            promptMessages: [] as any,
            cacheSafeParams: {
              systemPrompt: '' as any,
              userContext: {},
              systemContext: {},
              toolUseContext: {} as any,
              forkContextMessages: [],
            },
            canUseTool: async () => ({ behavior: 'allow', updatedInput: undefined }),
            querySource: 'workflow' as any,
            forkLabel: `workflow-${run.workflowName}-${step.name}`,
          }),
        )
        .then(
          () => {
            step.status = 'completed'
            logForDebugging(`retryWorkflowAgent: step "${agentName}" completed on retry`)
          },
          (err: unknown) => {
            step.status = 'failed'
            logForDebugging(`retryWorkflowAgent: step "${agentName}" failed again: ${err}`)
          },
        )
        .catch((err: unknown) => {
          logForDebugging(`retryWorkflowAgent: import failed for step "${agentName}": ${err}`)
          step.status = 'failed'
        })

      // Update task state
      setAppState(prev => {
        const taskEntry = Object.values(prev.tasks ?? {}).find(
          t => t.type === 'local_workflow' && (t as LocalWorkflowTaskState).workflowTaskId === workflowId,
        ) as LocalWorkflowTaskState | undefined
        if (!taskEntry) return prev

        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskEntry.id]: {
              ...taskEntry,
              stepStatuses: {
                ...taskEntry.stepStatuses,
                [agentName]: 'running',
              },
            },
          },
        }
      })
    } else {
      logForDebugging(`retryWorkflowAgent: cannot retry "${agentName}" — dependencies not met`)
    }
  }
}
