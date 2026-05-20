# Claude Code npm Package Research (v2.1.141)

> Full reverse-engineering analysis of the official `@anthropic-ai/claude-code` npm package, version 2.1.141.

## Package Overview

| Property | Value |
|---|---|
| Package | `@anthropic-ai/claude-code` |
| Version | 2.1.141 |
| Runtime | Bun (compiled native binary) |
| Binary Size | ~218 MB (per platform) |
| Platforms | darwin-arm64, darwin-x64, linux-x64, linux-arm64, linux-x64-musl, linux-arm64-musl, win32-x64, win32-arm64 |
| Entry Point | `bin/claude.exe` (native binary) |
| Fallback | `cli-wrapper.cjs` (Node.js wrapper) |
| Install Script | `install.cjs` (copies platform binary) |

## Architecture Summary

Claude Code is a **Bun-compiled native binary** that bundles the entire application into a single executable. The JS/TS source code is transpiled and embedded in the binary using Bun's Virtual File System (VFS). Key architectural layers:

```
+------------------------------------------+
|              CLI Entry Point             |
|         bin/claude.exe (Bun)             |
+------------------------------------------+
|           Commander.js CLI Parser        |
|    (flags, subcommands, routing)         |
+------------------------------------------+
|         Query Engine (Core Loop)         |
|  LLM API <-> Tool Execution <-> UI      |
+------------------------------------------+
|    Tool System    |   Command System     |
|  (18+ built-in)   |  (100+ slash cmds)   |
+------------------------------------------+
|  MCP Manager  |  Session Store (SQLite) |
+------------------------------------------+
|   React + Ink Terminal UI (146+ comps)   |
+------------------------------------------+
|   API Client  |  Auth  |  Config  |  Hooks |
+------------------------------------------+
```

## Module Documentation Index

| # | Module | File | Description |
|---|---|---|---|
| 01 | Tool System | [01-tool-system.md](01-tool-system.md) | Built-in tools, registration, permissions, execution flow |
| 02 | Command System | [02-command-system.md](02-command-system.md) | Slash commands, routing, subcommands, help system |
| 03 | System Prompts | [03-system-prompts.md](03-system-prompts.md) | Prompt engineering, sections, tool instructions, mode-specific prompts |
| 04 | API & Auth | [04-api-and-auth.md](04-api-and-auth.md) | API endpoints, providers, authentication, streaming, cost tracking |
| 05 | MCP & Session | [05-mcp-and-session.md](05-mcp-and-session.md) | MCP protocol, session persistence, state management, compaction |
| 06 | UI, Config & Permissions | [06-ui-config-permissions.md](06-ui-config-permissions.md) | Terminal UI, themes, config hierarchy, permission modes, hooks, plugins |
| 07 | Package Structure | [07-package-structure.md](07-package-structure.md) | npm package layout, install flow, platform binaries, wrapper scripts |
| 08 | SDK Integration | [08-sdk-integration.md](08-sdk-integration.md) | Claude Agent SDK, programmatic API, tool schemas (sdk-tools.d.ts) |
| 09 | Parity Comparison | [09-parity-comparison.md](09-parity-comparison.md) | 官方 npm vs cc-local 功能差异逐模块对比 |

## Key Findings

1. **Bun-native binary**: The entire app is compiled to a native executable via `bun build --compile`, with JS bytecode and VFS embedded in the binary.
2. **Platform-specific packages**: 8 platform binaries published as optional dependencies; install.cjs selects and copies the correct one.
3. **Fallback wrapper**: `cli-wrapper.cjs` provides a Node.js fallback that spawns the native binary.
4. **SDK type definitions**: `sdk-tools.d.ts` exports full TypeScript interfaces for all tool inputs/outputs for SDK consumers.
5. **React + Ink UI**: Terminal UI uses React components rendered via a custom Ink renderer (52 files in `ink/` directory).
6. **SQLite sessions**: Session persistence uses bun:sqlite for local storage.
7. **Multi-provider support**: Anthropic API, AWS Bedrock, Google Vertex, Foundry, and custom OpenAI-compatible providers.
8. **Extensibility**: MCP servers, hooks, plugins, custom agents, and custom slash commands.

## Methodology

- Downloaded and extracted `@anthropic-ai/claude-code@2.1.141` npm tarball
- Downloaded and extracted `@anthropic-ai/claude-code-win32-x64@2.1.141` platform tarball
- Analyzed binary structure: PE32+ executable, Bun-compiled with embedded VFS
- Extracted readable strings from binary using `grep -aoE` pattern matching
- Identified VFS structure with `bun-vfs` markers containing Node.js built-in shims
- Mapped tool names, command names, API endpoints, and architectural patterns from string extraction
- Analyzed `sdk-tools.d.ts` for complete tool input/output schemas
- Cross-referenced with `--help` output for CLI flags and subcommands
