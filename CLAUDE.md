# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

This is **Claude Code Rebuilt** - a fully functional reconstruction of Anthropic's Claude Code CLI from leaked source code. The original source contained only `src/` directory; this project adds all missing build configuration, dependencies, type definitions, and compatibility shims.

**Key points:**
- Runtime: Bun (not Node.js)
- Language: TypeScript (strict mode)
- UI: React + Ink (terminal UI)
- Internal Anthropic features are disabled via feature flags

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

## Code Architecture

### Entrypoint Flow
1. **`src/entrypoints/cli.tsx`** - Bootstrap entry with fast-path handling for `--version`, special daemon modes, etc. Uses dynamic imports to minimize startup time.
2. **`src/main.tsx`** - Commander CLI setup, REPL launch.
3. **REPL screen** - Interactive terminal UI in `src/screens/REPL.tsx`.

### Key Modules

| Module | Purpose |
|---|---|
| `src/tools.ts` | Registry of all built-in tools (Bash, Read, Edit, Agent, etc.) |
| `src/commands.ts` | Registry of slash-commands (`/help`, `/model`, `/init`, etc.) |
| `src/query.ts` | LLM query engine |
| `src/Tool.ts` | Base tool type definitions |
| `src/components/` | React terminal UI components |
| `src/screens/` | Full-screen UIs (REPL, Doctor, Resume) |
| `src/services/` | API client, MCP, analytics, context compaction |

### Build Compatibility Layer

The original code depends on internal Anthropic build infrastructure. This project provides:

- **`src/_external/preload.ts`** - Runtime shim for `bun:bundle` module and `MACRO.*` globals
- **`src/_external/shims/`** - Stub packages for `@ant/*` internal packages and native NAPI addons
- **`scripts/build-external.ts`** - `Bun.build()` script with feature flag handling (89 features disabled, 3 enabled)
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
- **React + Ink**: Terminal UI uses React components rendered via Ink
