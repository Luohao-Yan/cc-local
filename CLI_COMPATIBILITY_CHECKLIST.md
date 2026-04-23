# CLI Compatibility Checklist

本清单用于约束 `cclocal` 的正式入口和兼容目标。

## 正式入口

从现在起，`cclocal` 的唯一正式入口定义为：

- 开发启动：`bun run start`
- 构建产物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 源码路由入口：`/Users/yanluohao/开发/cc-local/packages/cli/src/index.ts`
- 默认 UI 入口：`/Users/yanluohao/开发/cc-local/src/entrypoints/cli.tsx`
- 全局安装脚本：`/Users/yanluohao/开发/cc-local/scripts/install-global.sh`
- Windows 安装脚本：`/Users/yanluohao/开发/cc-local/scripts/install-global.cmd`

`dist/cli.js` 是统一路由入口。无子命令、`--help`、`--print`、默认 REPL 等用户主路径必须保持旧版 Claude Code UI；`packages/cli`、`packages/server`、`packages/core` 作为新架构底座承接 `mcp`、`models`、`sessions` 等管理子命令和 REST/MCP 能力。

## 对齐原则

- 目标不是“能跑一部分”，而是“终端里的 `cclocal` 与重构前旧 CLI 功能完全对齐”。
- 只要默认 UI、帮助输出、REPL、`--print` 与旧版存在用户可感知降级，就不能把 packages 简化 REPL 放到主入口。
- 新架构只能在不影响正式入口的前提下持续开发。

## 顶层命令兼容

- [x] 默认交互式启动
- [x] `--help`
- [x] `--version`
- [x] `--print`
- [x] `--model`
- [x] `agents`
- [x] `auth`
- [x] `doctor`
- [x] `mcp`
- [x] `plugin|plugins`
- [x] `setup-token`
- [x] `update|upgrade`

## 顶层会话能力兼容

- [x] 直接输入 prompt 启动会话
- [x] `--continue`
- [x] `--resume`
- [x] `--fork-session`
- [x] `--session-id`
- [x] `--name`
- [x] `--no-session-persistence`
- [x] `--output-format`
- [x] `--input-format`
- [x] `--include-partial-messages`
- [x] `--include-hook-events`
- [x] `--replay-user-messages`

## 权限与执行模式兼容

- [x] `--permission-mode`
- [x] `--dangerously-skip-permissions`
- [x] `--allow-dangerously-skip-permissions`
- [x] `--allowedTools|--allowed-tools`
- [x] `--disallowedTools|--disallowed-tools`
- [x] `--tools`
- [x] `--strict-mcp-config`

## Prompt 与上下文兼容

- [x] `--system-prompt`
- [x] `--append-system-prompt`
- [x] `--settings`
- [x] `--setting-sources`
- [x] `--add-dir`
- [x] `--file`
- [x] `--agents <json>`
- [x] `--agent`
- [x] `--plugin-dir`
- [x] `--disable-slash-commands`

## 模型与输出控制兼容

- [x] `--fallback-model`
- [x] `--max-budget-usd`
- [x] `--json-schema`
- [x] `--effort`
- [x] `--verbose`
- [x] `--betas`

## 调试与诊断兼容

- [x] `--debug`
- [x] `--debug-file`
- [x] `--mcp-debug`
- [x] `doctor`

## MCP 工作流兼容

- [x] `mcp list`
- [x] `mcp get`
- [x] `mcp add`
- [x] `mcp add-json`
- [x] `mcp add-from-claude-desktop`
- [x] `mcp remove`
- [x] `mcp reset-project-choices`
- [x] `mcp serve`
- [x] 支持 stdio MCP
- [x] 支持 HTTP/SSE MCP
- [x] 支持 header/env/transport 配置

## 认证、插件与更新兼容

- [x] `auth login`
- [x] `auth logout`
- [x] `auth status`
- [x] `plugins`
- [x] `update|upgrade`
- [x] `install`

## IDE / 环境集成兼容

- [x] `--ide`
- [x] `--chrome`
- [x] `--no-chrome`
- [x] `--worktree`
- [x] `--tmux`
- [x] `--from-pr`

## 新架构切换门槛

以下条件用于约束“用户无感”交付，不再阻塞默认入口切换：

- [x] 默认帮助输出与旧 Claude Code UI 对齐，packages 管理子命令保持可用
- [x] `packages/cli` 的会话恢复、权限模式、输出模式与旧 CLI 对齐
- [x] `packages/cli` 的 MCP 管理能力与旧 CLI 对齐
- [x] `packages/cli` 的认证、插件、更新、doctor 与旧 CLI 对齐
- [x] 默认交互式 REPL 继续使用旧版 Ink UI，避免简化版 REPL 造成用户体验降级
- [x] 全局安装、构建、升级、发布链路指向统一路由 `dist/cli.js`
- [x] 针对上述能力有自动化回归测试
- [x] 用户文档完成迁移，且不会误导用户走到半成品入口

## 当前剩余边界

- `--legacy` 仍保留，用于回归验证或打开旧 Ink 全屏 UI。
- 真实 OAuth、IDE、Chrome、tmux 等外部集成仍需要真实环境验收；packages CLI 已保留参数、元数据和命令入口，不会静默丢弃用户意图。
- `update --apply` 会真实执行 `git pull`、`bun install`、`bun run build:all`，默认 `update` 只展示状态与命令，避免误触更新当前工作区。
