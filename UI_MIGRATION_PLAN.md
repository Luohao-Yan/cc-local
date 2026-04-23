# UI Migration Plan

目标：把旧 `src/*` 的 Claude Code React + Ink 终端 UI 迁入新 `packages/*` 架构，同时保证用户运行 `cclocal` 时体验无明显变化。

## 当前结论

- UI 可以迁移，但不能用 `packages/cli/src/repl/simpleRepl.ts` 这种简化 REPL 替代。
- 默认 `cclocal` 必须继续呈现旧版 Claude Code UI，直到 packages UI parity 通过。
- `packages/*` 当前应作为 REST、MCP、会话、模型、权限和管理命令底座继续演进。

## UI 迁移范围

旧 UI 不是单个页面，最小完整迁移范围包括：

- `src/screens/REPL.tsx`
- `src/screens/ResumeConversation.tsx`
- `src/screens/Doctor.tsx`
- `src/components/**`
- `src/hooks/**`
- `src/ink/**`
- `src/state/**`
- `src/replLauncher.tsx`
- `src/main.tsx` 中与交互式启动、`--print`、resume、permissions、MCP、hooks、plugins、IDE/Chrome/tmux/worktree 相关的启动编排
- `src/commands/**` slash commands
- `src/tools/**` tool rendering 与 permission UI 所需类型/状态

## 不可降级验收标准

以下检查必须持续通过，才允许把默认 UI 切到 packages 原生 UI：

- `cclocal --help` 与旧 CLI 帮助结构一致。
- `cclocal` 默认进入旧版 Ink 全屏体验，而不是纯文本 prompt。
- `cclocal --print "..."` 的输出格式、错误格式、stream-json/json 行为与旧版一致。
- slash commands、command palette、history/resume、权限弹窗、tool calling rendering、diff rendering、MCP approval、model picker、buddy、Auto Mode、IDE/Chrome/tmux/worktree 入口无明显缺失。
- `bun run acceptance:complete` 必须覆盖“默认 UI 未降级”和“packages 管理子命令仍可用”。

## 分阶段迁移

### Phase 0：保护默认体验

状态：已完成。

- `dist/cli.js` 作为统一路由入口。
- 默认用户路径委托旧 UI。
- `mcp`、`models`、`sessions` 等管理子命令走 packages。
- `dist/legacy-cli.js` 确保脱离源码目录时默认 UI 仍可运行。

### Phase 1：UI 依赖边界梳理

目标：把旧 UI 的依赖从 `src/main.tsx` 中分层。

- 抽出 CLI option 解析层。
- 抽出 interactive launch context。
- 抽出 non-interactive `--print` context。
- 抽出 App/REPL 渲染入口。
- 标记所有直接依赖 legacy global config、analytics、hooks、MCP、tools、commands 的模块。

产物：

- `packages/cli/src/ui/legacy-adapter/*`
- UI dependency map
- UI parity smoke test

### Phase 2：Ink/runtime 搬迁

目标：让 packages 能直接 import 旧 Ink renderer 与 App shell。

- 搬迁或复用 `src/ink/**`。
- 搬迁 `src/components/App.tsx`。
- 搬迁 `src/state/**`。
- 保留 import alias，避免一次性改 500+ 个相对路径。

验收：

- packages 内可渲染最小 App shell。
- 不启动 query engine 时能展示旧 UI banner/input/status line。

### Phase 3：REPL 主屏迁移

目标：迁入 `src/screens/REPL.tsx`，并让它使用 packages QueryEngine/SessionManager/MCPManager。

- 替换 query loop 数据源为 `packages/core`。
- 替换 session persistence 为 `packages/server`/`packages/core` 会话层。
- 接入 dynamic MCP tools。
- 接入 permission policy。

验收：

- 默认输入、流式响应、tool rendering、file diff rendering 可用。
- `--resume` / `--continue` / fork session 行为一致。

### Phase 4：slash commands 与工具 UI

目标：迁移旧 slash command 运行时和工具展示。

- 搬迁 `src/commands/**` registry。
- 搬迁 tool permission/dialog/render components。
- 将旧工具 registry 与 packages ToolRegistry 统一。

验收：

- `/help`、`/model`、`/permissions`、`/mcp`、`/resume`、`/cost`、`/stats`、`/buddy` 等高频命令与旧 UI 一致。

### Phase 5：外部集成与深度回归

目标：覆盖 IDE、Chrome、tmux、worktree、plugin、auth、update、setup-token 等真实分支。

- 建立可自动化的 mock/fixture。
- 对必须依赖真实环境的分支保留人工验收清单。
- 把 UI regression 与 CLI acceptance 合并进 `bun run acceptance:complete`。

## 切换条件

只有当 Phase 1-5 完成，并且以下命令通过时，才允许默认用户路径不再委托旧 `src/*` UI：

```bash
bun run acceptance:complete
bun run parity:check
cclocal --help
cclocal --print "say ok"
cclocal
```

如果 packages 原生 UI 与旧 UI 仍有差异，默认入口必须继续委托旧 UI。
