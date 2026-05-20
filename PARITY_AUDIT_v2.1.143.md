# cc-local 功能差距调研报告（深度版）

> 对标官方 Claude Code npm v2.1.143
> 调研日期: 2026-05-18
> 调研方法: 安装官方最新版，逐模块对比 --help 输出、运行时行为与 cc-local 源码

---

## 一、模块级对比总览

| 模块 | 官方 | cc-local | 对齐度 | 遗留缺口 |
|------|------|---------|--------|---------|
| CLI 顶层选项 | 42 个 | 42 个 | 100% | 无 |
| MCP 子命令 | 8 个 | 8 个 | 100% | 无 |
| Auth 子命令 | 3 个 | 3 个 | 100% | 无 |
| Plugin 子命令 | 14 个 | 14 个 | 100% | 选项不全 |
| Project 子命令 | 1 个 | 1 个 | 100% | 选项已补齐 |
| Agents 子命令 | 1 个 | 1 个 | 100% | 选项已补齐 |
| 内置工具 | 54 个 | 54 个 | 100% | feature gate 阻断 |
| REPL 斜杠命令 | 74 个 | 74 个 | 100% | feature gate 阻断 |

---

## 二、Plugin 模块深度对比

### 已实现但选项不全的子命令

#### 2.1 `plugin prune | autoremove`

| 选项 | 官方 | cc-local 实现 | 缺口 |
|------|------|-------------|------|
| `--dry-run` | 列出将被删除的内容但不实际删除 | **缺失** | P1 |
| `-s, --scope <scope>` | 清理范围: user, project, local (默认 user) | **缺失** | P1 |
| `-y, --yes` | 跳过确认提示 | **缺失** | P1 |

当前 cc-local 实现无条件删除所有孤立 node_modules，无法预览或控制范围。

#### 2.2 `plugin tag [path]`

| 选项 | 官方 | cc-local 实现 | 缺口 |
|------|------|-------------|------|
| `--dry-run` | 打印将创建的标签但不实际创建 | **缺失** | P1 |
| `-f, --force` | 跳过脏工作树和标签已存在检查 | **缺失** | P2 |
| `-m, --message <msg>` | 标签注释消息（%s 替换为版本号） | **缺失** | P2 |
| `--push` | 创建标签后推送到远程 | **缺失** | P2 |
| `--remote <name>` | --push 推送到的远程名（默认 origin） | **缺失** | P3 |

当前 cc-local 实现无条件执行 `git tag`，无安全检查。

#### 2.3 `plugin enable/disable` scope 选项

| 子命令 | 官方 scope 选项 | cc-local scope 选项 | 缺口 |
|--------|----------------|-------------------|------|
| `plugin enable` | user, project, local, **managed** | user, project, local | 缺 "managed" |
| `plugin disable` | user, project, local, **managed** | user, project, local | 缺 "managed" |

注: `plugin update` 已正确包含 "managed" scope（使用 VALID_UPDATE_SCOPES）。

---

## 三、工具（Tools）模块深度对比

### 3.1 Feature Gate 阻断的工具

以下工具在 cc-local 代码中存在，但因 feature flag 未启用而在运行时不可用：

| 工具名 | 功能 | 阻断原因 | 官方是否可用 | 建议 |
|--------|------|---------|------------|------|
| `SendUserMessage` (Brief) | agent→用户消息推送 | KAIROS/KAIROS_BRIEF 未启用 | 是（--brief 触发） | **已修复** |
| `Sleep` | 主动模式等待 | PROACTIVE 已启用 | 是 | 已可用 |
| `snip` | 上下文裁剪 | HISTORY_SNIP 已启用 | 是 | 已可用 |
| `SendMessage` | agent 间通信 | AGENT_TEAMS GrowthBook 门控 | 是（opt-in） | 需 GB 配置 |
| `TeamCreate/Delete` | agent 团队管理 | AGENT_TEAMS GrowthBook 门控 | 是（opt-in） | 需 GB 配置 |
| `WebBrowser` | 浏览器自动化 | WEB_BROWSER_TOOL 未启用 | 否（内部） | 不修 |
| `CronCreate/Delete/List` | 定时任务 | AGENT_TRIGGERS 未启用 | 否（内部） | 不修 |
| `RemoteTrigger` | 远程触发 | AGENT_TRIGGERS_REMOTE 未启用 | 否（内部） | 不修 |
| `Monitor` | 监控工具 | MONITOR_TOOL 未启用 | 否（内部） | 不修 |
| `SendUserFile` | 发送文件给用户 | KAIROS 未启用 | 否（内部） | 不修 |
| `PushNotification` | 推送通知 | KAIROS 未启用 | 否（内部） | 不修 |
| `SubscribePR` | PR 订阅 | KAIROS_GITHUB_WEBHOOKS 未启用 | 否（内部） | 不修 |
| `ListPeers` | 对等发现 | UDS_INBOX 未启用 | 否（内部） | 不修 |
| `Workflow` | 工作流脚本 | WORKFLOW_SCRIPTS 未启用 | 否（内部） | 不修 |
| `CtxInspect` | 上下文检查 | CONTEXT_COLLAPSE 未启用 | 否（内部） | 不修 |
| `TerminalCapture` | 终端捕获 | TERMINAL_PANEL 未启用 | 否（内部） | 不修 |

