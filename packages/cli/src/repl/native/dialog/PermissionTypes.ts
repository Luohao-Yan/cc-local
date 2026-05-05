/**
 * Permission Dialog Types
 *
 * Defines all permission request types for the Native REPL,
 * matching the Ink UI's permission system.
 */

/** Permission mode type (mirrored from shared) */
export type PermissionMode = 'default' | 'auto' | 'plan'

/** Permission decision result */
export interface PermissionDecision {
  /** Whether the tool use is allowed */
  allowed: boolean
  /** Whether to create a persistent rule */
  dontAskAgain: boolean
  /** Optional reason for the decision */
  reason?: string
}

/** Base permission request */
export interface BasePermissionRequest {
  /** Unique request ID */
  id: string
  /** Tool name */
  toolName: string
  /** Tool input */
  input: unknown
  /** Permission mode context */
  mode: PermissionMode
  /** Description of what the tool will do */
  description: string
  /** Timestamp of the request */
  timestamp: number
}

/** Bash command permission request */
export interface BashPermissionRequest extends BasePermissionRequest {
  toolName: 'bash'
  input: {
    command: string
    timeout?: number
  }
  /** Whether classifier matched (auto-mode) */
  classifierAutoApproved?: boolean
  /** Classifier matched rule */
  classifierMatchedRule?: string
}

/** File edit permission request */
export interface FileEditPermissionRequest extends BasePermissionRequest {
  toolName: 'file_edit'
  input: {
    file_path: string
    old_string: string
    new_string: string
  }
  /** Diff preview */
  diffPreview?: string
}

/** File write permission request */
export interface FileWritePermissionRequest extends BasePermissionRequest {
  toolName: 'file_write'
  input: {
    file_path: string
    content: string
  }
}

/** File read permission request (filesystem) */
export interface FilesystemPermissionRequest extends BasePermissionRequest {
  toolName: 'file_read' | 'glob' | 'grep'
  input: {
    file_path?: string
    pattern?: string
    path?: string
  }
}

/** Web fetch permission request */
export interface WebFetchPermissionRequest extends BasePermissionRequest {
  toolName: 'web_fetch'
  input: {
    url: string
    prompt?: string
  }
}

/** Notebook edit permission request */
export interface NotebookEditPermissionRequest extends BasePermissionRequest {
  toolName: 'notebook_edit'
  input: {
    notebook_path: string
    cell_number: number
    new_source: string
  }
}

/** Enter plan mode permission request */
export interface EnterPlanModePermissionRequest extends BasePermissionRequest {
  toolName: 'enter_plan_mode'
  input: Record<string, unknown>
}

/** Exit plan mode permission request */
export interface ExitPlanModePermissionRequest extends BasePermissionRequest {
  toolName: 'exit_plan_mode'
  input: Record<string, unknown>
  /** Plan content for review */
  planContent?: string
}

/** Skill execution permission request */
export interface SkillPermissionRequest extends BasePermissionRequest {
  toolName: 'skill'
  input: {
    skill_name: string
    input?: string
  }
}

/** PowerShell command permission request */
export interface PowerShellPermissionRequest extends BasePermissionRequest {
  toolName: 'powershell'
  input: {
    command: string
  }
}

/** Ask user question permission request */
export interface AskUserQuestionPermissionRequest extends BasePermissionRequest {
  toolName: 'ask_user_question'
  input: {
    question: string
  }
}

/** Fallback permission request for unknown tools */
export interface FallbackPermissionRequest extends BasePermissionRequest {
  toolName: string
}

/** Union type of all permission requests */
export type PermissionRequest =
  | BashPermissionRequest
  | FileEditPermissionRequest
  | FileWritePermissionRequest
  | FilesystemPermissionRequest
  | WebFetchPermissionRequest
  | NotebookEditPermissionRequest
  | EnterPlanModePermissionRequest
  | ExitPlanModePermissionRequest
  | SkillPermissionRequest
  | PowerShellPermissionRequest
  | AskUserQuestionPermissionRequest
  | FallbackPermissionRequest

/** Permission request type guard */
export function isBashPermission(req: PermissionRequest): req is BashPermissionRequest {
  return req.toolName === 'bash'
}

export function isFileEditPermission(req: PermissionRequest): req is FileEditPermissionRequest {
  return req.toolName === 'file_edit'
}

export function isFileWritePermission(req: PermissionRequest): req is FileWritePermissionRequest {
  return req.toolName === 'file_write'
}

export function isFilesystemPermission(req: PermissionRequest): req is FilesystemPermissionRequest {
  return ['file_read', 'glob', 'grep'].includes(req.toolName)
}

export function isWebFetchPermission(req: PermissionRequest): req is WebFetchPermissionRequest {
  return req.toolName === 'web_fetch'
}

export function isExitPlanModePermission(req: PermissionRequest): req is ExitPlanModePermissionRequest {
  return req.toolName === 'exit_plan_mode'
}
