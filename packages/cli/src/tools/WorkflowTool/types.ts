/** Stub shared types for Workflow tool (folder gated by WORKFLOW_SCRIPTS). */

export type WorkflowScriptRunId = string

export type WorkflowToolInvocation = {
  runId: WorkflowScriptRunId
  stepIndex: number
}
