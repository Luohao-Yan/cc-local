# 08 - SDK Integration

## Overview

Claude Code ships a `sdk-tools.d.ts` file that exports TypeScript type definitions for all tool input and output schemas. This enables the **Claude Agent SDK** to integrate with Claude Code's tool system programmatically.

## Tool Input/Output Schema Types

The SDK exports a union type system for tool schemas:

```typescript
// All possible tool input types
export type ToolInputSchemas =
  | AgentInput
  | BashInput
  | TaskOutputInput
  | ExitPlanModeInput
  | FileEditInput
  | FileReadInput
  | FileWriteInput
  | GlobInput
  | GrepInput
  | TaskStopInput
  | ListMcpResourcesInput
  | McpInput
  | NotebookEditInput
  | ReadMcpResourceInput
  | TodoWriteInput
  | WebFetchInput
  | WebSearchInput
  | AskUserQuestionInput
  | TaskCreateInput
  | TaskGetInput
  | TaskUpdateInput
  | TaskListInput
  | EnterWorktreeInput
  | ExitWorktreeInput

// All possible tool output types
export type ToolOutputSchemas =
  | AgentOutput
  | BashOutput
  | ExitPlanModeOutput
  | FileEditOutput
  | FileReadOutput
  | FileWriteOutput
  | GlobOutput
  | GrepOutput
  | TaskStopOutput
  | ListMcpResourcesOutput
  | McpOutput
  | NotebookEditOutput
  | ReadMcpResourceOutput
  | TodoWriteOutput
  | WebFetchOutput
  | WebSearchOutput
  | AskUserQuestionOutput
  | EnterWorktreeOutput
  | ExitWorktreeOutput
  | TaskCreateOutput
  | TaskGetOutput
  | TaskUpdateOutput
  | TaskListOutput
```

## Complete Tool Input Interfaces

### AgentInput (SubAgent spawning)

```typescript
export interface AgentInput {
  description: string;           // Short 3-5 word description
  prompt: string;                // Task for the agent
  subagent_type?: string;        // Specialized agent type
  model?: "sonnet" | "opus" | "haiku";  // Model override
  run_in_background?: boolean;   // Background execution
  name?: string;                 // Addressable name for SendMessage
  team_name?: string;            // Team context
  mode?: "acceptEdits" | "auto" | "bypassPermissions" | "default" | "dontAsk" | "plan";
  isolation?: "worktree";        // Isolation mode
}
```

### AgentOutput (Two possible states)

```typescript
// Completed agent
export type AgentOutput = {
  agentId: string;
  agentType?: string;
  content: { type: "text"; text: string }[];
  totalToolUseCount: number;
  totalDurationMs: number;
  totalTokens: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number | null;
    cache_read_input_tokens: number | null;
    server_tool_use: {
      web_search_requests: number;
      web_fetch_requests: number;
    } | null;
    service_tier: ("standard" | "priority" | "batch") | null;
    cache_creation: {
      ephemeral_1h_input_tokens: number;
      ephemeral_5m_input_tokens: number;
    } | null;
  };
  toolStats?: {
    readCount: number;
    searchCount: number;
    bashCount: number;
    editFileCount: number;
    linesAdded: number;
    linesRemoved: number;
    otherToolCount: number;
  };
  status: "completed";
  prompt: string;
}
// OR async launched
| {
  status: "async_launched";
  agentId: string;
  description: string;
  prompt: string;
  outputFile: string;           // Path to check progress
  canReadOutputFile?: boolean;
}
```

### BashInput

```typescript
export interface BashInput {
  command: string;               // Command to execute
  timeout?: number;             // Max 600000ms
  description?: string;        // Human-readable description
  run_in_background?: boolean;
  dangerouslyDisableSandbox?: boolean;
}
```

### FileEditInput

```typescript
export interface FileEditInput {
  file_path: string;           // Absolute path
  old_string: string;          // Text to replace
  new_string: string;          // Replacement text
  replace_all?: boolean;       // Replace all occurrences
}
```

### FileReadInput

```typescript
export interface FileReadInput {
  file_path: string;           // Absolute path
  offset?: number;            // Start line
  limit?: number;             // Number of lines
  pages?: string;             // PDF page range (e.g., "1-5")
}
```

### FileWriteInput

```typescript
export interface FileWriteInput {
  file_path: string;           // Absolute path
  content: string;            // File content
}
```

### GlobInput

```typescript
export interface GlobInput {
  pattern: string;            // Glob pattern
  path?: string;              // Search directory
}
```

### GrepInput

```typescript
export interface GrepInput {
  pattern: string;            // Regex pattern
  path?: string;              // Search directory/file
  glob?: string;              // File filter (e.g. "*.js")
  output_mode?: "content" | "files_with_matches" | "count";
  "-B"?: number;             // Lines before
  "-A"?: number;             // Lines after
  "-C"?: number;             // Context lines
  context?: number;          // Alias for -C
  "-n"?: boolean;            // Line numbers (default true)
  "-i"?: boolean;            // Case insensitive
  "-o"?: boolean;            // Only matching parts
  type?: string;             // File type (js, py, rust, etc.)
  head_limit?: number;       // Max results (default 250)
  offset?: number;           // Skip first N
  multiline?: boolean;       // Multiline mode
}
```

