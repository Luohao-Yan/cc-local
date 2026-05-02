# UI Migration Plan

目标：把旧 `src/*` 的 Claude Code React + Ink 终端 UI 迁入新 `packages/*` 架构，同时保证用户运行 `cclocal` 时体验无明显变化。

## 当前结论

- UI 可以迁移，但不能用 `packages/cli/src/repl/simpleRepl.ts` 这种简化 REPL 替代。
- 默认 `cclocal` 必须继续呈现旧版 Claude Code UI，直到 packages UI parity 通过。
- `packages/*` 当前应作为 REST、MCP、会话、模型、权限和管理命令底座继续演进。

## UI 迁移范围

旧 UI 不是单个页面，最小完整迁移范围包括：

- `packages/cli/src/screens/REPL.tsx`
- `packages/cli/src/screens/ResumeConversation.tsx`
- `packages/cli/src/screens/Doctor.tsx`
- `packages/cli/src/components/**`
- `packages/cli/src/hooks/**`
- `packages/cli/src/ink/**`
- `packages/cli/src/state/**`
- `packages/cli/src/replLauncher.tsx`
- `packages/cli/src/main.tsx` 中与交互式启动、`--print`、resume、permissions、MCP、hooks、plugins、IDE/Chrome/tmux/worktree 相关的启动编排
- `packages/cli/src/commands/**` slash commands
- `packages/cli/src/tools/**` tool rendering 与 permission UI 所需类型/状态

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

状态：进行中。

目标：把旧 UI 的依赖从 `packages/cli/src/main.tsx` 中分层。

- [x] 抽出默认旧 UI 路由边界：`packages/cli/src/ui/legacyAdapter.ts`
- [x] 明确默认用户路径、显式 REST/packages 路径、legacy 命令路径的分流规则
- [x] 为 UI 路由边界增加单元测试：`packages/cli/src/ui/legacyAdapter.test.ts`
- [x] 抽出 packages REST 路由上下文：`packages/cli/src/runtime/routeContext.ts`
- [x] 为 embedded server、显式 server、REST-backed command 判断增加单元测试
- [x] 抽出根启动参数合成层：`packages/cli/src/runtime/launchOptions.ts`
- [x] 为 settings、raw args、commander options 的合并优先级增加单元测试
- [x] 抽出 interactive launch context：`packages/cli/src/runtime/launchContext.ts`
- [x] 抽出 non-interactive `--print` context：`packages/cli/src/runtime/launchContext.ts`
- [x] 为 `--print` / interactive launch context 增加单元测试
- [x] 抽出 App/REPL 渲染入口：`packages/cli/src/runtime/replRenderer.ts`
- [x] 标记所有直接依赖 legacy global config、analytics、hooks、MCP、tools、commands 的模块：`UI_DEPENDENCY_MAP.md`

产物：

- `packages/cli/src/ui/legacyAdapter.ts`
- `packages/cli/src/runtime/replRenderer.ts`
- UI dependency map
- UI parity smoke test

### Phase 2：Ink/runtime 搬迁

状态：已完成。

目标：让 packages 能直接 import 旧 Ink renderer 与 App shell。

- [x] 建立 legacy UI 模块定位图：`packages/cli/src/legacy-ui/moduleMap.ts`
- [x] 建立 legacy UI source runtime lazy-loader：`packages/cli/src/legacy-ui/sourceRuntime.ts`
- [x] 把 legacy `App + AppState + ink` 与懒加载 `REPL` 组装成 packages 可加载的 bridge runtime
- [x] 把 `src/main.tsx -> launchRepl(...)` 的公共参数装配抽成 packages 侧 builder：`packages/cli/src/legacy-ui/launchContextBuilder.ts`
- [x] 接通 packages 侧 `buildLegacyLaunchContext -> loadLegacyAppShellRuntime -> launchRepl(...)` 调用链：`packages/cli/src/legacy-ui/launchReplBridge.ts`
- [x] 抽出 normal session 与 resume/continue 的 branch-specific launch adapter：`packages/cli/src/legacy-ui/sessionLaunchAdapters.ts`
- [x] 封装可直接替换 `packages/cli/src/main.tsx` 调用点的 `launchLegacyNormalSession(...)` / `launchLegacyResumeSession(...)` facade
- [x] 建立 packages 侧 legacy UI 公共导出边界：`packages/cli/src/legacy-ui/index.ts`
- [x] 将旧 `packages/cli/src/main.tsx` 的 normal、continue、resume 调用点接入 packages facade
- [x] 建立 `packages/cli/src/ink/**`、`packages/cli/src/components/App.tsx`、`packages/cli/src/state/**` 的 packages lazy surface loader
- [x] 建立 slash commands、tool registry、permission UI、MCP UI、message/tool rendering 的 packages lazy surface loader
- [x] 将 lazy surface loader 收敛为逐模块 packages-owned re-export 或物理搬迁文件。
- [x] 保留 import alias，避免一次性改 500+ 个相对路径。

