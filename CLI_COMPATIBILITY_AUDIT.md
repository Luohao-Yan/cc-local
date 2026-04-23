# CLI Compatibility Audit

审计对象：

- 正式开发入口：`bun run start`
- 正式构建产物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 正式源码入口：`/Users/yanluohao/开发/cc-local/src/entrypoints/cli.tsx`

审计日期：

- 2026-04-20

## 结论

当前 `cclocal` 正式入口已经收回旧主线，终端里的启动方式、帮助输出和顶层命令面与重构前保持一致的方向是正确的。

已经确认的事实：

- `bun run start` 走旧主线 CLI
- `bun run build` 会重新产出 `dist/cli.js`
- 全局安装脚本仍以 `dist/cli.js` 作为正式产物
- `packages/cli` 不再作为正式用户入口

但这还不等于“旧功能全部完成验证”。当前更准确的状态是：

- 顶层命令与构建入口已经对齐
- 一批关键帮助输出已经验证
- 仍有若干高风险工作流需要联机/人工场景验证

## 已验证项

以下项目已经通过本地命令执行确认：

- `bun run start -- --help`
- `bun dist/cli.js --help`
- `bun run build`
- `bun run start -- mcp --help`
- `bun run start -- mcp get --help`
- `bun run start -- auth --help`
- `bun run start -- doctor --help`
- `bun run start -- plugin --help`
- `bun run start -- setup-token --help`
- `bun run start -- update --help`

已验证的顶层正式命令：

- `agents`
- `auth`
- `doctor`
- `install`
- `mcp`
- `plugin|plugins`
- `setup-token`
- `update|upgrade`

已验证的关键顶层选项：

- `--help`
- `--version`
- `--print`
- `--model`
- `--continue`
- `--resume`
- `--permission-mode`
- `--system-prompt`
- `--settings`
- `--mcp-config`
- `--plugin-dir`
- `--worktree`

## 源码盘点

源码中确认存在的能力面：

- `src/main.tsx` 中已定义正式顶层命令和参数
- `src/commands/` 下存在大量 slash/辅助命令实现
- `src/tools/` 下存在完整工具体系，包括 Bash、Edit、Read、MCP、WebSearch、Agent、Todo、LSP 等

这说明旧主线从命令结构上仍然是完整的，而不是只剩一个“瘦壳”。

## 高风险待验证项

以下能力虽然从帮助输出或源码盘点可见，但还没有完成“真实工作流”验证：

- `auth login/logout/status` 的实际认证流程
- `mcp add/list/get/remove/serve` 的真实配置写入与读取
- `plugin` 安装、禁用、更新、marketplace 管理
- `setup-token` 的实际 token 生成流程
- `update|upgrade` 的真实更新流程
- `--continue` / `--resume` / `--fork-session` 的真实会话恢复
- `--print` 下的 `json` / `stream-json` 输出模式
- `--permission-mode` 不同模式的实际行为
- `--worktree` / `--tmux` / `--ide` / `--chrome` 集成工作流
- 交互式 REPL 中的工具调用、slash commands、session persistence

这些都是“不能只看 help”的部分，也是后续兼容工作的重点。

## 自动化基线

当前已经新增：

