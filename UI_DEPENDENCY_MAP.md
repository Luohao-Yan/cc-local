# UI Dependency Map

目标：标记旧 `src/*` 前端用户界面迁入 `packages/*` 时的关键依赖层，避免把迁移误做成“重写一个简化 REPL”。

## 总量概览

当前 legacy UI 相关代码规模：

- `src/screens` + `src/components` + `src/hooks` + `src/state` + `src/ink` + `src/commands` + `src/tools`
- 约 `1025` 个文件

这说明 UI 迁移不是单个页面替换，而是完整的终端应用运行时迁移。

## 分层地图

### 1. 启动编排层

关键文件：

- `src/entrypoints/cli.tsx`
- `src/main.tsx`
- `src/replLauncher.tsx`

职责：

- 解析 CLI 参数
- 区分 interactive / `--print` / doctor / assistant / ssh / server 等路径
- 组装 REPL 初始状态
- 协调 hooks、MCP、session、permissions、IDE/Chrome/tmux/worktree

packages 当前对应进展：

- 已抽出 `packages/cli/src/ui/legacyAdapter.ts`
- 已抽出 `packages/cli/src/runtime/routeContext.ts`
- 已抽出 `packages/cli/src/runtime/launchOptions.ts`
- 已抽出 `packages/cli/src/runtime/launchContext.ts`
- 已抽出 `packages/cli/src/runtime/replRenderer.ts`

### 2. App Shell 层

关键文件：

- `src/components/App.tsx`
- `src/state/AppState.tsx`
- `src/state/onChangeAppState.ts`
- `src/context/*`

职责：

- 提供 AppState、stats、fps、notifications 等上下文
- 包装 REPL 全屏布局
- 驱动跨组件共享状态

迁移风险：

- packages 当前尚未承接这些 provider
- 直接替换会导致权限弹窗、状态栏、消息列表、背景任务 UI 丢失

### 3. 主 REPL 层

关键文件：

- `src/screens/REPL.tsx`

职责：

- 主输入框、消息流、tool rendering、权限请求、resume、history、slash commands
- 背景任务、MCP approval、IDE/Chrome、Auto Mode、buddy、diff、export 等大量交互

当前观察：

- 单文件体量非常大
- 直接依赖 hooks、commands、tools、ink、bootstrap state、analytics、permissions、tasks

结论：

- 这是 UI 平移的核心文件，不能以 `packages/cli/src/repl/simpleRepl.ts` 替代

### 4. 渲染运行时层

关键文件：

- `src/ink/**`

职责：

- 自定义 Ink 渲染器
- 输入、布局、焦点、terminal、selection、render pipeline

迁移意义：

- 如果 packages 最终要原生承接旧 UI，就必须复用或迁入这层
- 这也是“看起来还是旧版 UI”的关键基础

### 5. 组件层

关键文件群：

- `src/components/messages/**`
- `src/components/permissions/**`
- `src/components/tasks/**`
- `src/components/mcp/**`
- `src/components/PromptInput/**`
- `src/components/Settings/**`
- `src/components/shell/**`
- 以及 `StatusLine.tsx`、`FullscreenLayout.tsx`、`MessageResponse.tsx` 等核心组件

职责：

- 消息渲染
- tool use 展示
- diff / shell 输出展示
- permission dialogs
- MCP approval dialogs
- task / teammate / remote session UI

### 6. Hooks 层

关键文件群：

- `src/hooks/useGlobalKeybindings.tsx`
- `src/hooks/useCommandKeybindings.tsx`
- `src/hooks/useReplBridge.tsx`
- `src/hooks/useRemoteSession.ts`
- `src/hooks/useSSHSession.ts`
- `src/hooks/useApiKeyVerification.ts`
- `src/hooks/useCanUseTool.tsx`
- `src/hooks/useTerminalSize.ts`
- `src/hooks/useTextInput.ts`
- `src/hooks/useVimInput.ts`

职责：

- 键盘交互
- 会话桥接
- remote / ssh / ide / chrome
- permission gating
- 输入法与终端状态

### 7. 命令与工具层

关键文件群：

- `src/commands/**`
- `src/tools/**`
- `src/commands.ts`
- `src/tools.ts`

职责：

- slash commands registry
- tool definitions
- tool permission / rendering metadata

迁移意义：

- 就算 packages 底层已经有 REST/MCP/session，也必须把这些 UI-facing command/tool contracts 平移过来

## packages 当前对应关系

当前 packages 侧已经开始形成可替换边界：

- UI 路由：`packages/cli/src/ui/legacyAdapter.ts`
- REST 路由：`packages/cli/src/runtime/routeContext.ts`
- 根启动参数：`packages/cli/src/runtime/launchOptions.ts`
- interactive / `--print` 上下文：`packages/cli/src/runtime/launchContext.ts`
- REPL 渲染入口：`packages/cli/src/runtime/replRenderer.ts`
- legacy App/REPL runtime bridge：`packages/cli/src/legacy-ui/sourceRuntime.ts`、`packages/cli/src/legacy-ui/appShellAdapter.ts`

这说明：

- 默认用户路径已经有“可替换但不降级”的 adapter 层
- 下一步应迁移 App shell 与 renderer runtime，而不是再扩写 simple REPL

## 下一步优先级

1. 让 `replRenderer.ts` 从“packages simple renderer adapter”继续升级为“可驱动 legacy `launchRepl` 的 renderer adapter”
2. 复用 `src/replLauncher.tsx` 的入口形态，补齐 packages 到 legacy REPL props 的装配层
3. 评估 `src/components/App.tsx`、`src/state/*`、`src/context/*` 的最小搬迁集合
4. 再进入 `src/screens/REPL.tsx` 主屏迁移
