import React from 'react'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import { PermissionDialog } from '../permissions/PermissionDialog.js'
import type { PermissionRequestProps } from '../permissions/PermissionRequest.js'
import figures from 'figures'

/**
 * Permission prompt for workflow execution.
 *
 * Shown when the model calls the Workflow tool, giving the user
 * a chance to approve or deny the multi-step DAG execution.
 */
export function WorkflowPermissionRequest({
  toolUseConfirm,
  onDone,
  onReject,
  verbose,
  workerBadge,
}: PermissionRequestProps): React.ReactNode {
  const input = toolUseConfirm.input as {
    workflow_name?: string
    steps?: Array<{ name: string; directive: string; depends_on?: string[] }>
  }

  const workflowName = input?.workflow_name ?? 'unnamed'
  const steps = input?.steps ?? []

  useKeybinding('escape', () => {
    toolUseConfirm.onReject()
    onReject()
  })

  const title = `${figures.play} Execute workflow: ${workflowName}`
  const subtitle =
    steps.length > 0
      ? `This will run ${steps.length} step${steps.length === 1 ? '' : 's'} as forked agents. Steps with dependencies wait for their parents to complete.`
      : 'No steps defined.'

  return (
    <PermissionDialog title={title} workerBadge={workerBadge}>
      <Box flexDirection="column" gap={1}>
        <Text>{subtitle}</Text>

        {steps.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Steps:</Text>
            {steps.map((step, i) => (
              <Box key={step.name} flexDirection="row" gap={1}>
                <Text dimColor>{i + 1}.</Text>
                <Text>{step.name}</Text>
                {step.depends_on && step.depends_on.length > 0 && (
                  <Text dimColor>(after: {step.depends_on.join(', ')})</Text>
                )}
              </Box>
            ))}
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>
            {figures.warning} Workflow steps run as forked agents with their own tool access.
          </Text>
        </Box>
      </Box>
    </PermissionDialog>
  )
}