- `/Users/yanluohao/开发/cc-local/scripts/smoke-official-cli.sh`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-session-output.sh`
- `/Users/yanluohao/开发/cc-local/scripts/deep-session-resume-check.sh`
- `/Users/yanluohao/开发/cc-local/CLI_SESSION_OUTPUT_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-mcp-config.sh`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-config.sh`
- `/Users/yanluohao/开发/cc-local/CLI_MCP_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-runtime.sh`
- `/Users/yanluohao/开发/cc-local/CLI_MCP_RUNTIME_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-serve-tools.sh`
- `/Users/yanluohao/开发/cc-local/CLI_MCP_SERVE_TOOLS_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-permissions.sh`
- `/Users/yanluohao/开发/cc-local/CLI_MCP_PERMISSION_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-auth-plugin-update.sh`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-setup-token-start.sh`
- `/Users/yanluohao/开发/cc-local/CLI_AUTH_PLUGIN_UPDATE_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-plugin-lifecycle.sh`
- `/Users/yanluohao/开发/cc-local/CLI_PLUGIN_LIFECYCLE_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-session-advanced.sh`
- `/Users/yanluohao/开发/cc-local/CLI_SESSION_ADVANCED_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-integrations-repl.sh`
- `/Users/yanluohao/开发/cc-local/CLI_INTEGRATIONS_REPL_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-permission-mode.sh`
- `/Users/yanluohao/开发/cc-local/CLI_PERMISSION_MODE_AUDIT.md`
- `/Users/yanluohao/开发/cc-local/scripts/deep-repl-regression.sh`
- `/Users/yanluohao/开发/cc-local/CLI_REPL_DEEP_AUDIT.md`

这个脚本用于守住正式入口的最小不退化基线，覆盖：

- 正式构建
- `bun run start`
- `dist/cli.js`
- `mcp`
- `plugin`
- `auth`
- `doctor`

其中：

- `smoke-session-output.sh` 负责 `--print`、`json`、`stream-json`、`--no-session-persistence`
- `deep-session-resume-check.sh` 负责较慢的 `--resume` / `--continue` 深度检查
- `CLI_SESSION_OUTPUT_AUDIT.md` 记录了这一批真实审计结果
- `smoke-mcp-config.sh` 负责 `mcp add/list/get/remove` 的隔离环境 smoke
- `deep-mcp-config.sh` 负责 `mcp add-json`、headers/oauth、多 scope remove、`reset-project-choices`
- `CLI_MCP_AUDIT.md` 记录了 MCP 配置链路的真实审计结果
- `deep-mcp-runtime.sh` 负责 `mcp serve`、`stdio/http/sse` transport、配置优先级
- `CLI_MCP_RUNTIME_AUDIT.md` 记录了 MCP 运行态的真实审计结果
- `deep-mcp-serve-tools.sh` 负责 `mcp serve` 的 `list_tools` / 最小 `call_tool`
- `CLI_MCP_SERVE_TOOLS_AUDIT.md` 记录了 `mcp serve` 工具暴露面的真实审计结果
- `deep-mcp-permissions.sh` 负责 `mcp serve` 下 `Bash` / `Edit` / `Write` 的真实执行检查
- `CLI_MCP_PERMISSION_AUDIT.md` 记录了 MCP 高风险工具的真实审计结果
- `smoke-auth-plugin-update.sh` 负责 `auth status`、`auth logout`、`plugin validate/list`、`update` 进入检查流程
- `smoke-setup-token-start.sh` 负责 `setup-token` 的启动与引导输出
- `CLI_AUTH_PLUGIN_UPDATE_AUDIT.md` 记录了 auth/plugin/update 的真实审计结果
- `smoke-plugin-lifecycle.sh` 负责本地 marketplace 的 install/update/uninstall 闭环
- `CLI_PLUGIN_LIFECYCLE_AUDIT.md` 记录了插件生命周期闭环结果
- `smoke-session-advanced.sh` 负责 `--fork-session`、`--replay-user-messages`、`--include-partial-messages`
- `CLI_SESSION_ADVANCED_AUDIT.md` 记录了高级会话选项的真实审计结果
- `smoke-integrations-repl.sh` 负责 REPL、`--worktree`、`--ide`、`--chrome`、`--tmux`
- `CLI_INTEGRATIONS_REPL_AUDIT.md` 记录了集成与 REPL 的真实审计结果
- `smoke-permission-mode.sh` 负责 `dontAsk`、`acceptEdits`、`bypassPermissions` 的真实分支检查
- `CLI_PERMISSION_MODE_AUDIT.md` 记录了主 CLI permission mode 的真实审计结果
- `deep-repl-regression.sh` 负责 REPL 里的 `/help`、tool calling、session persistence
- `CLI_REPL_DEEP_AUDIT.md` 记录了 REPL 深回归结果

## 下一批建议

按优先级，建议下一批兼容审计这样做：

1. 认证与更新链路
   继续验证 `auth login`、`setup-token` 完整成功分支、`update` 完整安装分支

2. 外部集成成功分支
   继续验证 `--ide`、`--chrome`、`--tmux` 的真实成功场景

3. 交互权限链路
   继续验证 REPL 里的人工批准/拒绝 UI 分支

## 还未完成的真实审计

截至当前，这些仍然属于“源码/帮助已存在，但缺真实工作流确认”的剩余项：

- `auth login` 的真实认证流
- `setup-token` 的真实 token 生成成功分支
- `update|upgrade` 的真实完整更新流
- `--permission-mode` 在主 CLI 会话中的交互权限提示与人工批准/拒绝分支
- `--ide` 在真正 VS Code 中的成功连接分支
- `--chrome` 的真实浏览器集成成功分支
- `--tmux` 在已安装 tmux 环境中的成功分支
- REPL 中权限提示 UI 的人工选择分支

反过来说，以下大块已经有真实基线了：

- 正式入口与构建产物
- auth/plugin/update 的最小可运行基线：`auth status`、`auth logout`、`setup-token` 启动、`plugin validate/list`、`update` 检查入口
- 会话输出基础链路：`--print`、`json`、`stream-json`、`--resume`、`--continue`
- 高级会话链路：`--fork-session`、`--replay-user-messages`、`--include-partial-messages`
- 主 CLI permission mode 基线：`dontAsk`、`acceptEdits`、`bypassPermissions`
- MCP 配置链路：`add`、`add-json`、`list`、`get`、`remove`、`reset-project-choices`
- MCP 运行态链路：`mcp serve`、`stdio/http/sse`、配置优先级
- MCP 工具暴露：`list_tools`、最小 `call_tool`
- MCP 高风险工具可执行性：`Bash`、`Edit`、`Write`
- 插件生命周期：`marketplace add`、`install`、`update`、`uninstall`
- REPL 与集成链路：REPL 启动、`--worktree`、`--ide` 连接 Cursor 成功、`--chrome` 最小启动、`--tmux` 缺依赖分支
- REPL 深链路：slash commands、tool calling、session persistence

## 切换约束

在 `/Users/yanluohao/开发/cc-local/CLI_COMPATIBILITY_CHECKLIST.md` 未全部清空之前：

- 不允许把 `packages/cli` 设为正式入口
- 不允许让全局 `cclocal` 指向 `packages/cli/dist/index.js`
- 不允许删除旧主线 `dist/cli.js` 产物链路
