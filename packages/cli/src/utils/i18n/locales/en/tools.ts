// locales/en/tools.ts
export const toolSelector = {
  "hint": "Select tools this agent can use.",
  "allTools": "All tools",
  "allSelected": "All {count} tools selected",
  "selected": "{count}/{total} tools selected"
}

export const tool = {
  "executionFailed": "Tool execution failed",
  "invalidParams": "Invalid tool parameters"
}

// Bash tool
export const bash = {
  "runInBackground": "run in background",
  "running": "Running…",
  "waiting": "Waiting…"
}

// Agent tool UI strings (prefixed to avoid collision with agent.ts module)
export const agentTool = {
  "prompt": "Prompt:",
  "response": "Response:",
  "remoteAgentLaunched": "Remote agent launched",
  "backgroundedAgent": "Backgrounded agent",
  "manage": "manage",
  "expand": "expand",
  "toolUse": "{count} tool use",
  "toolUses": "{count} tool uses",
  "tokens": "tokens",
  "done": "Done",
  "initializing": "Initializing…",
  "inProgress": "In progress…",
  "moreToolUse": "more tool use",
  "moreToolUses": "more tool uses",
  "backgroundAgentsLaunched": "background agents launched",
  "agentsFinished": "agents finished",
  "agents": "agents",
  "running": "Running",
  "agentsEllipsis": "agents…",
  "agentLabel": "Agent"
}

// Brief tool
export const brief = {
  "claude": "Claude",
  "image": "[image]",
  "file": "[file]"
}

// FileRead tool
export const fileRead = {
  "pages": "· pages {pages}",
  "linesRange": "lines {start}-{end}",
  "fromLine": "from line {start}",
  "readImage": "Read image",
  "noCellsFound": "No cells found in notebook",
  "readCell": "Read",
  "cells": "cells",
  "cell": "cell",
  "readPdf": "Read PDF",
  "page": "page",
  "pages_": "pages",
  "readFile": "Read",
  "line": "line",
  "lines_": "lines",
  "unchangedSinceLastRead": "Unchanged since last read",
  "fileNotFound": "File not found",
  "errorReadingFile": "Error reading file",
  "readingPlan": "Reading Plan",
  "readAgentOutput": "Read agent output",
  "read": "Read"
}

// FileWrite tool
export const fileWrite = {
  "noContent": "(No content)",
  "wroteLinesTo": "Wrote {count} lines to {path} ",
  "plusLine": "line",
  "plusLines": "lines",
  "updatedPlan": "Updated plan",
  "write": "Write",
  "noChanges": "(No changes)",
  "errorWritingFile": "Error writing file",
  "planToPreview": "/plan to preview",
  "overwrite": "overwrite",
  "create": "create",
  "overwriteTitle": "Overwrite file",
  "createTitle": "Create file",
  "doYouWantTo": "Do you want to"
}

// FileEdit tool
export const fileEdit = {
  "update": "Update",
  "updatedPlan": "Updated plan",
  "create": "Create",
  "planToPreview": "/plan to preview",
  "fileMustBeReadFirst": "File must be read first",
  "fileNotFound": "File not found",
  "stringNotFoundInFile": "String not found in file — the text doesn't match current content",
  "fileWasModifiedAfterLastRead": "File was modified after last read — read it again before editing",
  "multipleMatchesFound": "Multiple matches found — set replace_all:true or provide more context",
  "fileAlreadyExists": "File already exists — use Update instead of Create",
  "fileTooLargeToEdit": "File too large to edit",
  "errorEditingFile": "Error editing file"
}

// Glob tool
export const glob = {
  "search": "Search",
  "pattern": "pattern: \"{pattern}\"",
  "patternWithPath": "pattern: \"{pattern}\", path: \"{path}\"",
  "fileNotFound": "File not found",
  "errorSearchingFiles": "Error searching files"
}

// Grep tool
export const grep = {
  "found": "Found",
  "across": "across",
  "files": "files",
  "pattern": "pattern: \"{pattern}\"",
  "path": "path: \"{path}\"",
  "fileNotFound": "File not found",
  "errorSearchingFiles": "Error searching files",
  "lines": "lines",
  "matches": "matches",
  "line_": "line"
}

// LSP tool
export const lsp = {
  "definition": "definition",
  "definitions": "definitions",
  "reference": "reference",
  "references": "references",
  "symbol": "symbol",
  "symbols": "symbols",
  "hoverInfo": "hover info",
  "hoverInfoAvailable": "available",
  "implementation": "implementation",
  "implementations": "implementations",
  "callItem": "call item",
  "callItems": "call items",
  "caller": "caller",
  "callers": "callers",
  "callee": "callee",
  "callees": "callees",
  "result": "result",
  "results": "results",
  "hoverInfoLabel": "Hover info",
  "found": "Found",
  "across": "across",
  "files": "files",
  "lspLabel": "LSP",
  "operation": "operation: \"{operation}\"",
  "symbolQuery": "symbol: \"{symbol}\"",
  "inQuery": "in: \"{path}\"",
  "fileQuery": "file: \"{path}\"",
  "positionQuery": "position: {line}:{character}",
  "lspOperationFailed": "LSP operation failed"
}

// MCP tool UI strings (prefixed to avoid collision with mcp.ts module)
export const mcpTool = {
  "running": "Running…",
  "processing": "Processing… {progress}",
  "sentMessageTo": "Sent a message to",
  "largeResponseWarning": "⚠ Large MCP response (~{tokens} tokens), this can fill up context quickly",
  "imageBlock": "[Image]",
  "noContent": "(No content)",
  "slack": "slack"
}

// NotebookEdit tool
export const notebookEdit = {
  "errorEditingNotebook": "Error editing notebook",
  "updatedCell": "Updated cell {cellId}:"
}

// Skill tool
export const skill = {
  "initializing": "Initializing…",
  "done": "Done",
  "successfullyLoaded": "Successfully loaded skill",
  "tool": "tool",
  "tools": "tools",
  "allowed": "allowed",
  "moreToolUse": "more tool use",
  "moreToolUses": "more tool uses"
}

// WebFetch tool
export const webFetch = {
  "url": "url: \"{url}\"",
  "prompt": "prompt: \"{prompt}\"",
  "fetching": "Fetching…",
  "received": "Received",
}

// WebSearch tool
export const webSearch = {
  "query": "\"{query}\"",
  "onlyAllowingDomains": "only allowing domains: {domains}",
  "blockingDomains": "blocking domains: {domains}",
  "searching": "Searching: {query}",
  "foundResults": "Found {count} results for \"{query}\"",
  "didSearch": "Did {count} search",
  "searches": "es",
  "in": "in {time}"
}

// Monitor tool
export const monitor = {
  "monitoring": "Monitoring…",
  "exited": "Process exited",
}
