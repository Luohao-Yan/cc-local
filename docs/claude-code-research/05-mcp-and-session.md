# 05 - MCP & Session Management

## MCP (Model Context Protocol)

### Overview

Claude Code implements the Model Context Protocol (MCP) for extending its capabilities through external tool servers. The implementation follows the MCP specification and supports multiple transport types, OAuth authentication, capability negotiation, and enterprise-grade permission controls.

### Protocol Version

The latest MCP protocol version is `2025-11-25` (constant `NAH`). The client negotiates protocol versions during initialization, supporting a fallback list:
- `2025-11-25` (latest)
- `2025-06-18`
- `2025-03-26`
- `2024-11-05`
- `2024-10-07`

If the server returns an unsupported version, the client falls back to the latest (`2025-11-25`). The protocol uses JSON-RPC 2.0 (`Fh8="2.0"`).

### Transport Types

| Transport | Protocol | Config Key | Use Case |
|---|---|---|---|
| **stdio** | Standard I/O | `command` + `args` | Local processes, CLI tools |
| **SSE** | Server-Sent Events | `url` (with SSE endpoint) | Remote servers, HTTP streaming |
| **HTTP** | HTTP/REST | `url` (with HTTP endpoint) | Remote servers, REST APIs |
| **SSE-IDE** | Server-Sent Events (IDE) | `url` | IDE-integrated servers |
| **WS-IDE** | WebSocket (IDE) | `url` | IDE-integrated servers |
| **claudeai-proxy** | Anthropic proxy | URL via proxy | Claude.ai-hosted MCP servers |
| **DirectConnect** | Direct connection | Custom transport | SDK subprocess integration |

**stdio configuration:**
```json
{
  "command": "npx",
  "args": ["my-mcp-server"],
  "env": { "API_KEY": "..." }
}
```
- Command validation: `h.string().min(1).refine((H) => { if(H.includes(" ") && !H.startsWith("/")) return false; return true; })` -- command should not contain spaces unless absolute path.
- Arguments: `h.array(h.string())`

**HTTP/SSE configuration:**
```json
{
  "url": "https://example.com/mcp",
  "headers": { "Authorization": "Bearer ..." }
}
```

### Server Lifecycle

```
1. Configuration Loading
   |-- User settings: ~/.claude/settings.json
   |-- Project settings: .claude/settings.json
   |-- Local settings: .claude/settings.local.json
   |-- MCP config files: --mcp-config
   |-- Project MCP: .mcp.json
   |-- Claude Desktop import: claude mcp add-from-claude-desktop
   |-- Plugin MCPB bundles: manifest.json in plugin
   v
2. Server Resolution & Deduplication
   |-- Skip servers with same command/URL as already configured
   |-- Log skip reason: 'MCP server "X" skipped -- same command/URL as Y'
   v
3. Connection Establishment
   |-- stdio: spawn child process
   |-- SSE: HTTP connection with retry
   |-- HTTP: REST client with session header
   |-- claudeai-proxy: connect via Anthropic proxy
   v
4. Initialization Handshake
   |-- Client sends: initialize { protocolVersion, capabilities, clientInfo }
   |-- Server responds: { protocolVersion, capabilities, serverInfo, instructions }
   |-- Version negotiation (fallback list)
   v
5. Tool Discovery
   |-- Call tools/list
   |-- Register with prefix: mcp__<serverName>__<toolName>
   |-- Set up list_changed notification handler
   v
6. Resource Discovery
   |-- Call resources/list (if capabilities.resources)
   |-- Call resources/templates/list
   |-- Prefetch resources (if configured)
   v
7. Prompt Discovery
   |-- Call prompts/list (if capabilities.prompts)
   |-- Set up list_changed notification handler
   v
8. Runtime Tool Execution
   |-- Call tools/call { name, arguments }
   |-- Handle progress notifications
   |-- Handle elicitation requests
   |-- Process content replacement
   v
9. Live Update Handling
   |-- tools/list_changed -> refresh tool list
   |-- prompts/list_changed -> refresh prompt list
   |-- resources/list_changed -> refresh resource list
   |-- resources/updated -> notify resource changed
   v
10. Reconnection (on failure)
   |-- 401/403 -> trigger re-authentication
   |-- 404 session-not-found -> auto-reconnect
   |-- Transport errors -> retry with backoff
   v
11. Shutdown
   |-- Close transport
   |-- Kill child process (stdio)
   |-- Cleanup event handlers
```

