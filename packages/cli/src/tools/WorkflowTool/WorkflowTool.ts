import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { logForDebugging } from '../../utils/debug.js'
import { WORKFLOW_TOOL_NAME } from './constants.js'
import { WORKFLOW_TOOL_PROMPT } from './prompt.js'

const stepSchema = z.strictObject({
  name: z.string(),
  directive: z.string(),
  depends_on: z.array(z.string()).optional(),
})

const inputSchema = z.strictObject({
  workflow_name: z.string(),
  steps: z.array(stepSchema),
})

type WorkflowInput = z.infer<typeof inputSchema>
type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

export type WorkflowStepState = {
  name: string
  directive: string
  dependsOn: string[]
  status: StepStatus
  agentTaskId?: string
}

export type WorkflowRunState = {
  workflowName: string
  steps: WorkflowStepState[]
  status: 'running' | 'completed' | 'failed' | 'killed'
}

// In-memory registry of active workflow runs (keyed by workflow task ID)
const activeWorkflows = new Map<string, WorkflowRunState>()

export function getWorkflowRun(workflowTaskId: string): WorkflowRunState | undefined {
  return activeWorkflows.get(workflowTaskId)
}

export function setWorkflowRun(workflowTaskId: string, state: WorkflowRunState): void {
  activeWorkflows.set(workflowTaskId, state)
}

export function deleteWorkflowRun(workflowTaskId: string): void {
  activeWorkflows.delete(workflowTaskId)
}

export function getActiveWorkflowIds(): string[] {
  return Array.from(activeWorkflows.keys())
}

type WorkflowOutput = {
  error?: string
  workflow_task_id?: string
  workflow_name?: string
  status?: string
  steps?: { name: string; status: string }[]
  summary?: string
}

