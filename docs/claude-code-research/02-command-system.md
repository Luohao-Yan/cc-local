# Claude Code - Slash Command System

This document provides a comprehensive analysis of the Claude Code slash command system, extracted from the source code in `packages/cli/src/commands/`.

---

## 1. Command Type System

Every slash command is a `Command` object composed of a `CommandBase` unioned with one of three execution types.

### 1.1 Command Types

| Type | Identifier | Execution Model | UI Rendering |
|------|-----------|-----------------|--------------|
| **Prompt** | `'prompt'` | Expands into text sent to the model as a user message | Spinner with progress message |
| **Local** | `'local'` | Runs a TypeScript function that returns `{ type: 'text' | 'compact' | 'skip' }` | Inline text result |
| **Local-JSX** | `'local-jsx'` | Runs a TypeScript function returning a React element (Ink) | Full Ink component UI |

### 1.2 CommandBase Fields

```typescript
type CommandBase = {
  name: string                          // Slash command name (e.g. "compact", "model")
  description: string                   // Shown in typeahead and /help
  aliases?: string[]                    // Alternate names (e.g. "reset" for /clear)
  availability?: ('claude-ai' | 'console')[]  // Auth gating
  isEnabled?: () => boolean              // Runtime feature flag check
  isHidden?: boolean                    // Hide from typeahead and /help
  argumentHint?: string                 // Gray hint after command (e.g. "<path>")
  hasUserSpecifiedDescription?: boolean // Whether user wrote the description
  whenToUse?: string                     // Detailed usage scenarios for model
  version?: string                      // Command/skill version
  disableModelInvocation?: boolean      // Prevent model from invoking via SkillTool
  userInvocable?: boolean               // Whether users can type /name
  loadedFrom?: 'commands_DEPRECATED' | 'skills' | 'plugin' | 'managed' | 'bundled' | 'mcp'
  kind?: 'workflow'                     // Workflow command badge
  immediate?: boolean                   // Execute without waiting for stop point
  isSensitive?: boolean                 // Redact args from conversation history
  userFacingName?: () => string         // Override display name
}
```

### 1.3 PromptCommand Additional Fields

```typescript
type PromptCommand = {
  type: 'prompt'
  progressMessage: string               // Spinner text during execution
  contentLength: number                 // Character count for token estimation
  argNames?: string[]                   // Named arguments
  allowedTools?: string[]               // Tool permissions for this skill
  model?: string                        // Override model for this skill
  source: SettingSource | 'builtin' | 'mcp' | 'plugin' | 'bundled'
  pluginInfo?: { pluginManifest, repository }
  disableNonInteractive?: boolean
  hooks?: HooksSettings                 // Hooks to register during invocation
  skillRoot?: string                    // Base dir for skill resources
  context?: 'inline' | 'fork'          // 'inline' = expand in conversation, 'fork' = sub-agent
  agent?: string                        // Agent type for forked execution
  effort?: EffortValue                  // Override effort level
  paths?: string[]                      // Glob patterns for conditional activation
  getPromptForCommand(args, context): Promise<ContentBlockParam[]>
}
```

---

## 2. Complete Command Registry

### 2.1 Core/Always-Available Commands

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/help` | local-jsx | Show help and available commands | - | - |
| `/clear` | local | Clear conversation history and free up context | `reset`, `new` | - |
| `/compact` | local | Clear conversation history but keep a summary in context | - | `<optional custom summarization instructions>` |
| `/cost` | local | Show the total cost and duration of the current session | - | - |
| `/exit` | local-jsx | Exit the REPL | `quit` | - |
| `/copy` | local-jsx | Copy Claude's last response to clipboard | - | `[N]` |
| `/status` | local-jsx | Show Claude Code status (version, model, account, connectivity) | - | - |

### 2.2 Session & Conversation Management

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/resume` | local-jsx | Resume a previous session | `continue` | `[conversation id or search term]` |
| `/rename` | local-jsx | Rename the current conversation | - | `[name]` |
| `/rewind` | local | Restore the code and/or conversation to a previous point | `checkpoint` | - |
| `/branch` | local-jsx | Create a branch of the current conversation at this point | `fork` (conditional) | `[name]` |
| `/session` | local-jsx | Show remote session URL and QR code | `remote` | - |
| `/tag` | local-jsx | Toggle a searchable tag on the current session | - | `<tag-name>` |

