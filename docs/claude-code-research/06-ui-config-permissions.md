# 06 - UI, Configuration & Permissions

## Terminal UI Architecture

### React + Ink Stack

Claude Code's terminal UI is built on:
- **React** (via React Compiler output with `$$c` imports)
- **Ink** - React-based terminal rendering (custom fork, 52 files in `ink/`)
- **React Compiler** - All `.tsx` files are compiled output with `c as $$c` from `react/compiler-runtime`

### Key UI Screens

| Screen | File | Description |
|---|---|---|
| REPL | `screens/REPL.tsx` | Main interactive terminal UI |
| Doctor | `screens/Doctor.tsx` | Health check diagnostics |
| Resume | `screens/Resume.tsx` | Session resume picker |

### Component Architecture (146+ components)

```
components/
├── App.tsx                    # Root app component
├── Message.tsx                # Message display
├── Messages.tsx               # Message list (virtual)
├── PromptInput/               # Input bar & footer
│   ├── PromptInput.tsx
│   ├── PromptInputFooter.tsx
│   └── VoiceIndicator.tsx
├── permissions/               # Permission dialogs
│   ├── PermissionDialog.tsx
│   ├── BashPermissionRequest.tsx
│   └── FileEditPermissionRequest.tsx
├── Spinner/                   # Loading animations
│   ├── SpinnerGlyph.tsx
│   └── ShimmerChar.tsx
├── LogoV2/                    # Welcome screen & branding
│   ├── WelcomeV2.tsx
│   └── Feed.tsx
├── diff/                      # Diff display
│   ├── DiffDialog.tsx
│   └── DiffDetailView.tsx
├── agents/                    # Agent management UI
├── mcp/                       # MCP server management UI
├── design-system/             # Shared UI components
│   ├── Dialog.tsx
│   ├── FuzzyPicker.tsx
│   └── ThemedText.tsx
└── ...
```

### Virtual Message List

Messages are rendered in a virtual list (`VirtualMessageList.tsx`) for performance with large conversations.

## Theme System

### Theme Configuration
- Auto-theme detection (`AUTO_THEME` feature flag)
- Multiple built-in themes (full list enabled by feature flag)
- `/theme` command for interactive theme picker
- Themes stored in settings

### Color System
- `design-system/color.ts` - Color definitions
- `ThemedBox.tsx`, `ThemedText.tsx` - Theme-aware components
- `ThemeProvider.tsx` - React context for theme

## Configuration Hierarchy

### Settings Sources (priority low→high)
1. **Default settings** - Hardcoded defaults
2. **User settings** - `~/.claude/settings.json`
3. **Project settings** - `.claude/settings.json` (checked into repo)
4. **Local settings** - `.claude/settings.local.json` (gitignored)
5. **Managed/policy settings** - Organization-managed
6. **CLI flags** - `--settings`, `--permission-mode`, etc.

### Settings Schema
```json
{
  "permissions": {
    "allow": ["Bash(git *)", "Read", "Edit"],
    "deny": ["Bash(rm -rf *)"]
  },
  "hooks": { ... },
  "mcpServers": { ... },
  "model": "sonnet",
  "theme": "dark",
  "outputStyle": "default",
  "effortLevel": "medium",
  "agent": "default",
  "memoryExclusions": ["..."],
  "disableAllHooks": false,
  "allowGitConfigWrites": false,
  "plugins": ["..."]
}
```

### Setting Source Filtering
`--setting-sources <sources>` controls which sources are loaded:
- `user` - User-level settings
- `project` - Project-level settings
- `local` - Local settings

## Permission Modes

| Mode | Behavior |
|---|---|
| `default` | Prompt user for each tool that isn't auto-allowed |
| `auto` | Use LLM classifier to decide permissions automatically |
| `plan` | Only plan, require approval before implementation |
| `acceptEdits` | Auto-approve file edits, prompt for everything else |
| `dontAsk` | Auto-approve everything that config rules don't deny |
| `bypassPermissions` | Skip all permission checks (requires `--dangerously-skip-permissions`) |

### Permission Rules
Permission rules use glob-style patterns:
```
allow:
  - "Bash(git *)"         # Allow any git command
  - "Read"                # Allow all file reads
  - "Edit"                # Allow all file edits
  - "Bash(npm test)"      # Allow specific command

deny:
  - "Bash(rm -rf *)"      # Deny destructive commands
  - "Bash(curl *)"        # Deny network requests
```

### Organization Policy Enforcement
- Bypass permissions can be disabled by organization policy
- Managed settings can enforce specific permission rules
- `disableAllHooks` can be set at organization level

## Hooks System

### Hook Events

| Event | Trigger | Input |
|---|---|---|
| `PreToolUse` | Before tool execution | `tool_name`, `tool_input`, `permissionDecision`, `permissionDecisionReason` |
| `PostToolUse` | After tool execution | `tool_name`, `tool_input`, `tool_response` |
| `PromptSubmit` | When user submits prompt | User message content |
| `SessionStart` | When session starts | Empty `{}` |
| `Stop` | When Claude finishes a turn | Empty `{}` |

### Hook Configuration
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}' | my-validator"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "prettier --write"
      }]
    }]
  }
}
```

### Hook Types

| Type | Description |
|---|---|
| `command` | Shell command to execute |
| `prompt` | Inject a prompt into conversation |
| `agent` | Spawn a sub-agent |
| `http` | HTTP webhook call |
| `mcp_tool` | Call an MCP tool |

### Hook Input/Output
- **Input**: JSON on stdin with `tool_name`, `tool_input`, etc.
- **Output (PreToolUse)**: Can modify `updatedInput`, set `permissionDecision` to `allow`/`deny`/`ask`
- **Output (PostToolUse)**: Processed after tool execution
- **Exit code**: 0 = continue, non-zero = block (PreToolUse)

### Hook Matcher Patterns
- `"Bash"` - Match specific tool name
- `"Write|Edit"` - Match multiple tools (pipe separator)
- Omit `matcher` to match all tools

## Plugin System

### Plugin Sources
- **Local directory**: `--plugin-dir <path>` (repeatable)
- **URL**: `--plugin-url <url>` (download zip)
- **Marketplace**: Browse and install from plugin registry
- **Official plugins**: `https://raw.githubusercontent.com/anthropics/claude-plugins-official/...`

### Plugin Configuration
```json
{
  "plugins": ["code-review@claude-code-plugins"],
  "plugin_marketplaces": ["https://github.com/anthropics/claude-code.git"]
}
```

### Plugin Commands
| Command | Description |
|---|---|
| `/plugins` | Manage plugins (install, browse, settings) |
| `/reload-plugins` | Reload plugins after changes |

## Output Formats

| Format | Flag | Description |
|---|---|---|
| `text` | Default | Human-readable terminal output |
| `json` | `--output-format=json` | Single JSON result (print mode) |
| `stream-json` | `--output-format=stream-json` | Real-time streaming JSON events |

### Stream JSON Events
```
assistant.message_start     → Message begins
assistant.content_block     → Content delta
assistant.message_delta     → Stop reason, usage
user.tool_result            → Tool execution result
assistant.thinking          → Extended thinking content
```

## Keybinding System

- Configurable keybindings
- JSON schema: `https://www.schemastore.org/claude-code-keybindings.json`
- Vim mode support (`/vim` command)
- Custom shortcut definitions

## Feature Flags / Betas

Beta headers can be passed via `--betas`:
```
claude --betas structured-outputs-2025-11-13
```

These map to Anthropic API beta features for:
- Structured outputs
- Extended caching
- New model capabilities
