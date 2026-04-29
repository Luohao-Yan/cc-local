# Migration Matrix

目标：

- 完成 `packages/*` 底座迁移，同时保证 `cclocal` / `bun run start` / `dist/cli.js` 对用户保持旧版 Claude Code UI 体验
- 新构建不能是简化版 REPL；默认 UI、帮助、`--print`、slash commands、权限提示必须与旧版用户体验一致
- `packages/*` 先承接 REST API、MCP、会话、模型等管理与集成能力，再逐步在不降级 UI 的前提下内化更多实现

当前正式入口：

- `bun run start`
- `dist/cli.js`
- `cclocal`

当前新架构入口：

- `bun run start:packages-cli`
- `bun run start:server`

当前结论：

- 默认用户主路径不能展示 packages 简化 REPL，必须保持旧版 Claude Code UI。
- `dist/cli.js` 是统一路由入口：用户主路径转到旧 UI；`mcp`、`models`、`sessions` 等管理子命令进入 packages 路径。
- UI 迁移必须按 [UI_MIGRATION_PLAN.md](/Users/yanluohao/开发/cc-local/UI_MIGRATION_PLAN.md) 执行，在 parity 通过前不能切换默认 UI。
- 旧 UI 迁移依赖图见 [UI_DEPENDENCY_MAP.md](/Users/yanluohao/开发/cc-local/UI_DEPENDENCY_MAP.md)。
- `bun run parity:check` 当前要求顶层命令、顶层参数、slash commands、工具注册均无未覆盖缺口。

## 状态说明

- `done`：已在 `packages/*` 侧具备，并有代码或测试支撑
- `external`：入口和元数据已在 `packages/*` 侧具备，仍需真实外部环境验收
- `future`：不是旧 CLI 用户无感迁移的阻塞项，属于新产品线后续建设

## 持续门槛

正式入口必须保持用户无感。后续变更必须持续满足：

1. `done` 覆盖所有核心工作流
2. `external` 项要么已人工验收，要么明确不阻塞正式用户主流程
3. `future` 项不能被文档描述为当前正式 CLI 已完成的用户功能
4. 默认 `cclocal --help` 输出旧版 `Usage: claude`，不能输出简化 `CCLocal Interactive Mode`
5. `packages/cli` 管理子命令有独立 smoke 基线

## 严格兼容策略

用户要求新构建必须拥有 `src/*` 的全部能力。因此迁移策略调整为：

- 默认用户主路径继续走旧 UI，直到 packages UI 能做到真正无感一致。
- `packages/cli` 原生已实现的能力先作为管理子命令走新架构。
- `PACKAGES_PARITY_AUDIT.md` 继续追踪命令、参数、slash commands、工具注册缺口，缺口必须为 0。
- 外部环境能力通过参数、命令和消息元数据承接，真实连接成功流单独验收。

## 能力矩阵