### 2.3 Model & Configuration

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/model` | local-jsx | Switch model or manage: add\|list\|edit\|remove\|check | - | `[add \| list \| edit \| remove \| check \| model]` |
| `/config` | local-jsx | Open config panel | `settings` | - |
| `/fast` | local-jsx | Toggle fast mode (Haiku only) | - | `[on\|off]` |
| `/effort` | local-jsx | Set effort level for model usage | - | `[low\|medium\|high\|max\|auto]` |
| `/advisor` | local | Configure the advisor model | - | `[<model>\|off]` |
| `/rate-limit-options` | local-jsx | Show options when rate limit is reached | - | - |
| `/extra-usage` | local-jsx | Configure extra usage to keep working when limits are hit | - | - |

### 2.4 Permissions & Security

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/permissions` | local-jsx | Manage allow & deny tool permission rules | `allowed-tools` | - |
| `/privacy-settings` | local-jsx | View and update your privacy settings | - | - |
| `/security-review` | prompt | Complete a security review of pending changes on the current branch | - | - |
| `/sandbox` (alias for `/sandbox-toggle`) | local-jsx | Configure sandbox settings | - | `exclude "command pattern"` |

### 2.5 Git & PR Operations

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/commit` | prompt | Create a git commit | - | - |
| `/commit-push-pr` | prompt | Commit, push, and open a PR | - | - |
| `/review` | prompt | Review a pull request | - | `[PR number]` |
| `/ultrareview` | local-jsx | ~10-20 min. Finds and verifies bugs in your branch (CCR) | - | - |
| `/diff` | local-jsx | View uncommitted changes and per-turn diffs | - | - |
| `/pr-comments` | - | Get comments from a GitHub pull request | - | - |

### 2.6 Integration & Environment

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/mcp` | local-jsx | Manage MCP servers | - | `[enable\|disable [server-name]]` |
| `/hooks` | local-jsx | View hook configurations for tool events | - | - |
| `/ide` | local-jsx | Manage IDE integrations and show status | - | `[open]` |
| `/add-dir` | local-jsx | Add a new working directory | - | `<path>` |
| `/context` | local-jsx | Visualize current context usage as a colored grid | - | - |
| `/remote-env` | local-jsx | Configure the default remote environment for teleport sessions | - | - |
| `/files` | local | List all files currently in context | - | - |

### 2.7 Memory & Documentation

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/memory` | local-jsx | Edit Claude memory files | - | - |
| `/init` | prompt | Initialize a new CLAUDE.md file with codebase documentation | - | - |
| `/insights` | prompt | Generate a report analyzing your Claude Code sessions | - | - |

### 2.8 UI & Appearance

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/theme` | local-jsx | Change the theme | - | - |
| `/color` | local-jsx | Set the prompt bar color for this session | - | `<color\|default>` |
| `/output-style` | local-jsx | Deprecated: use /config to change output style | - | - |
| `/vim` | local | Toggle between Vim and Normal editing modes | - | - |
| `/keybindings` | local | Open or create your keybindings configuration file | - | - |
| `/terminal-setup` | local-jsx | Install Shift+Enter key binding for newlines | - | - |
| `/statusline` | prompt | Set up Claude Code's status line UI | - | - |