### MCP Connection Management

**MCPConnectionManager** (accessed via `useMcpReconnect` hook):

The connection manager tracks all MCP server states and provides:
- Server connection status: `"connected" | "connecting" | "disabled" | "failed"`
- Server capabilities: `{ tools?, resources?, prompts?, logging? }`
- Server info: `{ name, version }`
- Server instructions (embedded in system prompt)
- Reconnection support: `mcp_reconnect` for individual servers
- Batch reconnection: `mcp_prewait` to wait for pending servers

**Non-blocking connection mode:**
- Controlled by `MCP_CONNECTION_NONBLOCKING` env var and `mcpConnectNonBlocking` AppState field
- Default: `false` (blocking -- wait 5s for all servers)
- When `true`: servers connect in background; tools become available when ready
- Exception: first-turn servers still wait at standard 5s timeout, since tools must be present for the turn-1 prompt

### Tool Discovery and Registration

**Tool naming convention:**
```
mcp__<serverName>__<toolName>
```
Example: `mcp__slack__slack_send_message`

**Tool parsing:**
```javascript
function parseMcpToolName(name) {
  if (!name.startsWith("mcp__")) return;
  const parts = name.split("__");
  if (parts.length < 3) return;
  const serverName = parts[1];
  const mcpToolName = parts.slice(2).join("__");
  return { serverName, mcpToolName };
}
```

**Deferred tool loading:**
MCP tools can be loaded lazily. Deferred tools appear only by name in `<system-reminder>` messages. The `ToolSearch` tool (also called `select`) fetches full JSONSchema definitions on demand:
```
ToolSearch with query "select:mcp__claude-in-chrome__<tool_name>"
```
The `getAutoToolSearchCharThreshold` function controls when tool search auto-triggers based on content length.

**Built-in MCP tools:**

| Tool Name | Purpose |
|---|---|
| `ListMcpResourcesTool` | List resources from MCP servers (auto-allowlisted) |
| `ReadMcpResourceTool` | Read a specific resource from an MCP server (auto-allowlisted) |
| `ToolSearch` / `select` | Fetch schema for deferred tools |

