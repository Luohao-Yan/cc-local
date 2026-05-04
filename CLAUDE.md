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
- Internal Anthropic features are disabled via feature flags (91 flags total: 88 disabled, 6 enabled)

---

## Monorepo Structure

This is a Bun workspaces monorepo. All code lives under `packages/`:

| Package | Path | Purpose |
|---|---|---|
| `@cclocal/cli` | `packages/cli/` | CLI entry point, REPL, commands, tools, Ink UI |
| `@cclocal/core` | `packages/core/` | QueryEngine, tool registry, MCP manager, session store |
| `@cclocal/server` | `packages/server/` | REST + WebSocket API server |
| `@cclocal/shared` | `packages/shared/` | Shared types and utilities |
| `@cclocal/vscode-ext` | `packages/vscode-ext/` | VS Code extension |

---

## Common Commands

| Command | Purpose |
|---|---|
| `bun install` | Install dependencies |
| `bun run start` | Launch CLI (default: delegates to Ink UI via spawnSync) |
| `bun run start -- --help` | Show CLI flags/subcommands |
| `bun run start -- --print "prompt"` | One-shot prompt mode |
| `bun run start -- --ink-bridge` | Use in-process Ink bridge instead of spawnSync |
| `bun run start -- --legacy-bridge` | Same as --ink-bridge (backward compatibility) |
| `bun run build` | Build all 3 targets: cli.js, server.js, legacy-cli.js |
| `bun run build:legacy` | Legacy-only build (CCLOCAL_BUILD_LEGACY=1) |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run test` | Run vitest |
| `bun run parity:check` | Audit packages parity vs legacy CLI |

---

## Documentation

| Document | Purpose |
|---|---|
| `DEVELOPING.md` | Complete development guide |
| `docs/module-development.md` | How to add new tools, commands, components, skills, plugins |
| `docs/debugging.md` | Debugging guide and troubleshooting |
| `docs/FAQ.md` | Frequently asked questions |
| `PROJECT_ANALYSIS.md` | Deep architecture analysis with diagrams |
| `MIGRATION_MATRIX.md` | Migration status tracking |
| `UI_MIGRATION_PLAN.md` | UI migration plan (Phase 0-5) |
| `UI_DEPENDENCY_MAP.md` | 7-layer UI dependency map |

---

## Code Architecture

### Important Note About .tsx Files

**All `.tsx` files in this repository are React Compiler output**, not original source code. They all contain:
```typescript
import { c as $$c } from "react/compiler-runtime";
```

A 3-layer shim system handles this:
1. **Runtime**: `packages/cli/src/_external/preload.ts` - Bun plugin that shims `react/compiler-runtime`
2. **Build-time**: `scripts/build-external.ts` - Build plugin for the same
3. **TypeScript**: `packages/cli/src/types/react-compiler-runtime.d.ts` + `tsconfig.json` path mapping

### Entrypoint Flow
1. **`packages/cli/src/index.ts`** - Unified routing entry: delegates to Ink UI (spawnSync) or packages-native commands
2. **`packages/cli/src/entrypoints/cli.tsx`** - Legacy bootstrap entry with fast-path handling
3. **`packages/cli/src/main.tsx`** - Commander CLI setup, REPL launch
4. **`packages/cli/src/screens/REPL.tsx`** - Interactive terminal UI

### Key Modules (under `packages/cli/src/`)

| Module | Purpose |
|---|---|
| `tools.ts` | Registry of all built-in tools (50+ tools) |
| `commands.ts` | Registry of slash-commands (100+ commands) |
| `query.ts` | LLM query engine with infinite loop architecture |
| `Tool.ts` | Base tool type definitions |
| `ink/` | Custom Ink terminal renderer (52 files) |
| `components/` | React terminal UI components (146+) |
| `screens/` | Full-screen UIs (REPL, Doctor, Resume) |
| `services/` | API client, MCP, analytics, context compaction (41+) |
| `hooks/` | React hooks (87+) |
| `utils/` | Utility functions (335+) |
| `state/` | AppState with 450+ fields for global state |

### New Architecture (under `packages/core/` and `packages/cli/src/`)

| Module | Purpose |
|---|---|
| `packages/core/src/engine/queryEngine.ts` | New query engine (Promise-based, policy-driven) |
| `packages/core/src/tools/registry.ts` | New tool registry (18 core + bridge adapters) |
| `packages/core/src/mcp/MCPManager.ts` | MCP connection manager (stdio/sse/http) |
| `packages/core/src/db/sessionStore.ts` | SQLite session persistence (bun:sqlite) |
| `packages/cli/src/bridge/queryEngineAdapter.ts` | AsyncGenerator adapter for new engine |
| `packages/cli/src/bridge/toolAdapters.ts` | Legacy tool → new Tool interface adapters |
| `packages/cli/src/runtime/inkBridgeRenderer.ts` | Bridge renderer for REPL |
| `packages/cli/src/runtime/legacyBridgeRenderer.ts` | Bridge renderer for REPL |

### Feature Flags

Most internal features are disabled (see `scripts/build-external.ts`). Enabled flags:
- `AUTO_THEME` - Theme auto-switching and full theme list
- `BREAK_CACHE_COMMAND` - Cache invalidation command
- `BUDDY` - Companion feature
- `BUILTIN_EXPLORE_PLAN_AGENTS` - Explore/Plan agent types
- `TRANSCRIPT_CLASSIFIER` - Auto Mode classifier
- `BASH_CLASSIFIER` - Bash command classifier (Auto Mode dependency)

---

## Important Patterns

- **Dynamic imports** used extensively for fast startup
- **Tool system**: Tools defined in `packages/cli/src/tools/*/`, registered in `tools.ts`
- **Command system**: Slash commands defined in `packages/cli/src/commands/*/`, registered in `commands.ts`
- **React + Ink**: Terminal UI uses React components rendered via custom Ink
- **State management**: `useAppState` hook with selectors for AppState (450+ fields)
- **TypeScript**: Strict mode enabled; many type errors are expected (missing original types) - use `// @ts-ignore` when needed
- **No console.log**: Use `logForDebugging()` from `packages/cli/src/utils/debug.ts` in tool/command implementations

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
- Use `logForDebugging()` from `packages/cli/src/utils/debug.ts`
- Check `DEVELOPING.md` for more
