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
  "yesAllowCommands": "Yes, and always allow running these commands in this project",
  "checkingAutoApprove": "Attempting to auto-approve\u2026",
  "autoApproved": "Auto-approved",
  "yes": "Yes",
  "tellClaudeNext": "and tell Claude what to do next",
  "yesDontAskAgain": "Yes, and don\u2019t ask again for",
  "commandPrefix": "command prefix (e.g., npm run:*)",
  "describeWhatToAllow": "describe what to allow...",
  "no": "No",
  "tellClaudeDifferently": "and tell Claude what to do differently"
}

// Enter plan mode dialog
export const enterPlan = {
  "desc": "Claude wants to enter plan mode to explore and design an implementation approach.",
  "inPlanMode": "In plan mode, Claude will:",
  "exploreCodebase": "Explore the codebase thoroughly",
  "identifyPatterns": "Identify existing patterns",
  "designStrategy": "Design an implementation strategy",
  "presentPlan": "Present a plan for your approval",
  "noCodeChanges": "No code changes will be made until you approve the plan.",
  "yesEnterPlan": "Yes, enter plan mode",
  "noStartImplementing": "No, start implementing now",
  "title": "Enter plan mode?"
}

// Exit plan mode dialog
export const exitPlan = {
  "pastedImage": "Pasted image",
  "noPlanFound": "No plan found. Please write your plan to the plan file first.",
  "ultraplanRefining": "Plan being refined via Ultraplan -- please wait for the result.",
  "implementPlan": "Implement the following plan:\n\n",
  "seeAttachedImage": "(See attached image)",
  "wouldYouLikeToProceed": "Would you like to proceed?",
  "ctrlGToEditIn": "ctrl-g to edit in ",
  "planSaved": "Plan saved!",
  "exitPlanTitle": "Exit plan mode?",
  "claudeWantsToExit": "Claude wants to exit plan mode",
  "yes": "Yes",
  "no": "No",
  "readyToCode": "Ready to code?",
  "hereIsClaudesPlan": "Here is Claude's plan:",
  "requestedPermissions": "Requested permissions:",
  "claudeWrittenPlan": "Claude has written up a plan and is ready to execute. Would you like to proceed?",
  "usedPercent": " ({percent}% used)",
  "clearContextAutoMode": "Yes, clear context and use auto mode",
  "clearContextBypass": "Yes, clear context and bypass permissions",
  "clearContextAutoAccept": "Yes, clear context and auto-accept edits",
  "yesAutoMode": "Yes, and use auto mode",
  "yesBypass": "Yes, and bypass permissions",
  "yesAutoAccept": "Yes, auto-accept edits",
  "yesManualApprove": "Yes, manually approve edits",
  "noUltraplan": "No, refine with Ultraplan on Claude Code on the web",
  "noKeepPlanning": "No, keep planning",
  "tellClaudeWhatToChange": "Tell Claude what to change",
  "shiftTabApprove": "shift+tab to approve with this feedback"
}

// Computer Use approval
export const computerUse = {
  "openAccessibility": "Open System Settings \u2192 Accessibility",
  "openScreenRecording": "Open System Settings \u2192 Screen Recording",
  "tryAgain": "Try again",
  "granted": "granted",
  "notGranted": "not granted",
  "accessibility": "Accessibility:",
  "screenRecording": "Screen Recording:",
  "grantMissingPermissions": "Grant the missing permissions in System Settings, then select \"Try again\". macOS may require you to restart Claude Code after granting Screen Recording.",
  "needsMacOSPermissions": "Computer Use needs macOS permissions",
  "shellAccess": "equivalent to shell access",
  "readWriteAnyFile": "can read/write any file",
  "changeSystemSettings": "can change system settings",
  "allowForSession": "Allow for this session ({count} {apps})",
  "denyTellClaude": "Deny, and tell Claude what to do differently",
  "esc": "(esc)",
  "notInstalled": "(not installed)",
  "alreadyGranted": "(already granted)",
  "alsoRequested": "Also requested:",
  "hiddenApps": "{count} other {apps} will be hidden while Claude works.",
  "wantsToControlApps": "Computer Use wants to control these apps"
}

// File edit permission
export const fileEditPerm = {
  "title": "Edit file",
  "doYouWantToMakeEdit": "Do you want to make this edit to"
}

// File write permission
export const fileWritePerm = {
  "overwrite": "overwrite",
  "create": "create",
  "overwriteTitle": "Overwrite file",
  "createTitle": "Create file",
  "doYouWantTo": "Do you want to"
}

// Notebook edit permission
export const notebookEditPerm = {
  "insertCell": "Insert new cell",
  "deleteCell": "Delete cell",
  "replaceCellContents": "Replace cell contents",
  "forCell": " for cell ",
  "title": "Edit notebook",
  "insertThisCell": "insert this cell into",
  "deleteThisCell": "delete this cell from",
  "makeThisEdit": "make this edit to",
  "doYouWantTo": "Do you want to "
}