**关键发现**: 官方 CLI 对外部用户启用的 feature-gated 工具只有 Brief（通过 --brief），其他工具即使官方也需要内部构建或 GrowthBook 灰度才能用。cc-local 已修复 Brief 问题，其余无需改动。

### 3.2 运行时条件工具

| 工具 | 条件 | 说明 |
|------|------|------|
| `PowerShell` | 仅 Windows + POWERSHELL_AUTO_MODE | 自动分类受 feature gate，但工具本身可用 |
| `ToolSearch` | 需 `ENABLE_TOOL_SEARCH=1` 或 `tool_reference` beta | 默认关闭 |
| `TodoWrite` vs `TaskCreate/Get/Update/List` | 互斥：非交互用 V2，交互用 V1 | 默认交互模式用 TodoWrite |
| `LSP` | 需 `ENABLE_LSP_TOOL=1` + LSP 连接 | 环境变量控制 |
| `Glob/Grep` | 有嵌入式搜索工具时排除 | 默认包含 |

---

## 四、REPL 斜杠命令深度对比

### 4.1 Feature Gate 阻断的命令

| 命令 | 功能 | 阻断原因 | 官方外部可用 | 建议 |
|------|------|---------|------------|------|
| `/brief` | 切换 Brief 模式 | KAIROS/KAIROS_BRIEF 未启用 | 是 | **需修复** |
| `/assistant` | 强制助手模式 | KAIROS 未启用 | 否 | 不修 |
| `/remote-control` `/rc` | 远程控制 | BRIDGE_MODE 未启用 | 否 | 不修 |
| `/voice` | 语音模式 | VOICE_MODE 未启用 | 否 | 不修 |
| `/workflows` | 工作流脚本 | WORKFLOW_SCRIPTS 未启用 | 否 | 不修 |
| `/subscribe-pr` | PR 订阅 | KAIROS_GITHUB_WEBHOOKS 未启用 | 否 | 不修 |
| `/ultraplan` | 超级计划 | ULTRAPLAN 未启用 | 否 | 不修 |
| `/torch` | 火炬模式 | TORCH 未启用 | 否 | 不修 |
| `/peers` | 对等发现 | UDS_INBOX 未启用 | 否 | 不修 |
| `/fork` | 独立分叉命令 | FORK_SUBAGENT 未启用 | 否（回退为 /branch alias） | 不修 |

**关键发现**: `/brief` 是官方外部版本唯一可见的 feature-gated 命令，其余全部是内部/灰度功能。`/brief` 需要修复。

### 4.2 GrowthBook 运行时门控的命令

| 命令 | 门控 | 说明 |
|------|------|------|
| `/think-back` | `tengu_thinkback` | 灰度实验，服务器不可达时可能不可用 |
| `/fast` | `tengu_penguins_off` | 灰度实验，控制快速模式可用性 |
| `/feedback` | 3P provider 检查 + 政策 | 使用第三方 API 时自动禁用 |
| `/advisor` | 订阅等级 + `tengu_claude_code_advisor` | 需特定订阅等级 |
| `/privacy-settings` | `isConsumerSubscriber()` | 需消费者订阅 |
| `/rate-limit-options` | `isClaudeAISubscriber()` | 需 Claude AI 订阅 |
| `/remote-env` | 订阅 + `allow_remote_sessions` 政策 | 需订阅+政策允许 |
| `/passes` | 推荐资格缓存 | 可能首次启动时隐藏 |
| `/chrome` | 非交互模式 | 仅交互模式可用 |
| `/desktop` | 平台检查 | 仅 macOS/Win x64 |

---

## 五、待修复缺口清单

| # | 缺口 | 优先级 | 涉及文件 | 说明 | 状态 |
|---|------|--------|---------|------|------|
| 1 | `plugin prune` 缺 `--dry-run` `-s/--scope` `-y/--yes` | P1 | main.tsx | 3 个选项缺失 | **DONE** |
| 2 | `plugin tag` 缺 `--dry-run` `-f/--force` `-m/--message` `--push` `--remote` | P2 | main.tsx | 5 个选项缺失 | **DONE** |
| 3 | `plugin enable/disable` scope 缺 "managed" | P3 | main.tsx | scope 选项不完整 | **N/A** — 误判，官方也是 user/project/local |
| 4 | `/brief` 斜杠命令被 feature gate 阻断 | P1 | commands.ts | 需要解除门控 | **DONE** |

注：`--brief` 顶层 CLI 标志已在本次调研前修复，但 `/brief` REPL 斜杠命令的门控修复不完整——需要确认 `commands.ts` 中 brief 命令的 `isEnabled` 条件。

---

## 六、不涉及的差异（无需修改）

1. **Ant-only 工具** — Config, Tungsten, SuggestBackgroundPR, REPL, VerifyPlanExecution, OverflowTest: 内部专用
2. **Ant-only 命令** — 30+ 个内部命令（commit, commit-push-pr, bughunter 等）: 内部专用
3. **Ant-only 隐藏选项** — 全部已注册，与官方一致
4. **描述文本差异** — 不影响功能
5. **MCP 模块** — 100% 对齐，无缺口
6. **Auth 模块** — 100% 对齐，无缺口
7. **内部 feature-gated 工具/命令** — 官方外部版本同样不可用