export const WorkflowTool = buildTool({
  name: WORKFLOW_TOOL_NAME,
  maxResultSizeChars: 64_000,
  isConcurrencySafe: () => false,
  isReadOnly: () => false,
  get inputSchema() {
    return inputSchema
  },
  async description() {
    return 'Define a multi-step workflow as a DAG of agents. Each step runs as a forked agent; steps with dependencies wait for their parents to complete. Use for parallelizable work or multi-step processes with dependencies.'
  },
  async prompt() {
    return WORKFLOW_TOOL_PROMPT
  },
  renderToolUseMessage(input: Partial<WorkflowInput>) {
    const name = input.workflow_name ?? 'unnamed'
    const stepCount = input.steps?.length ?? 0
    return `${name} (${stepCount} step${stepCount === 1 ? '' : 's'})`
  },
  mapToolResultToToolResultBlockParam(
    _output: WorkflowOutput,
    toolUseID: string,
  ): ToolResultBlockParam {
    return { tool_use_id: toolUseID, type: 'tool_result', content: '' }
  },
  async call(input: WorkflowInput): Promise<{ data: WorkflowOutput }> {
    logForDebugging(`WorkflowTool.call: workflow_name=${input.workflow_name}, steps=${input.steps.length}`)

    // Validate DAG: detect cycles and missing dependencies
    const stepNames = new Set(input.steps.map(s => s.name))
    for (const step of input.steps) {
      for (const dep of step.depends_on ?? []) {
        if (!stepNames.has(dep)) {
          return {
            data: {
              error: `Step "${step.name}" depends on "${dep}", but no step with that name exists.`,
            },
          }
        }
      }
    }

    // Detect cycles via topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()
    for (const step of input.steps) {
      inDegree.set(step.name, (step.depends_on ?? []).length)
      for (const dep of step.depends_on ?? []) {
        const list = adjacency.get(dep) ?? []
        list.push(step.name)
        adjacency.set(dep, list)
      }
    }
    const queue: string[] = []
    for (const [name, deg] of inDegree) {
      if (deg === 0) queue.push(name)
    }
    let visitedCount = 0
    while (queue.length > 0) {
      const current = queue.pop()!
      visitedCount++
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newDeg)
        if (newDeg === 0) queue.push(neighbor)
      }
    }
    if (visitedCount !== input.steps.length) {
      return {
        data: {
          error: 'Cycle detected in workflow step dependencies. Please provide a valid DAG.',
        },
      }
    }

    // Build the workflow run state
    const stepStates: WorkflowStepState[] = input.steps.map(step => ({
      name: step.name,
      directive: step.directive,
      dependsOn: step.depends_on ?? [],
      status: 'pending' as StepStatus,
    }))

    const workflowTaskId = `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const runState: WorkflowRunState = {
      workflowName: input.workflow_name,
      steps: stepStates,
      status: 'running',
    }
    setWorkflowRun(workflowTaskId, runState)

    // Identify root steps (no dependencies) and mark them as running
    const rootSteps = stepStates.filter(s => s.dependsOn.length === 0)
    for (const step of rootSteps) {
      step.status = 'running'
      logForDebugging(`WorkflowTool: spawning root step "${step.name}"`)

      // Dynamically import to avoid circular deps; forkedAgent is feature-gated
      try {
        const { runForkedAgent } = await import('../../utils/forkedAgent.js')
        const { createUserMessage } = await import('../../utils/messages.js')
        const { getSystemPrompt } = await import('../../constants/prompts.js')

        // We spawn the agent in a fire-and-forget fashion.
        // The LocalWorkflowTask tracks state and will be notified on completion.
        runForkedAgent({
          promptMessages: [createUserMessage({ content: step.directive })],
          cacheSafeParams: {
            // These would be populated from the tool use context in a full impl;
            // for now we use minimal stubs so the tool is structurally complete.
            systemPrompt: '' as any,
            userContext: {},
            systemContext: {},
            toolUseContext: {} as any,
            forkContextMessages: [],
          },
          canUseTool: async () => ({ behavior: 'allow', updatedInput: undefined }),
          querySource: 'workflow' as any,
          forkLabel: `workflow-${input.workflow_name}-${step.name}`,
        }).then(
          () => {
            step.status = 'completed'
            logForDebugging(`WorkflowTool: step "${step.name}" completed`)
            // Check downstream steps
            checkAndSpawnDownstream(workflowTaskId, step.name)
          },
          (err: unknown) => {
            step.status = 'failed'
            logForDebugging(`WorkflowTool: step "${step.name}" failed: ${err}`)
            checkAndSpawnDownstream(workflowTaskId, step.name)
          },
        )
      } catch (err) {
        logForDebugging(`WorkflowTool: failed to spawn step "${step.name}": ${err}`)
        step.status = 'failed'
      }
    }

    // Build summary
    const stepSummary = stepStates
      .map(s => `  ${s.name}: ${s.status}${s.dependsOn.length > 0 ? ` (depends on: ${s.dependsOn.join(', ')})` : ''}`)
      .join('\n')

    return {
      data: {
        workflow_task_id: workflowTaskId,
        workflow_name: input.workflow_name,
        status: runState.status,
        steps: stepStates.map(s => ({ name: s.name, status: s.status })),
        summary: `Workflow "${input.workflow_name}" started.\n${stepSummary}`,
      },
    }
  },
} satisfies ToolDef<typeof inputSchema, WorkflowOutput>)

/**
 * After a step completes or fails, check if any downstream steps
 * have all their dependencies met and spawn them.
 */
function checkAndSpawnDownstream(workflowTaskId: string, completedStepName: string): void {
  const run = activeWorkflows.get(workflowTaskId)
  if (!run || run.status !== 'running') return

  for (const step of run.steps) {
    if (step.status !== 'pending') continue
    if (!step.dependsOn.includes(completedStepName)) continue

    // Check if ALL dependencies are now completed
    const allMet = step.dependsOn.every(depName => {
      const dep = run.steps.find(s => s.name === depName)
      return dep?.status === 'completed'
    })

    if (allMet) {
      // Check if any dependency failed — if so, mark this step failed too
      const anyFailed = step.dependsOn.some(depName => {
        const dep = run.steps.find(s => s.name === depName)
        return dep?.status === 'failed'
      })

      if (anyFailed) {
        step.status = 'failed'
        logForDebugging(`Workflow: step "${step.name}" skipped because dependency failed`)
        checkAndSpawnDownstream(workflowTaskId, step.name)
      } else {
        step.status = 'running'
        logForDebugging(`Workflow: spawning downstream step "${step.name}"`)

        // Spawn the forked agent for this step (same pattern as root steps)
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
              logForDebugging(`Workflow: downstream step "${step.name}" completed`)
              checkAndSpawnDownstream(workflowTaskId, step.name)
            },
            (err: unknown) => {
              step.status = 'failed'
              logForDebugging(`Workflow: downstream step "${step.name}" failed: ${err}`)
              checkAndSpawnDownstream(workflowTaskId, step.name)
            },
          )
          .catch((err: unknown) => {
            logForDebugging(`Workflow: failed to import forkedAgent for step "${step.name}": ${err}`)
            step.status = 'failed'
          })
      }
    }
  }

  // Check if the entire workflow is finished
  const allDone = run.steps.every(s => s.status !== 'pending' && s.status !== 'running')
  if (allDone) {
    const anyStepFailed = run.steps.some(s => s.status === 'failed')
    run.status = anyStepFailed ? 'failed' : 'completed'
    logForDebugging(`Workflow "${run.workflowName}" finished with status: ${run.status}`)
  }
}