**Auto-allowlisted tools for auto mode (`FAA` set):**
Includes `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `ListMcpResourcesTool`, `ReadMcpResourceTool`, and others -- these bypass permission prompts in auto mode.

### Resource Handling

MCP resources provide read-only data access through two mechanisms:

**Static resources** (via `resources/list`):
```typescript
{
  uri: string;          // Resource URI
  name: string;         // Display name
  mimeType?: string;    // MIME type
  description?: string;
  server: string;       // Server that owns this resource
}
```

**Resource templates** (via `resources/templates/list`):
- Parameterized URI templates for dynamic resources
- Support `completion/complete` for auto-completing template parameters
- Tracked in suggestions with prefix `mcp-template-value::`

**Resource subscriptions:**
- `resources/subscribe` -- subscribe to resource updates
- `resources/unsubscribe` -- unsubscribe from updates
- `notifications/resources/updated` -- server pushes when resource changes
- Only available if `capabilities.resources.subscribe` is true

**Resource prefetching:**
The `prefetchAllMcpResources` function pre-fetches all resources from connected servers at startup.

**MCP resource tag parsing:**
```xml
<mcp-resource-update server="..." uri="...">[<reason>...</reason>]</mcp-resource-update>
<mcp-polling-update type="..." server="..." tool="...">[<reason>...</reason>]</mcp-polling-update>
```

### Capability Negotiation

During the `initialize` handshake, both client and server declare capabilities:

**Client capabilities:**
- `roots` -- file system roots (with `listChanged` support)
- `sampling` -- model sampling requests
- `elicitation` -- user input requests
- `tasks` -- background task support (with `listChanged`)
- Experimental: `recursiveClientTools`

**Server capabilities:**
- `tools` -- tool support (with `listChanged`)
- `resources` -- resource support (with `subscribe`, `listChanged`)
- `prompts` -- prompt support (with `listChanged`)
- `logging` -- log level support
- `tasks` -- task support (with `listChanged`)
- `completions` -- auto-completion support
- Experimental: `claude/channel` -- channel notification capability

**Capability validation:**
The client asserts required capabilities before making requests:
```javascript
assertCapability(method) {
  switch(method) {
    case "notifications/message":
      // requires logging capability
    case "notifications/resources/updated":
    case "notifications/resources/list_changed":
      // requires resources capability
    case "tools/call":
      // requires tools capability
    case "prompts/get":
      // requires prompts capability
  }
}
```

### Elicitation (User Input Requests)

MCP servers can request user input through the elicitation mechanism:
- Error code `-32042` (`UrlElicitationRequired`) triggers a browser-based elicitation flow
- The client sends `elicitation/create` requests to the user
- Hook events: `ElicitationResult` fires after user responds
- Hook input includes: `mcp_server_name`, `action`, `content`, `mode`, `elicitation_id`
- Hooks can programmatically accept or decline elicitation requests

### Channel Notifications (claude/channel)

An opt-in capability for MCP servers to push inbound messages to the user:
- Server declares `claude/channel` in experimental capabilities
- Controlled by enterprise settings:
  - `allowedMcpServers` / `deniedMcpServers` for server-level control
  - `allowedHttpHookUrls` for HTTP hook URLs used by channels
  - `channelsEnabled` boolean setting
- Users select specific servers for channel notifications via `--channels`
- Tracked by `allowedChannels` in AppState
- Telemetry: `tengu_mcp_channel_gate`

### OAuth Authentication

MCP servers requiring OAuth use a dedicated flow:
- **OAuth client ID**: `22422756-60c9-4084-8eb7-27705fd5cf9a` (constant `CLIENT_ID`)
- **OAuth redirect**: `${BASE_API_URL}/oauth/code/callback` (`UAL_REDIRECT_URL`)
- **Token file suffix**: `-local-oauth` (`OAUTH_FILE_SUFFIX`)
- **MCP Proxy URL**: `http://localhost:8205` (`MCP_PROXY_URL`)
- **MCP Proxy path**: `/v1/toolbox/shttp/mcp/{server_id}` (`MCP_PROXY_PATH`)
- **Client metadata URL**: `${BASE_API_URL}/oauth/claude-code-client-metadata` (`MCP_CLIENT_METADATA_URL`)
- **OAuth scopes**: `["user:sessions:claude_code", "user:mcp_servers", "user:file_upload"]` plus others
- Protocol version sent as `MCP-Protocol-Version` header during OAuth metadata discovery
- Token refresh with lock to prevent concurrent refresh attempts
- Telemetry: `tengu_oauth_error`, `tengu_oauth_success`, `tengu_oauth_token_refresh_*`

### MCPB Bundles (Plugin MCP)

MCPB (MCP Bundle) is a packaging format for distributing MCP server configurations:
- File extensions: `.mcpb` or `.dxt`
- Contains: `manifest.json` with server configuration, tool definitions, and metadata
- Schema fields: `manifest_version`, `name`, `display_name`, `version`, `description`, `author`, `serverType`, `entryPoint`, `mcp_config`
- Validation: `McpbManifestSchema`, `McpbManifestServerSchema`, `McpbManifestToolSchema`, `McpbManifestPromptSchema`, `McpbManifestPlatformOverrideSchema`, `McpbManifestCompatibilitySchema`
- User configuration: `McpbUserConfigurationOptionSchema` with types `string`, `number`, `boolean`, `directory`, `file`
- Build command: `mcpb pack` creates bundle from directory
- Ignore file: `.mcpbignore` (similar to `.gitignore`)
- Plugin error types: `mcpb-download-failed`, `mcpb-extract-failed`, `mcpb-invalid-manifest`

### MCP Registry

Claude Code fetches an official MCP server registry:
- **URL**: `https://api.anthropic.com/mcp-registry/v0/servers`
- **Parameters**: `version=latest`, `limit=100`, `visibility=<comma-separated>`, `cursor` (pagination)
- Visibility categories include `commercial`, `gsuite`
- Fetched at startup; cached URLs used for web search/connector isolation latch exemption
- Telemetry: `tengu_mcp_registry_fetch`

### MCP Permission Model

**Workspace Trust:**
- Before MCP servers can start, the workspace must be trusted
- Trust dialog acceptance stored in `sessionTrustAccepted` AppState field
- Security warnings: "MCP headersHelper invoked before trust check", "apiKeyHelper executed before workspace trust is confirmed"
- Commands blocked until trust accepted: StatusLine, FileSuggestion, EnterWorktree, skill execution