// Web fetch permission
export const webFetchPerm = {
  "yes": "Yes",
  "yesDontAskAgain": "Yes, and don't ask again for ",
  "noTellClaude": "No, and tell Claude what to do differently ",
  "esc": "(esc)",
  "doYouWantToAllow": "Do you want to allow Claude to fetch this content?",
  "title": "Fetch"
}

// Sandbox/network permission
export const sandboxPerm = {
  "yes": "Yes",
  "yesDontAskAgain": "Yes, and don't ask again for ",
  "noTellClaude": "No, and tell Claude what to do differently ",
  "esc": "(esc)",
  "host": "Host:",
  "doYouWantToAllow": "Do you want to allow this connection?",
  "title": "Network request outside of sandbox"
}

// Skill permission
export const skillPerm = {
  "yes": "Yes",
  "yesDontAskAgainFor": "Yes, and don\u2019t ask again for ",
  "in": " in",
  "commandsIn": " commands in",
  "no": "No",
  "title": "Use skill \"{skill}\"?",
  "warning": "Claude may use instructions, code, or files from this Skill."
}

// Fallback permission
export const fallback = {
  "yesDontAskAgainFor": "Yes, and don't ask again for ",
  "mcp": " (MCP)"
}

// Monitor permission
export const monitorPermission = {
  "toolUse": "Monitor command",
  "yesDontAskAgain": "Yes, and don’t ask again for Monitor commands"
}

// Filesystem permission
export const filesystem = {
  "read": "Read",
  "edit": "Edit",
  "title": "{action} file"
}

// Sed edit permission
export const sedEdit = {
  "fileDoesNotExist": "File does not exist",
  "patternNotMatched": "Pattern did not match any content",
  "doYouWantToMakeEdit": "Do you want to make this edit to",
  "title": "Edit file"
}

// PowerShell permission
export const powershell = {
  "title": "PowerShell command",
  "toolName": "PowerShell",
  "doYouWantToProceed": "Do you want to proceed?",
  "escToCancel": "Esc to cancel",
  "tabToAmend": " \u00b7 Tab to amend",
  "ctrlEToExplain": " \u00b7 ctrl+e to {action}",
  "actionExplain": "explain",
  "actionHide": "hide",
  "ctrlDToHide": "Ctrl-D to hide debug info",
  "ctrlDToShow": "Ctrl+d to show debug info",
  "confirmation": "Confirmation",
  "yes": "Yes",
  "tellClaudeNext": "and tell Claude what to do next",
  "yesDontAskAgain": "Yes, and don\u2019t ask again for",
  "commandPrefix": "command prefix (e.g., Get-Process:*)",
  "no": "No",
  "tellClaudeDifferently": "and tell Claude what to do differently"
}

// Permission prompt
export const prompt = {
  "tellClaudeNext": "tell Claude what to do next",
  "tellClaudeDifferently": "tell Claude what to do differently",
  "doYouWantToProceed": "Do you want to proceed?",
  "confirmation": "Confirmation",
  "tabToAmend": " \u00b7 Tab to amend",
  "escToCancel": "Esc to cancel"
}

// Permission request notifications
export const request = {
  "needsApproval": "Claude Code needs your approval for the plan",
  "wantsToEnterPlan": "Claude Code wants to enter plan mode",
  "needsApprovalReview": "Claude needs your approval for a review artifact",
  "needsAttention": "Claude Code needs your attention",
  "needsPermission": "Claude needs your permission to use {toolName}",
  "confirmation": "Confirmation"
}

// Permission explanation
export const explanation = {
  "loading": "Loading explanation\u2026",
  "lowRisk": "Low risk",
  "medRisk": "Med risk",
  "highRisk": "High risk",
  "unavailable": "Explanation unavailable"
}

// Permission rule explanation
export const ruleExplanation = {
  "autoModeClassifier": "Auto mode classifier requires confirmation for this {toolType}.\n{reason}",
  "classifier": "Classifier {classifier} requires confirmation for this {toolType}.\n{reason}",
  "permissionRule": "Permission rule {rule} requires confirmation for this {toolType}.",
  "permissionsToUpdate": "/permissions to update rules",
  "hook": "Hook {hookName} requires confirmation for this {toolType}{hookReason}{sourceLabel}",
  "hooksToUpdate": "/hooks to update",
  "permissionsToUpdateRules": "/permissions to update rules"
}

// Permission decision debug info
export const debugInfo = {
  "classifier": "{classifier} classifier: {reason}",
  "rule": "{rule} rule from {source}",
  "mode": "{mode} mode",
  "sandbox": "Requires permission to bypass sandbox",
  "tool": "{toolName} permission prompt tool",
  "hook": "{hookName} hook: {reason}",
  "hookNoReason": "{hookName} hook",
  "suggestedRules": "Suggested rules:",
  "none": "None",
  "suggestion": "Suggestion ",
  "suggestions": "Suggestions ",
  "rules": " Rules ",
  "directories": " Directories ",
  "modeCategory": " Mode ",
  "behavior": "behavior ",
  "message": "Message ",
  "reason": "Reason ",
  "undefined": "undefined",
  "unreachableRules": "{icon} Unreachable Rules ({count})",
  "fix": "Fix: "
}

