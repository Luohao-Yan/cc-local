import type { LocalCommandCall, LocalCommandResult } from '../../types/command.js'
import { logForDebugging } from '../../utils/debug.js'

/**
 * /workflows command handler.
 *
 * Lists available workflow templates and currently running workflows.
 * For now, since there are no bundled templates, it shows a placeholder
 * and any active workflow runs.
 */
export const call: LocalCommandCall = async (_args, _context): Promise<LocalCommandResult> => {
  logForDebugging('/workflows: listing available workflows')

  // Import the active workflow registry
  const { getActiveWorkflowIds, getWorkflowRun } = await import(
    '../../tools/WorkflowTool/WorkflowTool.js'
  ).catch(() => ({
    getActiveWorkflowIds: (): string[] => [],
    getWorkflowRun: (_id: string) => undefined,
  }))

  const ids = getActiveWorkflowIds()

  if (ids.length === 0) {
    return {
      type: 'text',
      value:
        'No workflow templates available yet. Use the Workflow tool to define custom multi-step workflows.',
    }
  }

  const lines: string[] = ['Active workflows:']
  for (const id of ids) {
    const run = getWorkflowRun(id)
    if (run) {
      const completed = run.steps.filter(s => s.status === 'completed').length
      const total = run.steps.length
      lines.push(
        `  ${run.workflowName} [${id}] — ${run.status} (${completed}/${total} steps)`,
      )
      for (const step of run.steps) {
        const depStr =
          step.dependsOn.length > 0 ? ` (after: ${step.dependsOn.join(', ')})` : ''
        lines.push(`    - ${step.name}: ${step.status}${depStr}`)
      }
    }
  }

  return {
    type: 'text',
    value: lines.join('\n'),
  }
}