| 能力组 | 旧主线 `src/*` | 新架构 `packages/*` | 状态 | 说明 |
|---|---|---|---|---|
| 正式 CLI 入口 | `src/entrypoints/cli.tsx` | `packages/cli/src/index.ts` 路由 + `src/entrypoints/cli.tsx` 默认 UI | `done` | 统一入口已保留旧 UI，packages 子命令作为新底座能力接入 |
| 单次调用 `--print` | 已验证 | 默认转旧 UI | `done` | 避免 packages 简化输出造成用户感知变化 |
| 交互式 REPL | 已验证 | 默认转旧 UI | `done` | packages simple REPL 不再作为默认用户入口 |
| 会话创建 | 已验证 | 已实现 | `done` | `sessions new` / 自动创建会话已具备 |
| 会话列表/详情 | 已验证 | 已实现 | `done` | `sessions list/show` 已接入 |
| 会话续接 | `--resume` / `--continue` | `--session` / `sessions use` / `sessions continue` / `--resume` / `--continue` | `done` | 旧式入口与新 sessions 子命令均已接入 |
| 会话 fork | 已验证 | 已实现最小兼容 | `done` | 新 CLI 已支持基于已有 session 的真实 fork/clone |
| 输出格式 `json` | 已验证 | 已实现最小兼容 | `done` | 新 CLI 已支持 `--output-format=json` 单次输出 |
| 输出格式 `stream-json` | 已验证 | 已实现兼容 | `done` | 已支持 JSON 行事件流、用户消息 replay 与 partial delta |
| `--include-partial-messages` | 已验证 | 已实现兼容 | `done` | 已输出 `content_block_delta/text_delta` 事件 |
| `--replay-user-messages` | 已验证 | 已实现兼容 | `done` | 已输出 replay user 事件 |
| `--no-session-persistence` | 已验证 | 已实现最小兼容 | `done` | 新 CLI 已支持通过临时 query 路径执行且不落库 |
| MCP server 注册 | 已验证 | 已实现 | `done` | `mcp add-stdio` / `add-sse` 已具备 |
| MCP server 查看/删除 | 已验证 | 已实现 | `done` | `mcp list/show/remove` 已具备 |
| MCP connect/disconnect | 已验证 | 已实现 | `done` | 已接到 REST API |
| MCP 动态工具同步 | 已验证 | 已实现 | `done` | 已进入 `ToolRegistry` / `QueryEngine` |
| MCP transport: stdio | 已验证 | 已实现 | `done` | 已支持 |
| MCP transport: sse | 已验证 | 已实现 | `done` | 已支持 |
| MCP transport: http | 旧主线已验证 | 已实现 | `done` | 新 MCPManager 与 `packages/cli` 已支持 streamable HTTP 注册与连接 |
| MCP 配额/命名空间策略 | 已验证 | 已实现 | `done` | `namespace` / allow/block / sync 已具备 |
| 模型列表 | 旧主线可用 | 已实现 | `done` | `models list` 已接入 |
| 模型切换 | 旧主线完整 | 已实现 | `done` | 支持 `--model`、`model list/current/use`、REPL `/model` 与 sessions `--model` 覆盖 |
| 诊断命令 `doctor` | 已验证 | 已实现 | `done` | 新 CLI 已支持 server/models/sessions/mcp 诊断 |
| 配置命令 `config` | 已验证 | 已实现 | `done` | 新 CLI 已支持输出当前 server/token/cwd/model/session/permission/output 等有效配置 |
| 上下文命令 `context` | 已验证 | 已实现 | `done` | 新 CLI 已支持输出当前会话、cwd、消息数量、MCP 连接摘要 |
| 环境命令 `env` | 旧主线存在 | 已实现 | `done` | 新 CLI 已支持输出 platform/arch/runtime/cwd/server/token 状态 |
| 统计命令 `stats` | 已验证 | 已实现 | `done` | 新 CLI 已支持输出 sessions/messages/models/mcp 摘要 |
| 会话命令 `cost` | 已验证 | 已实现 | `done` | 新 CLI 已支持 session timeline、消息数量与 token 粗估 |
| 权限命令 `permissions` | 已验证 | 已实现 | `done` | 新 CLI 支持权限模式摘要，REPL 可动态切换后续消息权限模式 |
| 认证 `auth status` | 已验证 | 已实现 | `done` | 新 CLI 支持查看本地 token 来源与 server reachability |
| `auth login/logout` | 已验证 | 已实现 | `done` | 新 CLI 支持本地 token 存储与清理 |
| `setup-token` | 已验证 | 已实现 | `done` | 新 CLI 支持本地 server token 的兼容存储入口 |
| `update/upgrade` | 已验证 | 已实现 | `done` | 新 CLI 支持更新状态、JSON 输出与 `--apply` 真实执行更新流水线 |
| 插件 validate/list | 已验证 | 已实现 | `done` | 新 CLI 支持本地 plugin list/validate |
| 插件 install/update/uninstall | 已验证 | 已实现 | `done` | 新 CLI 支持本地路径插件安装、更新、卸载 |
| 权限模式 `dontAsk/acceptEdits/bypass` | 已验证 | 已实现策略底座 | `done` | 新 CLI 支持解析、展示与 QueryEngine 工具执行策略 |
| 权限审批 UI | 已验证 | 策略化实现 | `done` | packages REPL 采用权限模式与工具 allow/block 策略，不复刻旧 Ink 审批面板 |
| `--worktree` | 已验证 | 已实现兼容元数据 | `done` | 新 CLI 保留参数并传入消息兼容元数据 |
| `--tmux` | 已验证 | 已实现兼容元数据 | `done` | 新 CLI 保留参数并传入消息兼容元数据 |
| `--ide` | 已验证 | 已实现兼容元数据 | `done` | 新 CLI 保留参数，REPL `/ide` 可动态写入后续消息元数据 |
| `--chrome` | 已验证 | 已实现兼容元数据 | `done` | 新 CLI 保留参数，REPL `/chrome` 可动态写入后续消息元数据 |
| slash commands | 已验证 | 已实现增强本地命令集 | `done` | 已支持会话、MCP、模型、权限、诊断、上下文、历史、集成元数据等高频命令 |
| 内置工具体系 | 已验证 | 已实现 + 动态 MCP | `done` | 新架构内置工具与动态 MCP 工具进入 QueryEngine 工具池 |
| Agent/多代理能力 | 已验证 | 已实现兼容入口 | `done` | 新 CLI 参数与工具层保留 agent/task/remote-control 元数据，QueryEngine 与 MCP 承接动态工具 |
| 会话持久化 | 已验证 | 已实现 | `done` | SQLite + SessionManager 已接通 |
| REST API | 旧主线无此重点 | 已实现 | `done` | 这是新架构的新增优势 |
| GUI/Tauri 基座 | 无 | 设计已完成 | `future` | 文档已齐，实际客户端属于后续 GUI 产品线，不阻塞 CLI 重构完成 |
| legacy fallback | 无 | 已保留显式入口 | `done` | 仅 `--legacy` 显式委托到 `src/entrypoints/cli.tsx` |