**Enterprise controls:**
- `allowedMcpServers`: Enterprise allowlist (denylist takes precedence)
- `deniedMcpServers`: Enterprise denylist (blocks across all scopes)
- `strictMcpServersOnly`: When true, `allowedMcpServers` is only read from managed settings
- Cannot add MCP server when enterprise MCP configuration is active with exclusive control
- Cannot add to scopes: `dynamic`, `enterprise`, `claudeai`
- `.mcp.json` malformed handling: "not valid JSON, or mcpServers is not an object"

**Tool-level permissions:**
- All MCP tool calls require user approval (same as built-in tools)
- `mcp_tool` hook type allows intercepting MCP tool calls
- `--strict-mcp-config` flag: ignores non-CLI MCP configs when enterprise MCP config present

**MCP CLI Commands:**

| Command | Description |
|---|---|
| `claude mcp add <name> <command>` | Add stdio MCP server |
| `claude mcp add --transport http <name> <url>` | Add HTTP MCP server |
| `claude mcp add --header "Auth: Bearer ..." <name> <url>` | Add with headers |
| `claude mcp add-json <name> <json>` | Add from JSON config |
| `claude mcp add-from-claude-desktop` | Import from Claude Desktop |
| `claude mcp list` | List configured servers (skips trust dialog, spawns stdio for health check) |
| `claude mcp get <name>` | Get server details (skips trust dialog) |
| `claude mcp remove <name>` | Remove a server |
| `claude mcp reset-project-choices` | Reset project-scoped server approvals/rejections |
| `claude mcp serve` | Start Claude Code as MCP server (exposes tools via SDK) |
| `claude mcp xaa setup` | Configure XAA (SEP-990) IdP for MCP authentication |

### Built-in MCP Servers

**Computer Use MCP:**
- Created via `createComputerUseMcpServerForCli`
- Started with: `[Computer Use MCP] Starting MCP server`
- Provides computer automation tools (click, type, screenshot, scroll)

**Claude in Chrome MCP:**
- Created via `createClaudeForChromeMcpServer`
- Started with: `[Claude in Chrome] MCP server started`
- Provides browser automation tools
- Requires ToolSearch to load deferred tools
- WebSocket connection for real-time communication
- Tools include: `tabs_context_mcp`, `tabs_create_mcp`, `read_page`, `find`, `form_input`, `navigate`, `browser_batch`, `computer`, `screenshot`, `zoom`, `switch_browser`, `javascript_tool`, `read_console_messages`, `gif_creator`

**SDK MCP Server:**
- Created via `createSdkMcpServer` / `unstable_v2_createSession`
- Allows Claude Code to expose its own tools as an MCP server
- Used by the Agent SDK for programmatic access

### MCP Hook Integration

MCP servers can be invoked through the hook system:

**mcp_tool hook type:**
```json
{
  "type": "mcp_tool",
  "server": "server-name",
  "tool": "tool-name",
  "input": { "key": "${tool_input.file_path}" },
  "if": "optional-condition",
  "timeout": 30,
  "statusMessage": "Running MCP tool..."
}
```

- String values in `input` support `${path}` interpolation from hook input JSON
- Runs before/after tool calls matching the hook pattern
- Can replace tool output via `updatedMCPToolOutput` (MCP-specific) or `updatedToolOutput` (all tools)

**PostToolUse hook output:**
- `updatedToolOutput`: Replaces tool output for all tools (preferred)
- `updatedMCPToolOutput`: Replaces tool output for MCP tools only (legacy)
- `additionalContexts`: Additional context added to conversation
- `preventContinuation`: Stops further execution
- `blockingError`: Shows blocking error to user

---

## Session Management

### Session Architecture

Sessions are the core persistence unit in Claude Code. Each session stores:
- Conversation history (messages with parent-UUID chain)
- Tool call results and content replacements
- File checkpoint/history snapshots
- Attribution snapshots
- Context collapse commits and snapshots
- Session metadata (title, tags, agent info, mode, isolation state)

### Storage Backend

Sessions use **JSONL files** for persistence (not SQLite):

