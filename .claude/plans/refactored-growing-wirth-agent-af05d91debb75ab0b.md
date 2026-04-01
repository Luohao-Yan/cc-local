# Claude Code Rebuilt - Core Modules Analysis

## 1. CLI Setup (src/main.tsx)

The CLI setup in `src/main.tsx` is the entrypoint that initializes the entire application. Key aspects:

- **Early Prefetching & Initialization**: 
  - Prefetches MDM settings, keychain items, and other data in parallel
  - Runs migrations (`runMigrations()`)
  - Initializes telemetry and feature flags (GrowthBook)
  - Sets up global state and plugins

- **Commander.js Integration**:
  - Uses `@commander-js/extra-typings` for CLI parsing
  - Handles various command-line flags and options

- **REPL Launch**:
  - `launchRepl()` function starts the interactive interface
  - Initializes the app state store with `getDefaultAppState()`

## 2. Tool Registry System (src/tools.ts)

`src/tools.ts` manages all available tools in the system:

### Key Functions:

- **`getAllBaseTools()`** (lines 193-251):
  - The source of truth for ALL tools in the system
  - Returns a comprehensive array of all tool definitions
  - Conditionally includes tools based on feature flags and environment variables

- **`getTools(permissionContext)`**:
  - Filters tools based on permission context
  - Supports special modes like "simple mode" (Bash, Read, Edit only)
  - Filters out REPL-only tools when REPL is active

- **`assembleToolPool(permissionContext, mcpTools)`**:
  - Combines built-in tools with MCP tools
  - Deduplicates by name (built-ins take precedence)
  - Sorts for prompt-cache stability

### Tool Presets:
- `TOOL_PRESETS` - predefined tool combinations
- `getToolsForDefaultPreset()` - gets default tool list

## 3. Command Registry System (src/commands.ts)

`src/commands.ts` manages all slash commands available to users:

### Key Structures:

- **`COMMANDS`** (lines 258-346):
  - Memoized function returning all built-in commands
  - Organized in a large array with conditional inclusion based on features

- **`getCommands(cwd)`** (lines 476-517):
  - Loads commands from all sources: bundled skills, plugin skills, skill dir commands, workflows, plugin commands, built-in commands
  - Filters by availability and `isEnabled()` checks
  - Injects dynamic skills discovered during the session

- **`loadAllCommands(cwd)`**:
  - Async, memoized loader for all command sources
  - Parallelizes loading of skills, plugins, and workflows

### Command Types:
- Built-in commands
- Skills (from `/skills/` directory)
- Plugin commands
- Workflow commands
- Bundled skills

### Utility Functions:
- `findCommand()` - searches by name or alias
- `hasCommand()` - checks if command exists
- `getCommand()` - gets command or throws
- `formatDescriptionWithSource()` - formats for UI display

## 4. Base Tool Definitions (src/Tool.ts)

`src/Tool.ts` defines the core `Tool` type and how tools are built:

### Core Types:

- **`Tool` Interface** (lines 362-695):
  - Comprehensive interface with ~30+ properties and methods
  - Required: `name`, `call()`, `description()`, `inputSchema`, `prompt()`, `isEnabled()`, `isConcurrencySafe()`, `isReadOnly()`, `checkPermissions()`, `userFacingName()`, `mapToolResultToToolResultBlockParam()`, `renderToolUseMessage()`, plus many optional methods

- **`ToolDef` Type** (lines 721-726):
  - Partial Tool with defaultable methods optional
  - Used with `buildTool()`

### Key Defaults in `buildTool()` (lines 757-792):
  ```typescript
  const TOOL_DEFAULTS = {
    isEnabled: () => true,
    isConcurrencySafe: (_input?: unknown) => false,
    isReadOnly: (_input?: unknown) => false,
    isDestructive: (_input?: unknown) => false,
    checkPermissions: (input: { [key: string]: unknown }, _ctx?: ToolUseContext): Promise<PermissionResult> => Promise.resolve({ behavior: 'allow', updatedInput: input }),
    toAutoClassifierInput: (_input?: unknown) => '',
    userFacingName: (_input?: unknown) => '',
  }
  ```

### `ToolUseContext` (lines 158-300):
  - Provides context for tool execution including:
  - App state access
  - Abort controller
  - File state cache
  - Notifications
  - Query tracking for nested calls
  - And much more...

### Utility Functions:
- `toolMatchesName()` - matches tool by name or alias
- `findToolByName()` - finds tool in list
- `buildTool()` - creates complete Tool from ToolDef