### 2.9 Authentication & Account

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/login` | local-jsx | Sign in with your Anthropic account | - | - |
| `/logout` | local-jsx | Sign out from your Anthropic account | - | - |
| `/upgrade` | local-jsx | Upgrade to Max for higher rate limits and more Opus | - | - |
| `/usage` | local-jsx | Show plan usage limits | - | - |
| `/passes` | local-jsx | Share a free week of Claude Code with friends | - | - |

### 2.10 Special Features

| Command | Type | Description | Aliases | Args |
|---------|------|-------------|---------|------|
| `/buddy` | local-jsx | Hatch a coding companion | - | `[pet\|off]` |
| `/btw` | local-jsx | Ask a quick side question without interrupting the main conversation | - | `<question>` |
| `/think-back` | local-jsx | Your 2025 Claude Code Year in Review | - | - |
| `/thinkback-play` | local | Play the thinkback animation | - | - |
| `/stickers` | local | Order Claude Code stickers | - | - |
| `/feedback` | local-jsx | Submit feedback about Claude Code | `bug` | `[report]` |
| `/stats` | local-jsx | Show your Claude Code usage statistics and activity | - | - |
| `/tasks` | local-jsx | List and manage background tasks | `bashes` | - |
| `/skills` | local-jsx | List available skills | - | - |
| `/plugin` | local-jsx | Manage Claude Code plugins | - | - |
| `/reload-plugins` | local | Activate pending plugin changes in the current session | - | - |
| `/release-notes` | local | View release notes | - | - |

### 2.11 Platform-Specific / Feature-Gated Commands

| Command | Type | Description | Gating | Aliases |
|---------|------|-------------|--------|---------|
| `/chrome` | local-jsx | Claude in Chrome (Beta) settings | `availability: ['claude-ai']` | - |
| `/desktop` | local-jsx | Continue the current session in Claude Desktop | `availability: ['claude-ai']` | `app` |
| `/mobile` | local-jsx | Show QR code to download the Claude mobile app | - | `ios`, `android` |
| `/voice` | local | Toggle voice mode | `availability: ['claude-ai']` | - |
| `/remote-control` | local-jsx | Connect this terminal for remote-control sessions | `feature('BRIDGE_MODE')` | `rc` |
| `/plan` | local-jsx | Enable plan mode or view the current session plan | - | - |

### 2.12 Internal-Only Commands (Ant/Employee Only)

These are listed in `INTERNAL_ONLY_COMMANDS` and only available when `USER_TYPE === 'ant'`:

| Command | Type | Description |
|---------|------|-------------|
| `/backfill-sessions` | - | Session backfill utility |
| `/break-cache` | local | Cache invalidation (BREAK_CACHE_COMMAND flag) |
| `/bughunter` | - | Bug hunting utility |
| `/commit` | prompt | Create a git commit (internal) |
| `/commit-push-pr` | prompt | Commit, push, and open a PR (internal) |
| `/ctx-viz` | - | Context visualization |
| `/good-claude` | - | Internal feedback command |
| `/issue` | - | Issue management |
| `/init-verifiers` | - | Initialize verifiers |
| `/force-snip` | - | Force history snip (HISTORY_SNIP flag) |
| `/mock-limits` | - | Mock rate limits for testing |
| `/bridge-kick` | - | Inject bridge failure states for testing |
| `/version` | local | Print the version |
| `/ultraplan` | - | Ultra planning (ULTRAPLAN flag) |
| `/subscribe-pr` | - | Subscribe to PR webhooks (KAIROS_GITHUB_WEBHOOKS flag) |
| `/reset-limits` | local | Reset rate limits |
| `/onboarding` | - | Onboarding flow |
| `/share` | - | Share conversation |
| `/summary` | - | Summarize conversation |
| `/teleport` | - | Teleport to remote environment |
| `/ant-trace` | - | Ant tracing |
| `/perf-issue` | - | Performance issue reporting |
| `/env` | - | Environment variable display |
| `/oauth-refresh` | - | OAuth token refresh |
| `/debug-tool-call` | - | Debug tool calls |
| `/agents-platform` | - | Agents platform stub |
| `/autofix-pr` | - | Auto-fix PR |

### 2.13 Conditional / Feature-Flag-Dependent Commands

| Command | Flag/Condition | Notes |
|---------|---------------|-------|
| `/proactive` | `PROACTIVE \|\| KAIROS` | Toggle proactive autonomous mode |
| `/brief` | `KAIROS \|\| KAIROS_BRIEF` | Toggle brief-only mode |
| `/assistant` | `KAIROS` | Assistant stub |
| `/bridge` (`/remote-control`) | `BRIDGE_MODE` | Remote control bridge |
| `/voice` | `VOICE_MODE` | Voice mode toggle |
| `/fork` | `FORK_SUBAGENT` | Fork subagent (otherwise aliased to /branch) |
| `/web` | `CCR_REMOTE_SETUP` | Remote setup (web) |
| `/workflows` | `WORKFLOW_SCRIPTS` | Workflow script commands |
| `/peers` | `UDS_INBOX` | Peer inbox |
| `/torch` | `TORCH` | Torch mode |

---

## 3. Command Registration & Routing

### 3.1 Registration Flow

1. **Static imports**: Core commands are statically imported at the top of `commands.ts`
2. **Conditional imports**: Feature-gated commands are loaded via `require()` behind `feature()` checks
3. **Memoized assembly**: `COMMANDS()` (memoized via lodash) returns the full ordered array
4. **Dynamic sources merged in `loadAllCommands()`**:
   - Bundled skills (from `getBundledSkills()`)
   - Builtin plugin skills (from `getBuiltinPluginSkillCommands()`)
   - Skills directory commands (from `getSkillDirCommands(cwd)`)
   - Workflow commands (from `getWorkflowCommands(cwd)`, if `WORKFLOW_SCRIPTS` flag)
   - Plugin commands (from `getPluginCommands()`)
   - Plugin skills (from `getPluginSkills()`)
   - Built-in commands (from `COMMANDS()`)
   - Dynamic skills (from `getDynamicSkills()`, discovered during file operations)
5. **MCP skill commands** are handled separately via `getMcpSkillCommands()`

### 3.2 Skill Loading Hierarchy

Skills are loaded from multiple locations, in priority order:

1. **Managed skills**: `.claude/skills/` from managed settings
2. **User skills**: `~/.claude/skills/` (user home directory)
3. **Project skills**: `<project>/.claude/skills/` (project root)
4. **Additional directory skills**: From directories added via `/add-dir`
5. **Legacy commands**: `<project>/.claude/commands/` (deprecated path)
6. **Bundled skills**: Compiled into the CLI binary
7. **Builtin plugin skills**: From enabled built-in plugins
8. **Plugin skills**: From installed plugins
9. **MCP skills**: From MCP servers (if `MCP_SKILLS` flag enabled)

Deduplication is performed by resolved file path (using `realpath`).

### 3.3 Conditional Skill Activation

Skills can have a `paths` frontmatter field containing glob patterns. These "conditional skills" are:
- Not immediately available in the typeahead
- Stored in `conditionalSkills` map
- Activated when the model touches a file matching one of the `paths` patterns
- Once activated, remain available for the rest of the session

### 3.4 Command Lookup

```typescript
findCommand(commandName, commands)  // finds by name, getCommandName(), or aliases
getCommand(commandName, commands)   // same but throws ReferenceError if not found
hasCommand(commandName, commands)  // boolean check
```

### 3.5 Availability Gating

Before `isEnabled()` is checked, commands must pass `meetsAvailabilityRequirement()`:

- `availability: ['claude-ai']` -- only shown to claude.ai OAuth subscribers
- `availability: ['console']` -- only shown to direct Console API key users (1P base URL, not 3P)
- No `availability` -- universally available

---

## 4. Command Execution Flow

### 4.1 User Input Processing

When a user types `/<command>` in the REPL:

1. `processUserInput()` detects the leading `/`
2. `parseSlashCommand()` extracts command name and arguments
3. `getCommand(commandName, context.options.commands)` resolves the command
4. Execution branches by command type:

### 4.2 Type: `prompt`

1. `getPromptForCommand(args, context)` is called to generate the expanded prompt
2. Shell commands in the prompt (using `!\`command\`` syntax) are executed via `executeShellCommandsInPrompt()`
3. The resulting text is inserted as a user message into the conversation
4. The model processes the prompt on the next query cycle
5. If `context === 'fork'`, the command runs in a sub-agent with separate context and token budget

