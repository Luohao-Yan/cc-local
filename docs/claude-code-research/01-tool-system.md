# 01 - Tool System

## Overview

Claude Code v2.1.141 implements a comprehensive tool system with 18+ built-in tools, MCP (Model Context Protocol) integration for external tools, and a sophisticated permission/authorization framework.

## Built-in Tool Categories

Tools are organized into four categories based on their function and permission requirements:

### Read-Only Tools
| Tool | Variable | Description |
|---|---|---|
| Read | `Ik.name` | Reads files from the local filesystem (text, images, PDFs, Jupyter notebooks) |
| Glob | `cZ.name` | Fast file pattern matching using glob patterns |
| Grep | `XL.name` | Text search using regex patterns (ripgrep-based) |
| WebFetch | `of.name` | Fetches content from a specified URL and processes it using an AI model |
| WebSearch | `sZ.name` | Search the web for information (US-only) |
| ListMcpResources | `Fn.name` | Lists available MCP resources from connected servers |
| ReadMcpResource | `V36.name` | Reads a specific MCP resource by URI |
| TaskGet | `K36.name` | Gets the status of a background task |
| TaskList | `G36.name` | Lists all tasks with their statuses |
| TaskOutput | `Z7H.name` | Gets the output from a running/completed task |
| AskUserQuestion | `y4H.name` | Asks the user multiple choice questions for clarification |

### Edit Tools
| Tool | Variable | Description |
|---|---|---|
| Edit | `$M.name` | Performs string replacement in a file (exact match) |
| Write | `N3.name` | Writes a file to the local filesystem |
| NotebookEdit | `gk.name` | Edits cells in Jupyter notebooks (replace/insert/delete) |

### Execution Tools
| Tool | Variable | Description |
|---|---|---|
| Bash | `x7.name` | Executes bash commands with optional timeout |
| PowerShell | _(Windows)_ | Executes PowerShell commands with optional timeout |

### Agent/Orchestration Tools
| Tool | Variable | Description |
|---|---|---|
| Agent | - | Spawns sub-agents with custom system prompts and tool restrictions |
| TaskCreate | - | Creates a tracking task with metadata |
| TaskUpdate | - | Updates task status, adds dependencies |
| TaskStop | - | Stops a running background task |
| EnterWorktree | - | Creates/isolates a git worktree session |
| ExitWorktree | - | Exits a worktree session (keep or remove) |
| EnterPlanMode | - | Enters plan-only mode |
| ExitPlanMode | - | Exits plan mode with optional permission declarations |
| Skill | - | Invokes a named skill/command |
| LSP | - | Language Server Protocol integration |
| TodoWrite | - | Updates the todo list |
| MCP | - | Calls an MCP server tool (dynamic) |

### ToolSearch (Discovery System)
| Tool | Description |
|---|---|
| ToolSearch | Searches for available tools, supports `select:<tool_name>` for direct selection or keyword search |

## Tool Input Schemas

All tool inputs are validated using **Zod schemas**. Key schemas from `sdk-tools.d.ts`:

### Bash
```
command: string              # The command to execute
timeout?: number             # Max 600000ms (10 minutes)
description?: string         # Human-readable description
run_in_background?: boolean  # Background execution
dangerouslyDisableSandbox?: boolean  # Sandbox bypass
```

### Read
```
file_path: string            # Absolute path to read
offset?: number              # Start line (for large files)
limit?: number               # Number of lines
pages?: string               # PDF page range (e.g., "1-5")
```

### Edit
```
file_path: string            # Absolute path
old_string: string           # Text to find
new_string: string           # Replacement text
replace_all?: boolean        # Replace all occurrences
```

### Write
```
file_path: string            # Absolute path
content: string              # File content
```

### Glob
```
pattern: string              # Glob pattern (e.g., "**/*.ts")
path?: string                # Search directory
```

### Grep
```
pattern: string              # Regex pattern
path?: string                # Search directory/file
glob?: string                # File filter (e.g., "*.js")
output_mode?: "content" | "files_with_matches" | "count"
-B?: number                  # Lines before match
-A?: number                  # Lines after match
-C?: number                  # Context lines
-i?: boolean                 # Case insensitive
head_limit?: number          # Max results (default 250)
offset?: number              # Skip first N
multiline?: boolean          # Multiline mode
type?: string                # File type (js, py, rust, go, java, etc.)
```

### Agent
```
description: string          # Short 3-5 word description
prompt: string               # Task for the agent
subagent_type?: string       # Specialized agent type
model?: "sonnet" | "opus" | "haiku"
run_in_background?: boolean
name?: string                # Addressable via SendMessage
team_name?: string
mode?: "acceptEdits" | "auto" | "bypassPermissions" | "default" | "dontAsk" | "plan"
isolation?: "worktree"
```

### AskUserQuestion
```
questions: [{
  question: string,
  header: string,            # Max 12 chars
  options: [{
    label: string,           # 1-5 words
    description: string,
    preview?: string
  }][2-4],                   # 2-4 options per question
  multiSelect: boolean
}][1-4]                      # 1-4 questions
```

### TaskCreate
```
subject: string              # Brief title
description: string          # What needs to be done
activeForm?: string          # Spinner text (e.g., "Running tests")
metadata?: { [k: string]: unknown }
```

### TaskUpdate
```
taskId: string
subject?: string
description?: string
activeForm?: string
status?: "pending" | "in_progress" | "completed" | "deleted"
addBlocks?: string[]         # Task IDs this blocks
addBlockedBy?: string[]      # Task IDs blocking this
owner?: string
metadata?: { [k: string]: unknown }
```