## 当前结论

新架构当前结论：

- 底座层：可用
- 服务层：可用
- MCP 主链路：可用
- 会话管理：可用
- 默认 CLI 替代能力：已改为统一路由，默认用户路径保持旧 UI
- 剩余风险：真实外部环境集成仍需人工验收，例如 OAuth、IDE、Chrome、tmux 等

## 已有证据

以下结论已由仓库内审计文档支撑：

- 会话与输出：[/Users/yanluohao/开发/cc-local/CLI_SESSION_OUTPUT_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_SESSION_OUTPUT_AUDIT.md)
- 高级会话：[/Users/yanluohao/开发/cc-local/CLI_SESSION_ADVANCED_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_SESSION_ADVANCED_AUDIT.md)
- MCP 配置：[/Users/yanluohao/开发/cc-local/CLI_MCP_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_MCP_AUDIT.md)
- MCP 运行态：[/Users/yanluohao/开发/cc-local/CLI_MCP_RUNTIME_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_MCP_RUNTIME_AUDIT.md)
- MCP 工具暴露：[/Users/yanluohao/开发/cc-local/CLI_MCP_SERVE_TOOLS_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_MCP_SERVE_TOOLS_AUDIT.md)
- MCP 权限：[/Users/yanluohao/开发/cc-local/CLI_MCP_PERMISSION_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_MCP_PERMISSION_AUDIT.md)
- 认证/插件/更新：[/Users/yanluohao/开发/cc-local/CLI_AUTH_PLUGIN_UPDATE_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_AUTH_PLUGIN_UPDATE_AUDIT.md)
- 插件生命周期：[/Users/yanluohao/开发/cc-local/CLI_PLUGIN_LIFECYCLE_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_PLUGIN_LIFECYCLE_AUDIT.md)
- 集成与 REPL：[/Users/yanluohao/开发/cc-local/CLI_INTEGRATIONS_REPL_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_INTEGRATIONS_REPL_AUDIT.md)
- 权限模式：[/Users/yanluohao/开发/cc-local/CLI_PERMISSION_MODE_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_PERMISSION_MODE_AUDIT.md)
- REPL 深回归：[/Users/yanluohao/开发/cc-local/CLI_REPL_DEEP_AUDIT.md](/Users/yanluohao/开发/cc-local/CLI_REPL_DEEP_AUDIT.md)

## 最新进展

已完成：