验收：

- packages 内可加载 legacy `App`、`AppStateProvider`、`launchRepl`、`ink render`，并提供懒加载 `REPL` bridge。
- packages 内可加载 legacy commands/tools/permission/MCP/message rendering surfaces。
- packages 内可渲染最小 App shell。
- 不启动 query engine 时能展示旧 UI banner/input/status line。

### Phase 3：REPL 主屏迁移

状态：已启动。

目标：迁入 `packages/cli/src/screens/REPL.tsx`，并让它使用 packages QueryEngine/SessionManager/MCPManager。

- [x] 创建 native REPL 入口 `packages/cli/src/repl/nativeRepl.ts`，直接使用 QueryEngine + SessionStore
- [x] 在 `replRenderer.ts` 中增加 nativeMode 路由分支
- [x] 在 `index.ts` 中注册 `--native` 标志，绕过旧 Ink UI 委托
- [x] native REPL 支持流式文本、thinking 块、tool_call 事件渲染
- [x] native REPL 接入 SessionStore 进行消息持久化
- [x] native REPL 接入 MCPManager 进行工具同步
- [x] native REPL 接入 PermissionPolicy 进行权限检查
- [x] cclocal-next 交互式会话通过 legacy bridge 加载旧版 Ink/React UI（Phase 7.1）
- [x] cclocal-next 通过 CCLOCAL_USE_QUERY_ENGINE=1 切换 QueryEngine 数据源（Phase 7.2）
- [x] legacyBridgeRenderer 传递 core ToolRegistry 和 CommandRegistry 的真实工具/命令（Phase 7.2）
- [x] --resume / --continue / --fork-session 在 native/bridge 路径可用（Phase 7.3）
- [x] SessionStore 新增 findSessionByCwd 和 forkSession 方法（Phase 7.3）
- [x] sessionResolver 工具：统一解析会话标志，替代 CCLocalClient REST（Phase 7.3）
- [x] 替换 session persistence 为 `packages/core` 会话层（Phase 7.3：native/bridge 均已使用 SessionStore）
- [x] 接入 dynamic MCP tools（Phase 7.4：MCPBridgeAdapter 同步 core MCPManager 状态到 AppState.mcp）
- [x] 接入 permission policy（已接入 decideToolPermission，需端到端验证）
- [x] 外部集成通过 bridge 可用（Phase 7.5：--ide/--chrome/--worktree/--tmux 均已接入 bridge renderer）
- [ ] 替换 session persistence 为 `packages/server`/`packages/core` 会话层（当前 native REPL 已使用 SessionStore，但 CCLocalClient 路径仍走 server REST）
- [x] --resume / --continue / --fork-session 在 native 路径已实现（Phase 7.3）

验收：

- 默认输入、流式响应、tool rendering、file diff rendering 可用。
- `--resume` / `--continue` / fork session 行为一致。

### Phase 4：slash commands 与工具 UI

状态：已完成。

目标：迁移旧 slash command 运行时和工具展示。

- [x] 将 5 个 placeholder bridge adapters 替换为真实 lazy-load 实现
- [x] native REPL 和 nativeSinglePrompt 启动时注册 bridge adapters
- [x] 搬迁 commands registry 到 packages/core（CommandRegistry + registerDefaults）
- [x] 统一旧工具 registry 与 packages ToolRegistry（移除重复 bridge adapters，保留 core 原生实现）
- [x] stream-json 事件格式对齐 Anthropic SSE 兼容格式（message_start, content_block_delta, message_stop）
- [ ] 搬迁 tool permission/dialog/render components（需 Ink UI 层，保留至 Phase 5+）

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