### 4.3 Type: `local`

1. `load()` is called to dynamically import the command module
2. `module.call(args, context)` is invoked
3. The returned `LocalCommandResult` determines display:
   - `{ type: 'text', value: '...' }` -- displayed as text
   - `{ type: 'compact', compactionResult, displayText }` -- triggers context compaction
   - `{ type: 'skip' }` -- no output

### 4.4 Type: `local-jsx`

1. `load()` is called to dynamically import the command module
2. An `onDone` callback is created
3. `module.call(onDone, context, args)` is invoked, returning a React element
4. The React element is rendered by Ink in the terminal
5. When the command completes, `onDone(result, options)` is called:
   - `options.display === 'skip'` -- no messages added
   - `options.display === 'system'` -- added as system message
   - `options.display === 'user'` (default) -- added as user message
   - `options.shouldQuery === true` -- triggers model query after command
   - `options.nextInput` -- auto-fills next user input
   - `options.submitNextInput` -- auto-submits next input

### 4.5 Immediate Execution

Commands with `immediate: true` bypass the command queue and execute immediately when the user presses Enter, without waiting for the current model turn to complete. This is used for:
- `/exit`, `/quit`
- `/rename`
- `/btw`
- `/color`
- `/status`
- `/hooks`
- `/mcp`
- `/sandbox`
- `/remote-control`
- `/advisor`