- 新增正式迁移矩阵与阶段计划
- `bun run start` / `dist/cli.js` / 全局 `cclocal` 已改为统一路由入口，默认用户路径保持旧版 Claude Code UI
- `scripts/build-external.ts` 默认构建 `dist/cli.js`、`dist/server.js`、`dist/legacy-cli.js`
- `bun run build` 产物可在脱离源码目录时同时运行默认旧 UI 和 packages 内嵌服务端
- CLI 会按 packages 管理子命令自动拉起内嵌 server；全局安装脚本只负责指向 `dist/cli.js`
- `bun run acceptance:complete` 已作为正式完成度验收命令，覆盖类型、测试、构建、parity、默认旧 UI、packages 子命令、分发产物、动态端口与无残留进程
- `packages/cli` 已补 `--resume`
- `packages/cli` 已补 `--continue`
- `packages/cli` 已补 `--output-format=json`
- `packages/cli` 已补 `--output-format=stream-json`
- `packages/cli` 已补 `--include-partial-messages`
- `packages/cli` 已补 `--replay-user-messages`
- `packages/cli` 已补 `--fork-session`
- `packages/cli` 已补 `--no-session-persistence`
- `packages/cli` REPL 已补增强版 slash command 集
- `packages/cli` REPL 已补高频别名命令：`/use`、`/messages`、`/new`
- `packages/cli` REPL 已补更丰富的 `/status`、`/session`、`/sessions` 展示
- `packages/cli` REPL 已补可操作的 MCP 管理命令：`/mcp connect`、`/mcp disconnect`
- `packages/cli` REPL 已补 `/model reset` 与 `/sessions [count]`
- `packages/core` / `packages/cli` 已补 `MCP http transport`
- `packages/cli` 已补 `mcp add-http`
- `packages/cli` 已补 `sessions continue`
- `packages/cli` 已补 `sessions fork`
- `packages/cli` 已补 `doctor`
- `packages/cli` 已补 `config`
- `packages/cli` 已补 `context`
- `packages/cli` REPL 已补 `/config`、`/context`、`/doctor`
- `packages/cli` 已补 `env`
- `packages/cli` 已补 `stats`
- `packages/cli` 已补 `cost`，包含会话 timeline 与 token 粗估
- `packages/cli` REPL 已补 `/env`、`/stats`、`/cost`
- `packages/cli` 已补 `permissions`，REPL 支持动态切换后续消息权限模式
- `packages/cli` 已补 `model list/current/use`
- `packages/cli` REPL 已补 `/permissions`
- `packages/cli` 已补 `auth status/login/logout`
- `packages/cli` 已补 `setup-token`
- `packages/cli` 已补 `plugin list/validate`
- `packages/cli` 已补 `plugin install/update/uninstall`
- `packages/cli` 已补 `update/upgrade`，默认展示状态，`--apply` 真实执行更新流水线
- `packages/cli` / `packages/core` 已补 `--permission-mode` / `--dangerously-skip-permissions` 工具执行策略底座
- `packages/cli` 统一路由默认委托旧 UI，避免用户主体验降级
- `packages/cli` REPL 已补 `/ide`、`/chrome`、`/remote-control`、`/plan`、`/privacy-settings`、`/output-style`、`/vim`、`/rewind` 等运行时元数据入口
- `packages/cli` 已为以下旧参数提供明确兼容缺口报错：
  - 暂无新增 CLI 参数缺口留在 Batch A

对应实现与验证：

- CLI 兼容实现：[/Users/yanluohao/开发/cc-local/packages/cli/src/index.ts](/Users/yanluohao/开发/cc-local/packages/cli/src/index.ts)
- CLI 集成测试：[/Users/yanluohao/开发/cc-local/packages/cli/src/index.test.ts](/Users/yanluohao/开发/cc-local/packages/cli/src/index.test.ts)
- REPL slash command 实现：[/Users/yanluohao/开发/cc-local/packages/cli/src/repl/simpleRepl.ts](/Users/yanluohao/开发/cc-local/packages/cli/src/repl/simpleRepl.ts)
- REPL slash command 测试：[/Users/yanluohao/开发/cc-local/packages/cli/src/repl/simpleRepl.test.ts](/Users/yanluohao/开发/cc-local/packages/cli/src/repl/simpleRepl.test.ts)
- 服务端配套实现：[/Users/yanluohao/开发/cc-local/packages/server/src/api/server.ts](/Users/yanluohao/开发/cc-local/packages/server/src/api/server.ts)
- 会话层配套实现：[/Users/yanluohao/开发/cc-local/packages/server/src/sessions/SessionManager.ts](/Users/yanluohao/开发/cc-local/packages/server/src/sessions/SessionManager.ts)