- **Location**: `~/.claude/projects/<sanitized-cwd>/`
- **Format**: Each line is a JSON message (JSONL)
- **Filename**: `<session-uuid>.jsonl`
- **Session ID**: The filename without the `.jsonl` extension
- **Cleanup**: Configurable via `cleanupPeriodDays` setting (default: 30 days, minimum: 1 day)
- **Disable**: `--no-session-persistence` or `persistSession: false` in SDK

Each JSONL line contains a typed message:
```json
{"type": "user", "message": {...}, "uuid": "...", "timestamp": "...", "sessionId": "...", "parentUuid": "..."}
{"type": "assistant", "message": {...}, "uuid": "...", "timestamp": "...", "sessionId": "...", "parentUuid": "..."}
{"type": "system", "subtype": "compact_boundary", ...}
{"type": "custom-title", "sessionId": "...", "customTitle": "..."}
{"type": "content-replacement", ...}
```

### Conversation Chain Validation

Messages form a linked list via `parentUuid`:
- Each message references its parent's UUID
- The chain must be valid (no cycles, no missing parents)
- Error: "Cycle detected in parentUuid chain at message"
- Error: "No valid conversation chain found in JSONL file"
- Error: "API Error: 400 duplicate tool_use ID in conversation history"

### Session Lifecycle

```
1. Session Creation
   |-- New session: generate UUIDv7
   |-- Resume session: load from JSONL, validate chain
   |-- Continue session: find most recent in cwd
   |-- Fork session: copy messages up to point, new UUID
   v
2. Session Runtime
   |-- Message streaming: append to JSONL file
   |-- Tool execution: store results inline
   |-- Content replacement: track in contentReplacements array
   |-- Context compaction: write compact_boundary marker
   |-- File checkpointing: store snapshots for rewind
   v
3. Session Persistence
   |-- Local JSONL writes on every message
   |-- Transcript mirroring to SessionStore (SDK)
   |-- Auto-upload to claude.ai (if enabled)
   |-- Conflict resolution: UUID mismatch, 409 recovery
   v
4. Session End
   |-- Normal exit: persist final state
   |-- Interrupt: save current state
   |-- Fork: create branch from current point
   |-- Background: session kept alive for attach
```

### SessionStore (SDK Integration)

The `SessionStore` interface enables external storage backends for the Agent SDK:

```typescript
interface SessionStore {
  append(key: { projectKey: string; sessionId: string; subpath?: string }, entries: any[]): Promise<void>;
  load(key: { projectKey: string; sessionId: string; subpath?: string }): Promise<any[] | null>;
  listSessions(projectKey: string): Promise<{ sessionId: string; mtime: number }[]>;
  listSessionSummaries(projectKey: string): Promise<SessionSummary[]>;
  listSubkeys(key: { projectKey: string; sessionId: string }): Promise<string[]>;
  delete(key: { projectKey: string; sessionId: string; subpath?: string }): Promise<void>;
}
```

**InMemorySessionStore** (`xI8`): Built-in implementation using `Map<string, any[]>`.

**Transcript mirroring:**
- When `sessionStore` is configured, the subprocess emits `transcript_mirror` frames on stdout
- Parent process peels these off and batches them to `SessionStore.append()`
- Schema: `{ type: "transcript_mirror", filePath: string, entries: any[] }`
- Retry: 3 attempts with short backoff; timeouts are NOT retried
- On failure: emits `{ type: "system", subtype: "mirror_error", error: string, key: {...} }`
- CLI flag: `--session-mirror` (SDK-internal, set by ProcessTransport)

**Constraints:**
- `sessionStore` requires `persistSession: true` (local JSONL writes are mirrored)
- `enableFileCheckpointing` is incompatible with `sessionStore` (backup blobs not mirrored)
- Custom `spawnClaudeCodeProcess` must ensure subprocess `CLAUDE_CONFIG_DIR` matches parent
- `listSessions` required for `--continue` with sessionStore
- `listSubkeys` required for sub-agent discovery

### Session Persistence Conflict Resolution

When auto-upload is enabled, sessions sync with a remote server:
- **409 Conflict**: UUID mismatch between local and server
  - Recovery: `session_persist_409_adopt_server_uuid` -- adopt server UUID
  - Failure: `session_persist_fail_concurrent_modification`
- **Bad token**: `session_persist_fail_jwt_no_token`
- **No token**: `No session token available for session persistence`
- **Recovery**: `session_persist_recovered_from_409`

### Session Resume & Fork