### TaskCreateInput

```typescript
export interface TaskCreateInput {
  subject: string;            // Brief title
  description: string;        // What needs to be done
  activeForm?: string;        // Spinner text (e.g., "Running tests")
  metadata?: { [k: string]: unknown };
}
```

### TaskUpdateInput

```typescript
export interface TaskUpdateInput {
  taskId: string;
  subject?: string;
  description?: string;
  activeForm?: string;
  status?: ("pending" | "in_progress" | "completed") | "deleted";
  addBlocks?: string[];       // Task IDs this blocks
  addBlockedBy?: string[];    // Task IDs blocking this
  owner?: string;
  metadata?: { [k: string]: unknown };
}
```

### TaskGetInput / TaskListInput / TaskStopInput

```typescript
export interface TaskGetInput { taskId: string; }
export interface TaskListInput {}
export interface TaskStopInput { task_id?: string; shell_id?: string; }
```

### TaskOutputInput

```typescript
export interface TaskOutputInput {
  task_id: string;
  block: boolean;             // Wait for completion
  timeout: number;            // Max wait ms
}
```

### ExitPlanModeInput

```typescript
export interface ExitPlanModeInput {
  allowedPrompts?: {
    tool: "Bash";
    prompt: string;          // Semantic description
  }[];
  [k: string]: unknown;
}
```

### NotebookEditInput

```typescript
export interface NotebookEditInput {
  notebook_path: string;      // Absolute path
  cell_id?: string;          // Cell ID to edit/insert after
  new_source: string;        // New cell content
  cell_type?: "code" | "markdown";
  edit_mode?: "replace" | "insert" | "delete";
}
```

### TodoWriteInput

```typescript
export interface TodoWriteInput {
  todos: {
    content: string;
    status: "pending" | "in_progress" | "completed";
    activeForm: string;
  }[];
}
```

### WebFetchInput / WebSearchInput

```typescript
export interface WebFetchInput {
  url: string;
  prompt: string;             // Prompt to run on fetched content
}

export interface WebSearchInput {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
}
```

### AskUserQuestionInput

```typescript
export interface AskUserQuestionInput {
  questions: [{
    question: string;          // Full question text
    header: string;           // Short chip label (max 12 chars)
    options: [{
      label: string;           // Display text (1-5 words)
      description: string;    // Explanation
      preview?: string;       // Optional preview content
    }][2-4];                   // 2-4 options
    multiSelect: boolean;
  }][1-4];                     // 1-4 questions
}
```

### MCP-Related Inputs

```typescript
export interface ListMcpResourcesInput {
  server?: string;            // Filter by server name
}

export interface ReadMcpResourceInput {
  server: string;             // MCP server name
  uri: string;                // Resource URI
}

export interface McpInput {
  [k: string]: unknown;      // Dynamic MCP tool input
}
```

### Worktree Inputs

```typescript
export interface EnterWorktreeInput {
  name?: string;             // New worktree name
  path?: string;             // Existing worktree path
}

export interface ExitWorktreeInput {
  action: "keep" | "remove";  // Keep or delete worktree
}
```

## FileReadOutput (Multi-format)

```typescript
export type FileReadOutput =
  | { type: "text"; file: { filePath: string; content: string; numLines: number; startLine: number; totalLines: number } }
  | { type: "image"; file: { base64: string; type: "image/jpeg"|"image/png"|"image/gif"|"image/webp"; originalSize: number; dimensions?: { originalWidth?: number; originalHeight?: number; displayWidth?: number; displayHeight?: number } } }
  | { type: "notebook"; file: { filePath: string; cells: unknown[] } }
  | { type: "pdf"; file: { filePath: string; base64: string; originalSize: number } }
  | { type: "parts"; file: { filePath: string; originalSize: number; count: number; outputDir: string } }
  | { type: "file_unchanged"; file: { filePath: string } }
```

## MCP Output Types

```typescript
export type ListMcpResourcesOutput = {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
  server: string;
}[];

export type McpOutput = string | { type: string; [k: string]: unknown }[] | { [k: string]: unknown };
```

## Usage Patterns

### SDK Programmatic API

The Agent SDK (`claude_agent_sdk`) uses these types to:

1. **Type-safe tool calls**: Each tool has defined input/output schemas
2. **Sub-agent spawning**: `AgentInput` enables nested agent creation
3. **Task management**: Full CRUD for task tracking
4. **Background execution**: Async agent launch with progress monitoring
5. **Multi-provider support**: Same tools work across Anthropic, Bedrock, Vertex, Foundry

### Tool Execution Flow

```
SDK Consumer → ToolInput Schema → Validation → Tool Execution → ToolOutput Schema → SDK Consumer
```

### Key Design Decisions

1. **Union types for I/O**: `ToolInputSchemas` and `ToolOutputSchemas` allow flexible tool dispatch
2. **AgentOutput dual state**: Completed vs async_launched enables background agents
3. **FileReadOutput multi-format**: Single tool handles text, images, PDFs, notebooks
4. **AskUserQuestion constraints**: 1-4 questions, 2-4 options each
5. **TaskUpdate partial updates**: All fields optional for incremental updates
6. **Dynamic MCP input**: `McpInput` uses `[k: string]: unknown` for extensibility
