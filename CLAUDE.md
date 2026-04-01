# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

This is **Claude Code Rebuilt** - a fully functional reconstruction of Anthropic's Claude Code CLI from leaked source code. The original source contained only `src/` directory; this project adds all missing build configuration, dependencies, type definitions, and compatibility shims.

**Key points:**
- Runtime: Bun (not Node.js)
- Language: TypeScript (strict mode)
- UI: React + Ink (terminal UI)
- **Important**: All `.tsx` files are React Compiler output (not original source)
- Internal Anthropic features are disabled via feature flags (91 flags total: 3 enabled, 88 disabled)

---

## Common Commands

| Command | Purpose |
|---|---|
| `bun install` | Install dependencies |
| `bun run start` | Launch interactive REPL |
| `bun run start -- --help` | Show CLI flags/subcommands |
| `bun run start -- --print "prompt"` | One-shot prompt mode |
| `bun run build` | Build single-file bundle to `dist/cli.js` |
| `bun run typecheck` | Run TypeScript type checking |

---

## Documentation

Before making changes, refer to these comprehensive documents:

| Document | Purpose |
|---|---|
| `DEVELOPING.md` | Complete development guide for secondary development |
| `docs/module-development.md` | How to add new tools, commands, components, skills, plugins |
| `docs/debugging.md` | Debugging guide and troubleshooting |
| `docs/FAQ.md` | Frequently asked questions |
| `PROJECT_ANALYSIS.md` | Deep architecture analysis with diagrams |

---

## Code Architecture

### Important Note About .tsx Files

**All `.tsx` files in this repository are React Compiler output**, not original source code. They all contain:
```typescript
import { c as $$c } from "react/compiler-runtime";
```

A 3-layer shim system handles this:
1. **Runtime**: `src/_external/preload.ts` - Bun plugin that shims `react/compiler-runtime`
2. **Build-time**: `scripts/build-external.ts` - Build plugin for the same
3. **TypeScript**: `src/types/react-compiler-runtime.d.ts` + `tsconfig.json` path mapping

### Entrypoint Flow
1. **`src/entrypoints/cli.tsx`** - Bootstrap entry with fast-path handling for `--version`, special daemon modes, etc. Uses dynamic imports to minimize startup time.
2. **`src/main.tsx`** - Commander CLI setup, REPL launch (785KB file)
3. **REPL screen** - Interactive terminal UI in `src/screens/REPL.tsx`.

### Key Modules

| Module | Purpose |
|---|---|
| `src/tools.ts` | Registry of all built-in tools (50+ tools) |
| `src/commands.ts` | Registry of slash-commands (100+ commands) |
| `src/query.ts` | LLM query engine with infinite loop architecture |
| `src/Tool.ts` | Base tool type definitions |
| `src/ink/` | Custom Ink terminal renderer (52 files) |
| `src/components/` | React terminal UI components (146+) |
| `src/screens/` | Full-screen UIs (REPL, Doctor, Resume) |
| `src/services/` | API client, MCP, analytics, context compaction (41+) |
| `src/hooks/` | React hooks (87+) |
| `src/utils/` | Utility functions (335+) |
| `src/state/` | AppState with 450+ fields for global state |

### Query Engine Architecture

The query engine uses an infinite loop pattern:
1. Receive user input
2. Send to Anthropic API
3. Model may return tool calls
4. Execute tools and return results
5. Repeat until model generates final answer

Core in `src/query.ts` - `queryLoop()` function.

### Tool System

Tools are defined in `src/tools/<ToolName>/` directories:
- Use Zod for input/output schemas
- Implement `call()` method for core logic
- `checkPermissions()` for authorization
- Register in `src/tools.ts`

50+ tools including: FileReadTool, BashTool, AgentTool, WebSearchTool, EditTool, etc.

### Command System

Slash commands (`/command`) are in `src/commands/<command-name>/`:
- **3 types**: `local` (text output), `local-jsx` (UI output), `prompt` (sends to model)
- Implement `run()` method
- Register in `src/commands.ts`

100+ commands including: help, model, plan, commit, cost, stats, etc.

### Build Compatibility Layer

The original code depends on internal Anthropic build infrastructure. This project provides:

- **`src/_external/preload.ts`** - Runtime shim for `bun:bundle` module, `MACRO.*` globals, and `react/compiler-runtime`
- **`src/_external/shims/`** - Stub packages for `@ant/*` internal packages and native NAPI addons
- **`scripts/build-external.ts`** - `Bun.build()` script with feature flag handling (91 flags: 88 disabled, 3 enabled)
- **`src/types/`** - Reconstructed type definitions for missing modules

### Feature Flags

Most internal features are disabled (see `scripts/build-external.ts`). Only these are enabled:
- `AUTO_THEME`
- `BREAK_CACHE_COMMAND`
- `BUILTIN_EXPLORE_PLAN_AGENTS`

---

## Important Patterns

- **Dynamic imports** used extensively for fast startup
- **Tool system**: Tools defined in `src/tools/*/` directories, registered in `tools.ts`
- **Command system**: Slash commands defined in `src/commands/*/`, registered in `commands.ts`
- **React + Ink**: Terminal UI uses React components rendered via custom Ink
- **State management**: `useAppState` hook with selectors for AppState (450+ fields)
- **TypeScript**: Strict mode enabled; many type errors are expected (missing original types) - use `// @ts-ignore` when needed

---

## Type Checking

Many TypeScript errors are expected due to:
- Missing original type definitions
- Internal `@ant/*` packages without types
- React Compiler output with incomplete type information

**These errors do not affect runtime.** Bun runs the code directly. Use `bun run typecheck` to check, but don't be alarmed by many errors.

---

## Debugging

See `docs/debugging.md` for comprehensive debugging guide. Quick tips:
- `export DEBUG=*` for debug logging
- Use `logForDebugging()` from `src/utils/debug.ts`
- Add `console.log()` in tool/command implementations
- Check `DEVELOPING.md` for more