**Resume modes:**
- `--continue` / `-c`: Resume most recent session in current directory
- `--resume` / `-r`: Resume by session ID (or interactive picker with search)
- `--resume --fork-session`: Fork at resume point (creates new session branching from old)

**Fork implementation:**
```javascript
// Fork creates a new session from an existing one
// Steps:
// 1. Load source session messages
// 2. Filter to non-sidechain, non-progress messages
// 3. Optionally truncate at upToMessageId
// 4. Remap all UUIDs (new UUIDv7 for each message)
// 5. Set parentUuid chain for new messages
// 6. Add forkedFrom: { sessionId, messageUuid } to first message
// 7. Copy content replacements
// 8. Generate title: "Original Title (Branch)" or "Original Title (Branch N)"
// 9. Write new JSONL file
```

**Session metadata on resume:**
```typescript
{
  messages: Message[],
  turnInterruptionState: TurnInterruptionState,
  deferredToolUse: DeferredToolUse | void,
  fileHistorySnapshots: FileHistorySnapshots,
  attributionSnapshots: AttributionSnapshots,
  contentReplacements: ContentReplacement[],
  contextCollapseCommits: ContextCollapseCommits,
  contextCollapseSnapshot: ContextCollapseSnapshot,
  sessionId: string,
  agentName: string,
  agentColor: string,
  agentSetting: AgentSetting,
  customTitle: string,
  aiTitle: string,
  tag: string,
  mode: string,
  permissionMode: string,
  isolationLatch: string,
  worktreeSession: WorktreeSession,
  prNumber: number,
  prUrl: string,
  prRepository: string,
  fullPath: string,
}
```

### Session Discovery & History

- **Transcript directories**: `~/.claude/projects/<project>/` (searched recursively for `.jsonl`)
- **List API**: `listSessions(projectKey)` returns `{ sessionId, mtime }[]`
- **Summary API**: `listSessionSummaries(projectKey)` includes titles, agent info
- **Search**: Content search via `grep` on `.jsonl` files
- **Auto-dream**: `listSessionsTouchedSince(mtime)` for memory consolidation

### Context Compaction

When conversation history approaches context window limits, Claude Code performs compaction (also called "auto-compact"). There are three levels:

#### 1. Microcompact (Time-based)
Triggered by `context_hint` from the API when context is approaching limits.
- Clears old tool results (keeping recent ones based on `keepRecent` strategy)
- Preserves tool use blocks but removes their results
- Computes token savings: `tengu_time_based_microcompact`
- Marks boundary with `subtype: "microcompact_boundary"`
- Does NOT call the model for summarization

#### 2. Autocompact (Summary-based)
Triggered when token count exceeds the auto-compact window.
- Calls the model to produce a text summary of the conversation
- The compaction agent is instructed to "only produce text summary"
- Preserves security-relevant instructions verbatim
- Replaces old messages with a compact summary message (`isCompactSummary: true`)
- Pre-compact hook: `PreCompact` (can block compaction)
- Post-compact hook: `PostCompact` (receives summary text)
- Marks boundary with `subtype: "compact_boundary"`
- Circuit breaker: `tengu_auto_compact_circuit_breaker` (prevents infinite compaction loops)
- Rapid refill tracking: `consecutiveRapidRefills` counter

**Auto-compact window configuration:**
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW` env var (highest priority)
- `autoCompactWindow` setting (min: 100,000, max: 1,000,000)
- `auto` mode: automatically sized based on model context window
- The actual threshold is the minimum of the setting and model's max context window

#### 3. Reactive Compact (Precomputed)
An advanced mechanism where compaction is computed in parallel with the main query.
- Triggered by `413` (context too large) or proactive token-gap detection
- Pre-computes compaction while the user is still reading the response
- Swaps in the compacted context at a boundary UUID
- Tracks `lastTransitionReason` including `"precomputed_compact_swap"`
- Has a fallback: if precomputed compaction isn't available, falls back to regular autocompact

**Compaction state tracking:**
```javascript
compactTracking: {
  compacted: boolean,
  turnId: string,
  turnCounter: number,
  consecutiveFailures: number,
  consecutiveRapidRefills: number,
  hasAttemptedReactiveCompact: boolean,
}
```

**Compaction prompt requirements:**
1. Technical facts: languages, frameworks, libraries, exact file paths
2. Current state: recent file edits, current errors, uncommitted changes
3. Security instructions: preserved verbatim in summary
4. All user messages: listed completely (not summarized), security instructions preserved verbatim
5. User preferences and workflow patterns
6. Key decisions and their rationale

### State Management (AppState)

The global application state uses a React context provider pattern with a large state object. The implementation uses `useSyncExternalStore` for efficient re-renders.

**AppStateProvider:**
```jsx
function AppStateProvider({ children, initialState, onChangeAppState }) {
  // Creates store with IV(initialState ?? cC(), onChangeAppState)
  // Returns React context provider wrapping children
}
```

**Hooks:**
```javascript
// Get both getter and setter
const { getAppState, setAppState } = useAppState();

