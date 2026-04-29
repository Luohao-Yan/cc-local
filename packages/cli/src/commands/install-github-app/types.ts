/** Types for GitHub app install wizard. */

export type Workflow = 'claude' | 'claude-review'

export interface Warning {
  title: string
  message: string
  instructions: string[]
  [key: string]: unknown
}

export interface State {
  step: string
  selectedRepoName: string
  currentRepo: string
  useCurrentRepo: boolean
  apiKeyOrOAuthToken: string
  useExistingKey: boolean
  currentWorkflowInstallStep: number
  warnings: Warning[]
  secretExists: boolean
  secretName: string
  useExistingSecret: boolean
  workflowExists: boolean
  selectedWorkflows: Workflow[]
  selectedApiKeyOption: 'existing' | 'new' | 'oauth'
  authType: string
  error?: string
  errorReason?: string
  errorInstructions?: string[]
  [key: string]: unknown
}