---

## 5. Remote & Bridge Safety

### 5.1 Remote-Safe Commands

When running in `--remote` mode, only these commands are available:

```
/session (remote), /exit, /clear, /help, /theme, /color, /vim, /cost,
/usage, /copy, /btw, /feedback, /plan, /keybindings, /statusline,
/stickers, /mobile
```

### 5.2 Bridge-Safe Commands

When a command arrives over the Remote Control bridge (mobile/web client):
- `prompt` type commands: always allowed (they expand to text)
- `local` type commands: only if in `BRIDGE_SAFE_COMMANDS` set (compact, clear, cost, summary, release-notes, files)
- `local-jsx` type commands: always blocked (they render Ink UI locally)

---

## 6. Bundled Skills System

Bundled skills ship compiled into the CLI binary and are available to all users. They are registered programmatically via `registerBundledSkill()`.

### 6.1 Known Bundled Skills (from i18n strings)

| Skill Name | Description | When To Use |
|------------|-------------|-------------|
| `/claude-api` | Build apps with the Claude API or Anthropic SDK | Triggered when code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk` |
| `/claude-in-chrome` | Automate Chrome browser to interact with web pages | When user wants browser automation, screenshots, console logs |
| `/verify` | Verify codebase and environment meet all requirements | When checking dependencies, configuration, common issues |
| `/remember` | Review auto-memory entries and propose promotions | When user wants to review, organize, or promote memory entries |
| `/simplify` | Review changed code for reuse, quality, and efficiency, then fix | After code changes, to review and improve |
| `/skillify` | Capture this session's repeatable process into a skill | At end of a process to capture it as a reusable skill |
| `/update-config` | Update Claude Code configuration programmatically | When programmatically modifying config |
| `/schedule` | Create, update, list, or run scheduled remote agents | When scheduling recurring remote agents |
| `/batch` | Research and plan a large-scale change, execute in parallel | When making sweeping changes across many files |
| `/debug` | Enable debug logging for this session | When diagnosing issues |
| `/dream` | Manually trigger memory consolidation | When manually consolidating and organizing memory files |
| `/loop` | Run a prompt or slash command on a recurring interval | When setting up recurring tasks |
| `/lorem-ipsum` | Generate filler text for long context testing | Internal testing only |

### 6.2 Bundled Skill Definition Shape

```typescript
type BundledSkillDefinition = {
  name: string
  description: string | (() => string)
  aliases?: string[]
  whenToUse?: string | (() => string)
  argumentHint?: string
  allowedTools?: string[]
  model?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  isEnabled?: () => boolean
  hooks?: HooksSettings
  context?: 'inline' | 'fork'
  agent?: string
  files?: Record<string, string>  // Reference files extracted on first use
  getPromptForCommand(args, context): Promise<ContentBlockParam[]>
}
```

---

## 7. Plugin Command System

### 7.1 Plugin Commands

Plugins can contribute:
- **Commands** (type `local-jsx`): UI-based commands from plugin UI components
- **Skills** (type `prompt`): Prompt-based commands with frontmatter

### 7.2 Plugin Command Loading

1. `getPluginCommands()` discovers installed plugins
2. `getPluginSkills()` extracts prompt-based skills from plugins
3. Plugin skills require an explicit `description` in frontmatter to appear in SkillTool listings
4. Plugin commands are marked with `source: 'plugin'` and `pluginInfo` metadata

### 7.3 Moved-to-Plugin Commands

Some commands have been migrated to plugins. The `createMovedToPluginCommand()` helper creates a shim that:
- Shows the command in typeahead with the original description
- On invocation, checks if the plugin is installed
- If installed, delegates to the plugin's command
- If not installed, offers to install it

Current moved commands:
- `/security-review` -- moved to `security-review` plugin

---

## 8. Skill Tool (Model Invocation)

The model can invoke skills through the `SkillTool` (also called `SlashCommandTool`). This tool:

1. Receives a `command` parameter with the skill name
2. Looks up the command via `findCommand(commandName, commands)`
3. Checks `disableModelInvocation` -- if true, the model cannot invoke it
4. For `prompt` type: calls `getPromptForCommand()` and inserts the result as a user message
5. Filters visible skills:
   - Always includes skills from `/skills/` dirs, bundled skills, and legacy `/commands/` entries
   - Plugin/MCP skills require explicit description to appear in model listing
   - Excludes `source: 'builtin'` commands (those are user-invoked only)

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `packages/cli/src/commands.ts` | Central command registry, `getCommands()`, `findCommand()`, availability gating |
| `packages/cli/src/types/command.ts` | `Command`, `CommandBase`, `PromptCommand`, `LocalCommand`, `LocalJSXCommand` type definitions |
| `packages/cli/src/commands/*/index.ts` | Individual command metadata (lazy-loaded implementations) |
| `packages/cli/src/utils/processUserInput/processSlashCommand.tsx` | Main command dispatch logic, type-switched execution |
| `packages/cli/src/runtime/slashCommands.ts` | Packages-native simplified command handler |
| `packages/cli/src/skills/loadSkillsDir.ts` | Skills directory loading, deduplication, conditional activation |
| `packages/cli/src/skills/bundledSkills.ts` | Bundled skill registration system |
| `packages/cli/src/utils/plugins/loadPluginCommands.ts` | Plugin command and skill discovery |
| `packages/cli/src/utils/i18n/locales/en/command.ts` | English command description strings |
| `packages/cli/src/components/HelpV2/Commands.tsx` | Help screen command list rendering |

---

## 10. Architecture Summary

```
User types /<command>
       |
       v
  parseSlashCommand()
       |
       v
  getCommand(name, commands)
       |
       +-- Not found --> "Unknown command" error message
       |
       +-- userInvocable === false --> "Can only be invoked by Claude"
       |
       +-- meetsAvailabilityRequirement() fails --> hidden
       |
       +-- isEnabled() returns false --> hidden
       |
       v
  Switch on command.type:
       |
       +-- 'prompt' --> getPromptForCommand()
       |                  --> executeShellCommandsInPrompt()
       |                  --> Insert as user message
       |                  --> Model processes on next query
       |                  [if context: 'fork' --> sub-agent]
       |
       +-- 'local' --> load().call(args, ctx)
       |                 --> LocalCommandResult
       |                 --> Display text / compact / skip
       |
       +-- 'local-jsx' --> load().call(onDone, ctx, args)
                            --> React element rendered by Ink
                            --> onDone() callback completes
                            --> Insert messages per display option
                            --> [if shouldQuery] trigger model query
```

The system is designed for lazy loading (all implementations use dynamic `import()`), memoized command lists (lodash `memoize` with cache clearing on changes), and multi-source skill aggregation with deduplication.
