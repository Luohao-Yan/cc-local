// locales/en/screens.ts

// Doctor screen
export const doctor = {
  "checking": "Checking installation status...",
  "diagnostics": "Diagnostics",
  "currentlyRunning": "Currently running:",
  "packageManager": "Package manager:",
  "path": "Path:",
  "invoked": "Invoked:",
  "configInstallMethod": "Config install method:",
  "search": "Search:",
  "searchOk": "OK",
  "searchNotWorking": "Not working",
  "searchBundled": "bundled",
  "searchVendor": "vendor",
  "searchSystem": "system",
  "recommendation": "Recommendation:",
  "warningMultipleInstallations": "Warning: Multiple installations found",
  "installationAt": "at",
  "invalidSettings": "Invalid Settings",
  "updates": "Updates",
  "autoUpdates": "Auto-updates:",
  "managedByPackageManager": "Managed by package manager",
  "updatePermissions": "Update permissions:",
  "updatePermissionsYes": "Yes",
  "updatePermissionsNoSudo": "No (requires sudo)",
  "autoUpdateChannel": "Auto-update channel:",
  "failedToFetchVersions": "Failed to fetch versions",
  "stableVersion": "Stable version:",
  "latestVersion": "Latest version:",
  "environmentVariables": "Environment Variables",
  "versionLocks": "Version Locks",
  "cleanedStaleLocks": "Cleaned {count} stale lock(s)",
  "noActiveVersionLocks": "No active version locks",
  "agentParseErrors": "Agent Parse Errors",
  "failedToParseAgentFiles": "Failed to parse {count} agent file(s):",
  "pluginErrors": "Plugin Errors",
  "pluginErrorsDetected": "{count} plugin error(s) detected:",
  "unreachablePermissionRules": "Unreachable Permission Rules",
  "contextUsageWarnings": "Context Usage Warnings",
  "files": "Files:",
  "topContributors": "Top contributors:",
  "mcpServers": "MCP servers:",
  "warning": "Warning:",
  "fix": "Fix:",
  "running": "(running)",
  "stale": "(stale)",
  "dismissed": "Claude Code diagnostics dismissed",
}

// ResumeConversation screen
export const resume = {
  "loading": "Loading conversations…",
  "resuming": "Resuming conversation…",
  "noConversations": "No conversations found to resume.",
  "pressCtrlC": "Press Ctrl+C to exit and start a new conversation.",
  "differentDirectory": "This conversation is from a different directory.",
  "toResumeRun": "To resume, run:",
  "commandCopied": "(Command copied to clipboard)",
  "failedToLoad": "Failed to load conversation",
}

// REPL screen
export const repl = {
  // Transcript footer
  "showingTranscript": "Showing detailed transcript",
  "toToggle": "to toggle",
  "navigate": "n/N to navigate",
  "scroll": "scroll",
  "homeEnd": "home/end top/bottom",
  "collapse": "collapse",
  "showAll": "show all",

  // Search
  "indexing": "indexing…",
  "indexedIn": "indexed in {ms}ms",
  "noMatches": "no matches",

  // Session status
  "approve": "approve",
  "workerRequest": "worker request",
  "sandboxRequest": "sandbox request",
  "dialogOpen": "dialog open",
  "inputNeeded": "input needed",

  // Notifications
  "sandboxDisabled": "sandbox disabled",
  "sandboxCommand": "/sandbox",
  "sandboxRequired": "Error: sandbox required but unavailable: {reason}",
  "sandboxRefuse": "sandbox.failIfUnavailable is set — refusing to start without a working sandbox.",
  "sandboxError": "Sandbox Error:",
  "failedToResumeAgent": "Failed to resume agent:",
  "copied": "copied",
  "waitingForInput": "Claude is waiting for your input",
  "newTask": "new task?",
  "clearCommand": "/clear",
  "toSave": "to save",
  "tokens": "tokens",
  "suspended": "Claude Code has been suspended. Run `fg` to bring Claude Code back.",
  "suspendNote": "Note: ctrl + z now suspends Claude Code, ctrl + _ undoes input.",
  "conversationSummarized": "Conversation summarized ({shortcut} for history)",
  "snippedMessage": "That message is no longer in the active context (snipped or pre-compact). Choose a more recent message.",
  "networkConnectionQuestion": "Allow network connection to {host}?",
  "networkAccessTool": "Network Access",
  "waitingForLeader": "Waiting for leader to approve network access to {host}",
  "rendering": "rendering",
  "messages": "messages…",
  "opening": "opening",
  "wrote": "wrote",
  "noEditorSet": "no $VISUAL/$EDITOR set",
  "renderFailed": "render failed:",
  "promptCancelled": "Prompt cancelled by user",

  // Hooks
  "runningHook": "running {hookType} hook",
  "runningHooks": "running stop hooks…",
  "hookSubagentStop": "subagent stop",
  "hookStop": "stop",
  "hook": "hook",

  // Worktree
  "worktreeTip": "Worktree creation took {secs}s. For large repos, set `worktree.sparsePaths` in .claude/settings.json to check out only the directories you need — e.g. `{\"worktree\": {\"sparsePaths\": [\"src\", \"packages/foo\"]}}`.",

  // Feedback survey
  "memoryFeedback": "How well did Claude use its memory? (optional)",
}