### NotebookEdit
```
notebook_path: string        # Absolute path
cell_id?: string             # Cell to edit/insert after
new_source: string           # New cell content
cell_type?: "code" | "markdown"
edit_mode?: "replace" | "insert" | "delete"
```

### ExitPlanMode
```
allowedPrompts?: {
  tool: "Bash",
  prompt: string             # Semantic description
}[]
```

### EnterWorktree
```
name?: string                # New worktree name
path?: string                # Existing worktree path
```

### ExitWorktree
```
action: "keep" | "remove"    # Keep or delete worktree
discard_changes?: boolean    # Required when removing with uncommitted files
```

## Tool Registration Architecture

### Tool Categories (from source)
```javascript
function X2_() {
  return {
    READ_ONLY: {
      name: "Read-only tools",
      toolNames: new Set([
        Ik.name, cZ.name, XL.name, of.name, sZ.name,
        Fn.name, V36.name, K36.name, G36.name,
        Z7H.name, y4H.name
      ])
    },
    EDIT: {
      name: "Edit tools",
      toolNames: new Set([$M.name, N3.name, gk.name])
    },
    EXECUTION: {
      name: "Execution tools",
      toolNames: new Set([x7.name])  // + PowerShell on Windows
    },
    MCP: {
      name: "MCP tools",
      toolNames: new Set(),
      isMcp: true
    },
    OTHER: {
      name: "Other tools",
      toolNames: new Set()
    }
  }
}
```

### Tool Definition Pattern
Each tool follows the `Z$()` factory pattern:
```javascript
Z$({
  name: "ToolName",
  searchHint: "brief hint for tool search",
  maxResultSizeChars: 100000,
  async description() { return "..."; },
  async prompt() { return "..."; },
  get inputSchema() { return zodSchema; },
  get outputSchema() { return zodSchema; },
  userFacingName(input) { return "..."; },
  shouldDefer: true/false,
  isDestructive(input) { return false; },
  toAutoClassifierInput(input) { return input; },
  async validateInput(input) { return { result: true/false, message: "..." }; },
})
```

## Tool Permission System

### Permission Decision Types
- `allow` - Tool is automatically approved
- `deny` - Tool is automatically rejected
- `ask` - User is prompted for approval

### Permission Context
Each tool call evaluates permissions based on:
1. **Tool name** - Which tool is being called
2. **Tool input** - Specific parameters (e.g., Bash command, file path)
3. **Permission mode** - Current mode (default, auto, plan, etc.)
4. **Config rules** - User/workspace settings (allow/deny patterns)
5. **Auto mode classifier** - LLM-based classifier for auto mode decisions

### Permission Decision Reason
- `Allowed by config rule: <rule>`
- `Allowed by auto mode classifier`
- `Denied by config rule`
- `Denied by organization policy`
- `User approved`

### PreToolUse Hook Fields
```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "ls" },
  "permissionDecision": "allow" | "deny" | "ask",
  "permissionDecisionReason": "...",
  "updatedInput": { ... }  // Modified input (PreToolUse only)
}
```

### PostToolUse Hook Fields
```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "ls" },
  "tool_response": { "success": true }
}
```

## Tool Execution Flow

```
1. LLM returns tool_use block
   ↓
2. Query Engine receives tool_use
   ↓
3. Tool lookup by name (built-in → MCP → ToolSearch)
   ↓
4. Input validation (Zod schema)
   ↓
5. PreToolUse hooks execution
   ├── Hook can: allow, deny, modify input
   ↓
6. Permission check
   ├── Config rules (allow/deny patterns)
   ├── Auto mode classifier (if applicable)
   ├── User prompt (if no auto decision)
   ↓
7. Tool execution
   ├── Synchronous tools: yield result
   ├── Background tools: yield progress, continue
   ├── Agent tools: spawn sub-agent, yield progress
   ↓
8. PostToolUse hooks execution
   ↓
9. Return tool_result to LLM
```

## Tool Progress System

Tools can emit progress events during long-running operations:

### Bash/PowerShell Progress
```javascript
{
  type: "tool_progress",
  tool_use_id: "...",
  tool_name: "Bash" | "PowerShell",
  parent_tool_use_id: "...",
  elapsed_time_seconds: 123,
  task_id: "...",
  session_id: "..."
}
```

### Monitor Tool (Background Watching)
A specialized monitoring tool for watching file changes, log tails, and process states:
- Supports `persistent: true` for session-length watches
- Uses grep filtering for selective output
- Auto-batches stdout lines within 200ms windows
- Killable via `TaskStop`

### Agent Output Tracking
Background agents report progress through output files:
```javascript
// AgentOutput tool retrieves async agent status
{
  agentId: "...",
  status: "completed" | "async_launched",
  outputFile: "/path/to/progress.json"
}
```

## Deferred Tools (ToolSearch)

Some tools are **deferred** - they are not included in the initial tool list sent to the LLM but can be discovered via `ToolSearch`:

- Reduces initial prompt size (tool definitions consume tokens)
- ToolSearch accepts `select:<tool_name>` for direct loading
- Supports keyword search for discovery
- Commonly deferred: MCP tools, specialized agent types

## Key Implementation Details

1. **Tool Use ID Tracking**: Each tool call gets a unique `tool_use_id` for pairing with `tool_result`
2. **Pairing Validation**: Strict mode validates that `tool_use` and `tool_result` blocks are properly paired
3. **Timeout Management**: Bash commands default to 2-minute timeout, max 10 minutes
4. **Sandbox**: Tools can be sandboxed (disabled via `dangerouslyDisableSandbox`)
5. **Background Execution**: `run_in_background` for async operations with notifications
6. **Fork/Direct Execution**: Agent tools can fork into new contexts or execute directly
7. **Tool Stats Tracking**: Read count, search count, bash count, edit file count, lines added/removed