## 5. Example Tool: FileReadTool (src/tools/FileReadTool/FileReadTool.ts)

The `FileReadTool` demonstrates the complete tool pattern:

### Structure:
1. **Zod Schemas**:
   - `inputSchema` - defines parameters (file_path, offset, limit, pages)
   - `outputSchema` - discriminated union for different output types (text, image, notebook, pdf, parts, file_unchanged)

2. **Tool Definition** (lines 337-718):
   ```typescript
   export const FileReadTool = buildTool({
     name: FILE_READ_TOOL_NAME,
     searchHint: 'read files, images, PDFs, notebooks',
     maxResultSizeChars: Infinity,
     strict: true,
     async description() { ... },
     async prompt() { ... },
     get inputSchema() { ... },
     get outputSchema() { ... },
     async call(input, context, ...) { ... },
     mapToolResultToToolResultBlockParam(data, toolUseID) { ... },
     // ... many other methods
   })
   ```

3. **Key Methods**:
   - `call()` - main execution logic
   - `validateInput()` - pre-execution validation
   - `checkPermissions()` - permission checks
   - `mapToolResultToToolResultBlockParam()` - formats output for API
   - Rendering methods for UI
4. **Helper Functions**:
   - `callInner()` - actual implementation
   - `readImageWithTokenBudget()` - image handling
   - `validateContentTokens()` - token validation
   - etc.

## 6. LLM Query Engine (src/query.ts)

`src/query.ts` contains the core query loop that orchestrates LLM interaction:

### Main Function: **`query(params)`** (lines 219-239)
- Async generator that yields StreamEvents, Messages, etc.
- Calls `queryLoop()` internally

### Core Loop: **`queryLoop()`** (lines 241-1729)

The main loop (infinite while loop) manages a complex agentic flow:

**Key Phases per Iteration:

1. **Context Preparation**:
   - Sets up query tracking
   - Applies microcompact
   - Applies snips (history pruning)
   - Applies context collapse
   - Runs autocompact if needed

2. **Model Streaming**:
   - Calls `deps.callModel()` to stream LLM response
   - Extracts tool_use blocks as they arrive
   - Optionally uses `StreamingToolExecutor` for parallel tool execution
   - Handles fallback models if needed
   - Handles media recovery, max_output_tokens recovery

3. **Tool Execution**:
   - If streaming tool execution: uses `StreamingToolExecutor.getRemainingResults()`
   - Otherwise: uses `runTools()` for sequential execution
   - Yields tool result messages
   - Updates tool use context

4. **Post-Processing**:
   - Processes stop hooks
   - Handles token budget continuation
   - Processes queued commands/attachments
   - Refreshes tools (MCP servers)
   - Generates tool use summaries

### Key State Tracking:
- `messages` - conversation history
- `toolUseContext` - current context
- `autoCompactTracking` - state for autocompact
- `maxOutputTokensRecoveryCount` - recovery attempts
- `turnCount` - current turn
- `pendingToolUseSummary` - async summary generation

### Recovery Mechanisms:
- Reactive compact for prompt-too-long errors
- Max output tokens recovery
- Context collapse drain
- Model fallback

### Features:
- Streaming tool execution (parallel)
- Token budget tracking
- Auto-compaction of conversation history
- Context collapse for long conversations
- Skill discovery and attachment injection
- Stop hooks for post-processing
- Tool result budget management
- Query chain tracking for nested calls

## Summary of Core Systems Architecture

```
main.tsx (CLI Entry)
    ↓
commands.ts (Command Registry) ←→ tools.ts (Tool Registry)
    ↓                           ↓
    └──────────→ query.ts (Query Engine) ← Tool.ts (Base Definitions)
                  ↓
                  ├→ callModel() (API)
                  ↓
                  ├→ runTools() / StreamingToolExecutor
                  ↓
                  └→ Individual Tools (FileReadTool, BashTool, etc.)
```

### Key Integration Points:

1. **Tool Creation**: Tools are defined with `buildTool()` from `ToolDef` objects
2. **Tool Registration**: All tools are listed in `getAllBaseTools()`
3. **Command Registration**: All commands are listed in `COMMANDS`
4. **Query Execution**: The `query()` generator orchestrates the entire flow
5. **Context Management**: `ToolUseContext` carries state through tool calls
6. **State Management**: AppState is mutated via `toolUseContext.getAppState()` / `.setAppState()`
