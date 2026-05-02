# Phase 5: External Integration Acceptance Checklist

This document defines the manual verification steps for external integrations
that cannot be fully automated in the test suite. Each item should be verified
before the default `cclocal` entry switches from legacy Ink UI to native REPL.

## 1. IDE Integration (--ide)

- [ ] `cclocal --native --ide` starts and includes IDE metadata in messages
- [ ] VS Code extension (`@cclocal/vscode-ext`) connects when `--ide` flag is active
- [ ] File open/selection events are relayed to the session
- [ ] Diagnostics (errors/warnings) appear in model context when available

## 2. Chrome Integration (--chrome)

- [ ] `cclocal --native --chrome` starts and includes Chrome metadata
- [ ] `--no-chrome` suppresses Chrome integration metadata
- [ ] Chrome extension (if available) can connect to the session

## 3. Tmux Integration (--tmux)

- [ ] `cclocal --native --tmux` starts with tmux mode metadata
- [ ] `--tmux=classic` uses traditional tmux instead of iTerm2 native panes
- [ ] Session survives tmux detach/reattach

## 4. Worktree Sessions (-w / --worktree)

- [ ] `cclocal --native -w` creates a new worktree and links it to the session
- [ ] `cclocal --native -w existing-name` references an existing worktree
- [ ] Worktree files are accessible to FileRead/FileEdit tools
- [ ] Worktree cleanup works on session exit

## 5. Plugin System

- [ ] `cclocal --native --plugin-dir <path>` loads plugins from the specified directory
- [ ] `/plugin list` shows installed plugins
- [ ] `/plugin validate <path>` validates a plugin without installing
- [ ] `/plugin install <path>` installs a plugin
- [ ] `/plugin uninstall <name>` removes a plugin
- [ ] Plugin-provided slash commands appear in `/help`
- [ ] Plugin-provided tools appear in `/tools`

## 6. Authentication (--auth-token / setup-token)

- [ ] `cclocal --native --auth-token <token>` authenticates with the server
- [ ] `/auth status` shows current authentication state
- [ ] `/auth login --api-token <token>` stores a token
- [ ] `/auth logout` clears the stored token
- [ ] `cclocal setup-token --api-token <token>` stores a long-lived token
- [ ] Token persists across sessions in `~/.claude/config.json`

## 7. Update/Upgrade

- [ ] `cclocal --native update` shows current version and available updates
- [ ] `cclocal --native upgrade` downloads and applies update (with --apply)
- [ ] `cclocal --native upgrade --json` returns machine-readable output

## 8. Session Persistence

- [ ] `cclocal --native --resume <id>` resumes an existing session
- [ ] `cclocal --native --continue` continues the most recent session in cwd
- [ ] `/resume <id>` switches to an existing session mid-conversation
- [ ] `/continue` switches to the most recent session
- [ ] Session messages survive process restart
- [ ] `/fork` creates a new session branching from the current one

## 9. MCP Server Lifecycle

- [ ] `/mcp connect <name>` connects an MCP server
- [ ] `/mcp disconnect <name>` disconnects an MCP server
- [ ] `/mcp list` shows all configured servers with status
- [ ] `/mcp <name>` shows details for a specific server
- [ ] MCP-provided tools appear in `/tools` after connection
- [ ] MCP tool calls succeed via native QueryEngine

## 10. Permission Modes

- [ ] `--permission-mode default` prompts for high-risk tools
- [ ] `--permission-mode dontAsk` auto-denies high-risk tools
- [ ] `--permission-mode acceptEdits` auto-allows file edits, denies bash
- [ ] `--permission-mode bypassPermissions` auto-allows everything
- [ ] `/permissions` shows current mode
- [ ] `/permissions <mode>` switches mode mid-session

---

## Automated Smoke Test

The following can be validated programmatically and are covered by `bun run test`:

- Model list endpoint returns valid models
- Session CRUD operations work
- Basic message send/receive with text streaming
- Tool call events are emitted during multi-turn queries
- Permission denied events fire for blocked tools
- Cancel generation works mid-stream
- `--print` mode outputs text and exits
- `--output-format json` returns valid JSON