// Selector-based subscription (re-renders only when selected slice changes)
const value = useAppState(state => state.someField);
```

**Tracked fields** (the `eY1` array -- fields that trigger selective re-render):
```javascript
eY1 = ["frameUrls", "frameBannerHidden"]
```
Only these fields cause a shallow-equality check in `setAppState`; other field changes are applied but don't trigger optimized re-render tracking.

**Initial AppState fields** (partial, extracted from binary):

| Category | Fields |
|---|---|
| **Session** | `sessionId`, `sessionProjectDir`, `sessionSkillAllowlist`, `sessionTrustAccepted`, `sessionStartType`, `sessionSource`, `sessionPrResolved` |
| **Messages** | `messages`, `turnInterruptionState`, `pendingPostCompaction` |
| **MCP** | `mcpConnectNonBlocking`, `mcpClients`, `mcpTools`, `mcpResources`, `allowedChannels`, `activeInputs` |
| **Tools** | `tools`, `toolPermissionContext`, `toolDecisions`, `contentReplacementState` |
| **Model** | `mainLoopModel`, `mainLoopModelOverride`, `effortLevel`, `thinkingType`, `maxThinkingTokens` |
| **Config** | `settings`, `settingSources`, `permissionMode`, `stickyBetas`, `promptCache1hAllowlist` |
| **UI** | `theme`, `outputStyle`, `isVimMode`, `isFastMode`, `showThinkingSummaries`, `terminalProgressBarEnabled` |
| **State** | `activeRoutine`, `systemPromptSectionCache`, `lastEmittedDate`, `additionalDirectoriesForClaudeMd` |
| **Agent** | `agentId`, `agentName`, `agentColor`, `agentType`, `mainThreadAgentType`, `mainThreadAgentHooks` |
| **Bridge** | `replBridgeActive`, `directConnectServerUrl`, `caps` |
| **Compaction** | `isCompacting`, `compactingHintText`, `compactingStartTime` |
| **Budget** | `currentTurnTokenBudget`, `taskBudget`, `maxBudgetUsd` |
| **Dream** | `autoDreamEnabled` |
| **Feature Flags** | `hasDevChannels`, `promptSuggestion`, `agentProgressSummaries`, `forwardSubagentText` |

**State sharing for sub-agents:**
When spawning sub-agents, state can be selectively shared:
- `shareSetAppState: true` -- shares the parent's setAppState, setToolPermissionContext, applyFlagSettings
- `shareAbortController: true` -- shares the parent's abort controller
- Modified getAppState can filter fields (e.g., `shouldAvoidPermissionPrompts: true`)

### Content Replacement System

Tool results can be replaced or modified before being sent to the model, enabling:
- Persisting large tool results to disk and replacing with a reference
- Redacting sensitive information
- Adding context to tool results

**State:**
```javascript
contentReplacementState: {
  replacements: Map<toolUseId, string>,  // tool_use_id -> replacement content
  seenIds: Set<string>,                   // already-processed tool use IDs
}
```

**Flow:**
1. `PostToolUse` hook returns `updatedToolOutput` or `updatedMCPToolOutput`
2. Content is stored in replacement map
3. On next query, tool results are checked against replacement map
4. Matching results are substituted before sending to API
5. Replacements are persisted in JSONL as `type: "content-replacement"` entries

### Worktree Session Isolation

When using `--worktree` or agent `isolation: "worktree"`, each session gets its own git worktree:

**Configuration:**
```json
{
  "worktree": {
    "baseRef": "fresh|head",  // default: "fresh" (from origin/default-branch)
    "sparseCheckout": ["dir1", "dir2"],  // cone-mode sparse checkout
    "symlinkDirs": ["node_modules", ".cache"]  // symlink to avoid disk bloat
  }
}
```

**Lifecycle:**
1. **Creation**: `git worktree add` creates isolated directory with own branch
2. **Runtime**: Session operates in worktree directory, not shared checkout
3. **Cleanup**: On exit, user is prompted to keep or remove worktree
   - "Keep worktree" -- preserve for later resume
   - "Remove worktree" -- `git worktree remove` (or manual `rm` if git fails)
   - Auto-cleanup if agent made no changes
4. **Failure**: Falls back to `rm -rf` if `git worktree remove` fails

**Constraints:**
- Requires git repository (or WorktreeCreate/WorktreeRemove hooks)
- Falls back to `same-dir` mode if not in a git repository
- `isolationLatch` field tracks isolation state in session metadata
- Bridge pointer reading across worktrees: `readBridgePointerAcrossWorktrees`

**Spawn modes:**
- `same-dir`: Sessions share the current directory (default)
- `worktree`: New sessions get isolated git worktrees
- `session`: Single-session mode (limited concurrency)
- `--capacity N`: Max concurrent sessions in worktree or directory mode

### Multi-Agent Sessions

Sessions can spawn sub-agents with their own context:

**In-process sub-agents:**
- Registered in `taskRegistry` within AppState
- Share state with parent via configurable getters/setters
- Have their own abort controller (optionally shared)
- Report progress via spinner verbs
- Can be idle, running, or shutdown

**Remote sub-agents (teammates):**
- Spawned via `TeammateTool` with tmux integration
- Each gets its own tmux session/window/pane
- Communication via cross-session messages
- Auto-attached via `claude agents` command

**Sub-agent context:**
```typescript
{
  agentId: string,
  parentAgentId: string,
  parentSessionId: string,
  agentType: string,
  model: string,
  name: string,
  teamName: string,
  prompt: string,
  isAsync: boolean,
  source: string,
  pluginId: string | undefined,
}
```

### Auto-Dream (Memory Consolidation)

Auto-dream is a background memory consolidation system that runs when idle:

**Configuration:**
- `autoDreamEnabled` setting (overrides server-side default)
- Feature flags: `tengu_onyx_plover` (availability), `tengu_basalt_spur` (forced enable)
- `minHours` between consolidations (default from config)
- `minSessions` touched since last consolidation

**Consolidation flow:**
1. Acquire lock file (`.consolidate-lock`, PID-based, 1-hour mtime staleness)
2. Scan sessions touched since last consolidation (`listSessionsTouchedSince`)
3. Filter out current session
4. If enough sessions accumulated, trigger `/dream consolidate`
5. Dream prompt: "Synthesize what you've learned recently into durable, well-organized memories"
6. Pruning pass: `/dream prune` -- delete stale or invalidated memories, collapse duplicates

**Memory storage:**
- Default path: `~/.claude/projects/<sanitized-cwd>/memory/`
- Custom path via `memoryStorePath` setting
- CLAUDE.md may be stale relative to memories; dreams annotate contradictions

**Task types for background tasks:**
- `dream` -- dreaming status
- `mcp_task` -- MCP background tasks
- `monitor_mcp` -- monitor tasks
- `local_workflow` -- background workflows

---

## Key Identifiers Summary

| Identifier | Usage |
|---|---|
| `mcpServers` (147) | MCP server configuration object |
| `mcpClients` (80) | Connected MCP client instances |
| `mcpTools` (23) | Discovered MCP tool list |
| `mcpOAuth` (48) | OAuth configuration for MCP servers |
| `mcpInfo` (31) | MCP server metadata |
| `mcpCallCount` (13) | Per-server call count tracking |
| `mcpResources` (10) | Available MCP resources |
| `MCPB` (98) | MCPB bundle references |
| `MCPConnectionManager` (4) | Connection state manager |
| `RemoteSessionManager` (40) | Remote session manager |
| `LocalSessionManager` (2) | Local session manager |
| `ConversationManager` (2) | Conversation chain manager |
| `InMemorySessionStore` | In-memory SessionStore impl |
| `SessionStore` | SessionStore interface |
| `AppStateProvider` | React context provider |
| `CapabilityAccessManager` (1) | Capability access control |
| `SandboxManager` (4) | Sandbox management |
| `NAH` | Latest MCP protocol version ("2025-11-25") |