// Worker pending permission
export const workerPending = {
  "waitingForApproval": " Waiting for team lead approval",
  "tool": "Tool: ",
  "action": "Action: ",
  "permissionRequestSent": "Permission request sent to team \"{teamName}\" leader"
}

// Ask user question permission
export const auq = {
  "linesHidden": "{count} lines hidden ",
  "submit": "Submit",
  "reviewAnswers": "Review your answers",
  "notAllAnswered": "{icon} You have not answered all questions",
  "question": "Question",
  "readyToSubmit": "Ready to submit your answers?",
  "submitAnswers": "Submit answers",
  "noPreviewAvailable": "No preview available",
  "notes": "Notes:",
  "addNotes": "Add notes on this design\u2026",
  "pressNToAddNotes": "press n to add notes",
  "chatAboutThis": "Chat about this",
  "skipInterview": "Skip interview and plan immediately",
  "enterToSelect": "Enter to select",
  "nToAddNotes": "n to add notes",
  "tabToSwitch": "Tab to switch questions",
  "ctrlGToEditIn": "ctrl+g to edit in {editorName}",
  "escToCancel": "Esc to cancel",
  "toNavigate": "{arrowUp}/{arrowDown} to navigate",
  "tabArrowsToNavigate": "Tab/Arrow keys to navigate",
  "typeSomething": "Type something",
  "other": "Other",
  "planning": "Planning:",
  "next": "Next",
  "pastedImage": "Pasted image",
  "noAnswerProvided": "(No answer provided)",
  "imageAttached": "(Image attached)",
  "clarifyFeedback": "The user wants to clarify these questions.\n    This means they may have additional information, context or questions for you.\n    Take their response into account and then reformulate the questions if appropriate.\n    Start by asking them what they would like to clarify.\n\n    Questions asked:\n{questionsWithAnswers}",
  "finishPlanFeedback": "The user has indicated they have provided enough answers for the plan interview.\nStop asking clarifying questions and proceed to finish the plan with the information you have.\n\nQuestions asked and answers provided:\n{questionsWithAnswers}"
}

// Permission rules management
export const rules = {
  "projectSettingsLocal": "Project settings (local)",
  "savedIn": "Saved in {path}",
  "projectSettings": "Project settings",
  "checkedInAt": "Checked in at {path}",
  "userSettings": "User settings",
  "savedInHome": "Saved in at ~/.claude/settings.json",
  "rule": "rule",
  "addPermission": "Add {behavior} permission {ruleCount}",
  "whereToSaveRule": "Where should this rule be saved?",
  "whereToSaveRules": "Where should these rules be saved?",
  "yesForThisSession": "Yes, for this session",
  "yesAndRemember": "Yes, and remember this directory",
  "no": "No",
  "willHaveAccess": "Claude Code will be able to read files in this directory and make edits when auto-accept edits is on.",
  "enterPath": "Enter the path to the directory:",
  "directoryPath": "Directory path{ellipsis}",
  "addDirectoryTitle": "Add directory to workspace",
  "pressAgainToExit": "Press {key} again to exit",
  "anyBashCommandStarting": "Any Bash command starting with",
  "theBashCommand": "The Bash command",
  "anyBashCommand": "Any Bash command",
  "anyUseOfThe": "Any use of the",
  "tool": "tool",
  "or": " or ",
  "permissionRulesDescription": "Permission rules are a tool name, optionally followed by a specifier in parentheses.",
  "enterPermissionRule": "Enter permission rule{ellipsis}",
  "from": "From {source}",
  "allowed": "allowed",
  "denied": "denied",
  "ask": "ask",
  "ruleDetails": "Rule details",
  "managedRuleMessage": "This rule is configured by managed settings and cannot be modified.\nContact your system administrator for more information.",
  "deleteTool": "Delete {tool} tool?",
  "areYouSureDelete": "Are you sure you want to delete this permission rule?",
  "willNotAskBeforeUsing": "Claude Code won't ask before using allowed tools.",
  "willAlwaysAsk": "Claude Code will always ask for confirmation before using these tools.",
  "willAlwaysReject": "Claude Code will always reject requests to use denied tools.",
  "noRecentDenials": "No recent denials. Commands denied by the auto mode classifier will appear here.",
  "retry": " (retry)",
  "recentlyDenied": "Commands recently denied by the auto mode classifier.",
  "willNoLongerHaveAccess": "Claude Code will no longer have access to files in this directory.",
  "removeDirectoryTitle": "Remove directory from workspace?",
  "workspaceDialogDismissed": "Workspace dialog dismissed",
  "addDirectory": "Add directory{ellipsis}",
  "originalWorkingDirectory": "(Original working directory)",
  "yes": "Yes",
  "escToCancel": "Esc to cancel",
  "recentlyDeniedTab": "Recently denied",
  "workspaceTab": "Workspace",
  "permissionsDialogDismissed": "Permissions dialog dismissed"
}
