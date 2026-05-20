# 03 - System Prompts

## Overview

Claude Code uses a sophisticated system prompt architecture with multiple sections that are dynamically assembled based on the session context. The prompts are embedded in the compiled binary and loaded at runtime.

## Main System Prompt

The core identity statement:

```
You are Claude Code, Anthropic's official CLI for Claude.
You are an interactive agent that helps users with software engineering tasks.
```

SDK variant:
```
You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK.
```

## System Prompt Sections

The system prompt is composed of multiple sections loaded dynamically:

### 1. Identity Section
- Core role definition as a CLI tool
- Capabilities description (codebase understanding, file editing, terminal commands, workflows)

### 2. Tool Usage Instructions
- When to use tools vs. respond directly
- Tool selection guidance
- Input validation requirements
- Error handling patterns

### 3. Permission & Safety Instructions
- Reversibility and blast radius considerations
- Confirmation requirements for destructive operations
- Scope matching guidelines
- Git safety protocol (no --no-verify, no --force push to main)

### 4. Code Style Instructions
- No console.log (use logForDebugging)
- No emojis unless requested
- Short, concise responses
- File path:line_number references

### 5. Memory/CLAUDE.md Instructions
- How to read and respect CLAUDE.md files
- Memory file discovery and loading
- Project-specific conventions

### 6. Effort Level Instructions
- Effort level categories: low, medium, high, xhigh, max
- How effort affects response depth and thoroughness
- Per-tool effort adjustments

### 7. Mode-Specific Instructions
- Plan mode: only plan, don't implement
- Auto mode: classifier-driven decisions
- AcceptEdits mode: auto-approve file edits
- Default mode: standard permission prompts

## Dynamic System Prompt Assembly

The system prompt is assembled at runtime using a cache-aware strategy:

```javascript
// Prompt assembly pseudocode
async buildSystemPrompt(context) {
  sections = [];

  // Static sections (always included)
  sections.push(identitySection);
  sections.push(toolInstructionsSection);

  // Dynamic sections (context-dependent)
  if (context.effortLevel) sections.push(effortSection(context.effortLevel));
  if (context.permissionMode) sections.push(permissionSection(context.permissionMode));

  // Machine-specific sections (cache-busting)
  sections.push(cwdSection(context.cwd));
  sections.push(environmentSection(context.envInfo));
  sections.push(gitStatusSection(context.gitStatus));
  sections.push(memoryPathsSection(context.memoryPaths));

  return joinSections(sections);
}
```

### Exclude Dynamic System Prompt Sections
The `--exclude-dynamic-system-prompt-sections` flag moves per-machine sections (cwd, env info, memory paths, git status) from the system prompt into the first user message. This improves cross-user prompt-cache reuse since the system prompt becomes identical across different users/machines.

## Cache Strategy

The prompt assembly uses a sophisticated caching strategy with ETags:

```javascript
{
  systemHash: number,          // Hash of system prompt content
  toolsHash: number,           // Hash of tool definitions
  cacheControlHash: number,    // Hash of cache control settings
  toolNames: string[],        // List of active tool names
  perToolHashes: Record<string, number>,  // Per-tool definition hash
  perBlockHashes: number[],    // Per-block content hash
  globalCacheStrategy: string, // Cache strategy (e.g., "ephemeral_1h")
  betas: string[],            // Active beta headers
  autoModeActive: boolean,
  isUsingOverage: boolean,
  is1hCacheTTL: boolean,
  queryDepth: number,
}
```

When any section changes, the cache is invalidated and a new system prompt is assembled.

## Auto Mode Classifier Prompt

The auto mode uses a separate LLM classifier to decide tool permissions:

```
Here is the full classifier system prompt that the auto mode classifier receives:
```

The classifier evaluates:
- Tool name and input
- Current context (file paths, commands)
- Whether the action is safe to auto-approve

## CLAUDE.md Loading

### Discovery Process
1. Check current directory for `CLAUDE.md`
2. Walk up directory tree to git root
3. Check `~/.claude/CLAUDE.md` (user-level)
4. Load managed/policy memory (organization-level)
5. Respect `memoryExclusions` patterns (picomatch)

### Memory Configuration Keys
```json
{
  "memoryExclusions": [
    "/home/user/monorepo/CLAUDE.md",
    "**/code/CLAUDE.md",
    "**/some-dir/.claude/rules/**"
  ]
}
```

### Memory File Path Injection
System prompt includes the paths where CLAUDE.md files are searched:
```
Reference local project files (CLAUDE.md, .claude/ directory) when relevant using ...
```

## Init System Prompt

The `/init` command uses a specialized prompt for CLAUDE.md generation:

```
Please analyze this codebase and create a CLAUDE.md file, which will be given to future instances of Claude Code to operate in this repository.
- If there's already a CLAUDE.md, suggest improvements to it.
- When you make the initial CLAUDE.md, do not repeat yourself and do not include obvious instructions...
```

## Custom Rules Critique Prompt

When users define custom rules, a critique prompt evaluates them:

```
Your job is to critique the user's custom rules for clarity, completeness, and potential issues.
The classifier is an LLM that reads these rules as part of its system prompt.
```

## Key Prompt Engineering Patterns

1. **Section-based assembly**: Prompts are built from modular sections
2. **Cache-aware ordering**: Static sections first, dynamic sections last
3. **ETag-based invalidation**: Content hashes detect changes efficiently
4. **Context injection**: CWD, git status, environment injected into prompt
5. **Mode-dependent content**: Different sections based on permission mode
6. **Tool count optimization**: Deferred tools reduce initial prompt size
7. **Separation of concerns**: Identity, tools, permissions, style are separate sections

## Prompt Size Management

- Tool definitions are a significant portion of the prompt
- Deferred tools (via ToolSearch) reduce initial prompt size
- `--exclude-dynamic-system-prompt-sections` improves cache reuse
- Per-tool hashes enable fine-grained cache invalidation
- 1-hour and 5-minute ephemeral cache TTLs are used
