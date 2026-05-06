// locales/en/permissions.ts
export const permissions = {
  "toolUse": "Tool use",
  "yes": "Yes",
  "no": "No",
  "yesAlways": "Yes, always",
  "noAlways": "No, always",
  "allow": "Allow",
  "deny": "Deny",
  "allowOnce": "Allow once",
  "denyOnce": "Deny once",
  "allowAll": "Allow all",
  "denyAll": "Deny all",
  "editFile": "Edit file",
  "runCommand": "Run command",
  "command": "Command:",
  "file": "File:",
  "directory": "Directory:"
}

export const trust = {
  "accessingWorkspace": "Accessing workspace:",
  "safetyCheck": "Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team). If not, take a moment to review what's in this folder first.",
  "permissionWarning": "Claude Code'll be able to read, edit, and execute files here.",
  "securityGuide": "Security guide",
  "yesTrust": "Yes, I trust this folder",
  "noExit": "No, exit",
  "pressAgainExit": "Press {key} again to exit",
  "confirmHint": "Enter to confirm · Esc to cancel"
}

export const bypass = {
  "title": "WARNING: Claude Code running in Bypass Permissions mode",
  "warning": "In Bypass Permissions mode, Claude Code will not ask for your approval before running potentially dangerous commands.",
  "restriction": "This mode should only be used in a sandboxed container/VM that has restricted internet access and can easily be restored if damaged.",
  "responsibility": "By proceeding, you accept all responsibility for actions taken while running in Bypass Permissions mode.",
  "noExit": "No, exit",
  "yesAccept": "Yes, I accept"
}

export const shell = {
  "yesAllowAccess": "Yes, and always allow access to {path}",
  "yesAllowAccessMultiple": "Yes, and always allow access from this project to {paths}",
  "yesAllowRead": "Yes, allow reading {paths} from this project",
  "yesAllowCommand": "Yes, and always allow running {command} in this project",
  "yesAllowCommands": "Yes, and always allow running these commands in this project"
}
