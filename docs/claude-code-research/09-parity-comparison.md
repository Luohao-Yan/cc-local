# 官方 npm v2.1.141 vs cc-local 功能差异对比

> 基于官方 `@anthropic-ai/claude-code@2.1.141` 逆向分析与本地 cc-local 实现的逐模块对比。
> 包含 Core 层（简化实现）与 CLI 层（完整 React Compiler 输出）的双层分析。
> 深度验证：逐文件代码审计 + 功能缺失精确定位。

---

## 架构差异概览

cc-local 采用**双层架构**：
- **Core 层** (`packages/core/`)：独立的简化实现，2,076 行工具代码，92 行压缩服务，94 行权限引擎
- **CLI 层** (`packages/cli/`)：基于官方 React Compiler 输出的完整实现，4,142 行压缩代码，完整工具集

官方 npm 只有单层架构（所有逻辑均在编译后的二进制中）。

**关键发现**：CLI 层拥有大量完整实现（MCP OAuth ~1500 行、Yolo 分类器 ~1700 行、Channel 通知 317 行、Elicitation 314 行），但这些实现多数被 feature flag 或 GrowthBook gate 封锁，在默认构建中不可用。

---

## 1. 工具系统 (Tool System)

### 1.1 Core 层内置工具实现细节

| 工具 | Core 文件 | 行数 | 实现状态 | 具体缺失功能 |
|---|---|---|---|---|
| **Bash** | `bashTool.ts` | 154 | ⚠️ 部分 | 无 `dangerouslyDisableSandbox`、无 `run_in_background`、无 AST 命令解析（用正则危险模式检测）、无环境变量过滤、无 elapsed_time 进度通知、退出码语义不同 |
| **Read** | `fileReadTool.ts` | 65 | ⚠️ 部分 | 无 PDF 分页读取、无图片维度映射、无 Notebook 渲染、无二进制文件检测（会输出原始字节）、行号仅在部分读取时显示 |
| **Write** | `fileWriteTool.ts` | 68 | ⚠️ 基本完整 | 无 `append` 模式、无文件大小限制、无备份文件创建 |
| **Edit** | `fileEditTool.ts` | 99 | ⚠️ 基本完整 | 无 `replace_all` 参数、无 `dry_run` 模式、无 `.orig` 备份 |
| **Glob** | `globTool.ts` | 64 | ⚠️ 部分 | 使用 JS `glob` 包（非 ripgrep），无 `type` 参数、无修改时间排序 |
| **Grep** | `grepTool.ts` | 177 | ⚠️ 部分 | 无 `type` 参数（语言过滤）、无 `-A/-B/-C` 上下文、无 `multiline`、无 `offset` |
| **WebFetch** | `webFetchTool.ts` | 77 | ⚠️ 部分 | 无 AI 内容提取（官方用内部模型处理）、无 JS 渲染、无重试逻辑、无 content-type 差异化处理 |
| **WebSearch** | `webSearchTool.ts` | 109 | ❌ **实现不同** | 官方用 Anthropic 服务器 API；cc-local 用 DuckDuckGo HTML 抓取+正则解析，无域名过滤、无结构化输出 |
| **NotebookEdit** | `notebookEditTool.ts` | 78 | ✅ 功能性 | 基础 cell source 替换，无 output/execution 支持 |
| **TodoWrite** | `todoWriteTool.ts` | 77 | ✅ 功能性 | 内存存储，无持久化 |
| **Agent** | `agentTool.ts` | 101 | ⚠️ 部分 | 无 `run_in_background`、无 `isolation: "worktree"`、无 `mode` 参数、无 Agent 类型分化 |
| **TaskCreate/Get/List/Update** | `taskTools.ts` | 151 | ✅ 功能性 | 内存存储，无持久化；TaskUpdate 缺 `addBlocks`/`addBlockedBy`/`owner`/`metadata` |
| **TaskOutput** | `taskOutputTools.ts` | 94 | ⚠️ 部分 | TaskStop 是 stub（返回消息但不取消 AbortController） |
| **EnterWorktree** | `conditionalTools.ts` | 140 | ❌ **STUB** | `stubExecute()` 返回 "not available in packages-native mode" |
| **ExitWorktree** | 同上 | — | ❌ **STUB** | 同上 |
| **LSP** | 同上 | — | ❌ **STUB** | 需要 `ENABLE_LSP_TOOL`，仍为 stub |
| **PowerShell** | 同上 | — | ❌ **STUB** | 仅 Windows + 特定环境变量，仍为 stub |
| **EnterPlanMode** | `planModeTools.ts` | 73 | ❌ **STUB** | 返回文本但不切换执行模式 |
| **ExitPlanMode** | 同上 | — | ❌ **STUB** | 同上 |
| **AskUserQuestion** | `interactiveTools.ts` | 116 | ⚠️ 部分 | 有回调路径，无回调时降级为占位符 |
| **SendMessage** | 同上 | — | ❌ **STUB** | 无实际消息分发 |
| **SendUserMessage** | 同上 | — | ❌ **STUB** | 无实际路由 |
| **Skill** | `skillAndConfigTools.ts` | 181 | ⚠️ 部分 | 注册表查找可用，无匹配时降级为委托消息 |
| **ToolSearch** | 同上 | — | ✅ 功能性 | 基础注册表搜索 |
| **Config** | 同上 | — | ✅ 功能性 | 委托 configManager |
| **mcp** | `mcpCompatTools.ts` | 72 | ✅ 功能性 | 真实 MCP 委托 |
| **ReadMcpResourceTool** | 同上 | — | ✅ 功能性 | 真实 MCP 委托 |

### 1.2 Legacy 兼容工具（`legacyCompatibilityTools.ts`, 158 行）

| 工具 | 状态 |
|---|---|
| `REPL` | ✅ 功能性（执行 shell 命令） |
| `Monitor` | ✅ 功能性（返回进程信息） |
| `VerifyPlanExecution` | ❌ 静态文本 stub |
| `SuggestBackgroundPR` | ❌ 静态文本 stub |
| `remote_skill` | ❌ 静态文本 stub |
| `in-process` | ❌ 静态文本 stub |
| `ship-audit` | ❌ 静态文本 stub |
| `migration-review` | ❌ 静态文本 stub |

### 1.3 CLI 层工具

CLI 层包含完整的官方工具实现（React Compiler 输出），但它们依赖 `AppState` 和内部服务，无法独立在 Core 层运行。需要通过桥接适配器 (`bridge/toolAdapters.ts`) 调用。

### 1.4 工具系统关键差异

| 特性 | 官方 npm | cc-local Core | cc-local CLI |
|---|---|---|---|
| **延迟工具加载 (DeferredTool)** | ✅ MCP 工具默认延迟，ToolSearch 按需加载 | ❌ 未实现 | ✅ 完整实现（`isDeferredTool()`, 757行搜索逻辑） |
| **沙箱执行** | ✅ macOS sandbox-exec / Docker | ❌ 未实现 | ✅ 逻辑存在 |
| **Auto Mode 分类器** | ✅ 独立 LLM 做权限决策 | ❌ 未实现 | ✅ Yolo 分类器 ~1700 行，**已启用**（TRANSCRIPT_CLASSIFIER flag） |
| **Bash 分类器** | ✅ AST 解析 + 分类 | ❌ 未实现 | ❌ **ANT-ONLY stub**（始终返回 disabled） |
| **工具进度通知** | ✅ 实时 elapsed_time | ❌ 未实现 | ✅ `onProgress` 回调 |
| **FAA 快速放行集** | ✅ 明确定义 | ❌ Core 无 | ✅ `SAFE_YOLO_ALLOWLISTED_TOOLS` 完整定义 |
| **并行工具执行** | ✅ 最多 10 个 | ✅ 有实现 | ✅ 有实现 |

**FAA (Fast-Path Auto-Approve) 完整列表**（CLI 层已实现）：
- **始终放行**: FileRead, Grep, Glob, LSP, ToolSearch, ListMcpResources, ReadMcpResourceTool, TodoWrite, TaskCreate/Get/Update/List/Stop/Output, AskUserQuestion, EnterPlanMode, ExitPlanMode, TeamCreate/Delete, SendMessage, Sleep, YoloClassifier
- **需分类器决策**: Bash, FileEdit, FileWrite, NotebookEdit, SedEdit, ComputerUse, WebFetch, 所有 MCP 工具（除 List/Read 外）

---

## 2. 命令系统 (Slash Commands)

| 类别 | 官方 npm | cc-local | 差异 |
|---|---|---|---|
| **总命令数** | ~107 | ~121 | cc-local 数量更多（含实验性/调试命令） |
| **缺失命令** | `proactive` | — | cc-local 缺 `/proactive` |
| **额外命令** | — | 多个实验/调试命令 | cc-local 有额外调试/内部命令 |

关键命令差异不变，详见之前版本。

---

## 3. MCP 协议实现

### 3.1 传输类型对比

| 传输类型 | 官方 npm | cc-local Core | cc-local CLI |
|---|---|---|---|
| **stdio** | ✅ | ✅ | ✅ |
| **SSE** | ✅ | ✅ | ✅ |
| **HTTP (StreamableHTTP)** | ✅ | ✅ | ✅ |
| **WebSocket** | ✅ | ✅ | ✅ |
| **SSE-IDE** | ✅ | ❌ | ✅ (带 authToken) |
| **WS-IDE** | ✅ | ❌ | ✅ (带 authToken) |
| **sdk** | ✅ | ❌ | ✅ (进程内 SDK) |
| **claudeai-proxy** | ✅ | ❌ | ✅ |
| **DirectConnect** | ✅ | ❌ | ❌ |

### 3.2 MCP 特性深度对比

| 特性 | 官方 npm | cc-local Core | cc-local CLI | 详情 |
|---|---|---|---|---|
| **OAuth 认证流** | ✅ 完整 | ❌ 无 | ✅ **~1500 行** | CLI 完整实现 DCR + PKCE + token 刷新 + XAA |
| **Channel 通知** | ✅ | ❌ | ✅ **317 行** | 7 层门控：capability + GrowthBook + OAuth + managed org + session list + marketplace + allowlist |
| **Elicitation** | ✅ | ❌ | ✅ **314 行** | 完整实现，支持 form 和 URL 两种模式，含 hook 集成 |
| **资源订阅** | ✅ subscribe/unsubscribe/updated | ❌ | ❌ **未找到** | 完全缺失 |
| **MCPB 包格式** | ✅ | ❌ | ❌ | 完全缺失 |
| **404 自动重连** | ✅ session-not-found | ❌ | ❌ | 完全缺失 |
| **401/403 重认证** | ✅ | ❌ | ✅ | OAuth 流程可触发刷新 |
| **非阻塞连接** | ✅ | ❌ | ❌ | 完全缺失 |
| **企业控制** | ✅ 3 项 | ❌ Core 无 | ⚠️ 2 项实现，1 项 schema-only | allowedMcpServers/deniedMcpServers 有代码；strictMcpServersOnly 仅 schema 定义 |
| **版本协商** | ✅ 5 级回退 | ❌ SDK 默认 | ❌ SDK 默认 | 均依赖 MCP SDK 内部处理 |
| **OAuth 回调端口** | — | — | ✅ | Windows: 39152-49151, 其他: 49152-65535, fallback: 3118 |

**Channel 通知的 7 层门控**（按顺序检查）：
1. MCP 服务器声明 `experimental['claude/channel']` capability
2. `isChannelsEnabled()` → `tengu_harbor` GrowthBook flag
3. 服务器必须使用 OAuth 认证
4. 组织必须是 managed org
5. Session 必须在 `--channels` 列表中
6. 服务器必须通过 marketplace 验证
7. `getEffectiveChannelAllowlist()` → org 配置或 GrowthBook `tengu_harbor_ledger`

**Elicitation 机制**（CLI 层完整实现）：
- 注册 `ElicitRequestSchema` 和 `ElicitationCompleteNotificationSchema` 处理器
- 支持 form 模式（表单字段渲染）和 URL 模式（两阶段：初始提示 + 等待状态含 skip 按钮）
- Hook 集成：`runElicitationHooks()` / `runElicitationResultHooks()`
- 错误码 -32042

### 3.3 Core MCP 类型差异

Core `types.ts` 仅 56 行，4 种传输类型，缺少 `authToken`、`ideRunningInWindows`、OAuth 元数据字段。

CLI `services/mcp/types.ts` 完整覆盖 7+ 传输类型和所有配置字段。

---

## 4. 会话管理 (Session Management)

| 特性 | 官方 npm | cc-local Core | cc-local CLI |
|---|---|---|---|
| **存储格式** | JSONL 文件 | SQLite (bun:sqlite) | JSONL 文件 |
| **数据库路径** | — | `~/.cclocal/sessions.db` | — |
| **SQLite 配置** | — | WAL 模式, FK ON, busy_timeout 5s, cache 10MB | — |
| **消息链** | parentUuid + 循环检测 | ✅ 有实现 | ✅ 有实现 |
| **Fork** | UUID 重映射 + forkedFrom | ✅ 有实现 | ✅ 有实现 |
| **SessionStore SDK** | ✅ 外部存储后端接口 | ❌ 未实现 | ❌ 未实现 |
| **转录镜像** | ✅ subprocess→parent 实时镜像 | ❌ 未实现 | ❌ **9 行空函数** stub（KAIROS flag 门控） |
| **409 冲突恢复** | ✅ UUID 采用/并发修改恢复 | ❌ 未实现 | ✅ prompt-too-long 有处理 |
| **清理配置** | ✅ 30 天默认 | ❓ 未确认 | ✅ **603 行**，11 个清理类别 |
| **便携会话存储** | — | — | ✅ **~794 行** |

**清理类别**（CLI 层完整实现）：
1. 旧消息/日志文件
2. 旧 session 文件（.jsonl, .cast, tool-results 子目录）
3. 旧 plan 文件
4. 旧 file-history 备份
5. 旧 session-env 目录
6. 旧 debug 日志
7. 旧 image 缓存
8. 旧 paste 数据
9. 过期 agent worktree
10. Anthropic npm 缓存（ant-only，每日节流）
11. 旧二进制版本（每日节流）

---

## 5. 上下文压缩 (Context Compaction)

### 5.1 代码量对比

| 层级 | 总行数 | 文件数 |
|---|---|---|
| Core | 92 | 1 |
| CLI | 4,142 | 15 |
| **总计** | **4,234** | **16** |

### 5.2 压缩策略详细对比

| 策略 | 官方 npm | Core | CLI | 阻塞标志 |
|---|---|---|---|---|
| **自动压缩** | ✅ | ⚠️ 92行基础版 | ✅ 351行 | — |
| **微压缩 (Microcompact)** | ✅ 时间阈值触发 | ❌ | ✅ **530行** | — |
| **API 微压缩** | ✅ 服务端触发 | ❌ | ✅ **153行** (ant-only) | — |
| **缓存微压缩** | ✅ 缓存编辑 | ❌ | ❌ **79行 STUB** | `CACHED_MICROCOMPACT` |
| **Session Memory 压缩** | ✅ 会话记忆整合 | ❌ | ✅ **630行** | `ENABLE_CLAUDE_CODE_SM_COMPACT` |
| **预计算压缩 (Reactive)** | ✅ 413触发 | ❌ | ❌ **66行 STUB** | `REACTIVE_COMPACT` |
| **Snip 压缩** | ✅ 紧急裁剪 | ❌ | ❌ **28行 STUB** | `CONTEXT_COLLAPSE` |
| **Snip 投影** | ✅ | ❌ | ❌ **9行 STUB** | `CONTEXT_COLLAPSE` |
| **时间微压缩配置** | ✅ | ❌ | ⚠️ 43行配置（disabled） | `tengu_slate_heron` GrowthBook |

### 5.3 Hook 集成（**纠正：CLI 层已实现**）

PreCompact/PostCompact hooks 在 CLI 层 `compact.ts` 中**完全实现**：

- `executePreCompactHooks(compactData, signal?, timeoutMs?)` → 返回 `{newCustomInstructions?, userDisplayMessage?}`
- `executePostCompactHooks(compactData, signal?, timeoutMs?)` → 返回 `{userDisplayMessage?}`
- Hook 输入 schema：
  - `PreCompactHookInput`: `hook_event_name='PreCompact'`, `trigger`, `custom_instructions`
  - `PostCompactHookInput`: `hook_event_name='PostCompact'`, `trigger`, `compact_summary`
- 自定义指令通过 `mergeHookInstructions()` 合并到压缩提示词

**Core 层无 hook 集成**。

### 5.4 断路器机制

- CLI: `AutoCompactTrackingState.consecutiveFailures` 计数器，3 次连续失败后停止重试
- Core: 无断路器，压缩失败直接抛错

### 5.5 Prompt-Too-Long 恢复

- CLI: `truncateHeadForPTLRetry()` — 当压缩本身触发 prompt-too-long 时，按 API round 分组丢弃最旧的消息组并重试
- Core: 无此机制

---

## 6. API & 认证 (API & Auth)

| 特性 | 官方 npm | cc-local Core | cc-local CLI |
|---|---|---|---|
| **Anthropic 直连** | ✅ API Key + OAuth | ✅ API Key | ✅ API Key + OAuth |
| **AWS Bedrock** | ✅ 完整 IAM + FIPS + Mantle | ⚠️ 有 shim | ⚠️ 265行基础版 |
| **Google Vertex AI** | ✅ 完整 GCP OAuth + 多区域 | ⚠️ 有 shim | ⚠️ 有 shim |
| **Anthropic Foundry** | ✅ | ⚠️ 有 shim | ⚠️ 有 shim |
| **Custom/OpenAI 兼容** | ✅ | ✅ | ✅ 完整实现 |
| **MCP OAuth** | ✅ CIMD/SEP-991 | ❌ Core 无 | ✅ **~1500 行**（DCR + PKCE + token 刷新 + XAA） |
| **OAuth 刷新锁** | ✅ | ❌ | ✅ 存在 |
| **apiKeyHelper** | ✅ 外部命令获取 Key | ❓ 未确认 | ❓ 未确认 |
| **Proxy/mTLS** | ✅ | ✅ | ✅ |

### 6.1 模型支持

| 模型 | 官方 | cc-local |
|---|---|---|
| Claude 3.x-4.6 全系列 | ✅ | ✅ |
| Fast 模式 | ✅ claude-opus-4-6-fast | ❌ |
| 模型别名 | ✅ sonnet/opus/haiku | ✅ |

---

## 7. Hooks 系统

### 7.1 事件类型（**纠正：PreCompact/PostCompact 在 CLI 层已实现**）

| 事件类型 | 官方 npm | cc-local Core | cc-local CLI |
|---|---|---|---|
| **PreToolUse** | ✅ | ✅ | ✅ |
| **PostToolUse** | ✅ | ✅ | ✅ |
| **PromptSubmit** | ✅ | ✅ | ✅ |
| **SessionStart** | ✅ | ✅ | ✅ |
| **Stop** | ✅ | ✅ | ✅ |
| **PreCompact** | ✅ | ❌ | ✅ **已实现**（compact.ts 中集成） |
| **PostCompact** | ✅ | ❌ | ✅ **已实现**（compact.ts 中集成） |
| **ElicitationResult** | ✅ | ❌ | ✅ **已实现**（elicitationHandler.ts 中调用 `runElicitationResultHooks()`） |

### 7.2 Hook 类型

| 类型 | 官方 | cc-local |
|---|---|---|
| **command** | ✅ | ✅ |
| **prompt** | ✅ | ✅ |
| **agent** | ✅ | ✅ |
| **http** | ✅ | ❓ 未确认 |
| **mcp_tool** | ✅ | ❌ 未实现 |

---

## 8. 权限系统 (Permissions)

### 8.1 模式对比

| 模式 | 官方 npm | cc-local Core | cc-local CLI |
|---|---|---|---|
| **default** | ✅ | ✅ | ✅ |
| **auto** | ✅ + Yolo 分类器 | ❌ Core 无此模式 | ✅ + Yolo 分类器（**已启用**） |
| **plan** | ✅ | ❌ Core 无此模式 | ✅ |
| **acceptEdits** | ✅ | ✅ | ✅ |
| **dontAsk** | ✅ | ✅ | ✅ |
| **bypassPermissions** | ✅ | ✅ | ✅ |

**Core 层仅 4 种模式**，缺 `auto` 和 `plan`。

### 8.2 Yolo 分类器（Auto Mode）— **CLI 层已启用**

| 组件 | 状态 | 文件 | 行数 |
|---|---|---|---|
| **Yolo 分类器** | ✅ 完整实现 | `utils/permissions/yoloClassifier.ts` | ~1700 |
| **分类器决策模块** | ✅ 完整实现 | `utils/permissions/classifierDecision.ts` | 98 |
| **Bash 分类器** | ❌ **ANT-ONLY STUB** | `utils/permissions/bashClassifier.ts` | 62 |

- `TRANSCRIPT_CLASSIFIER` 是 91 个 feature flag 中**6 个启用的之一**
- Bash 分类器始终返回 `{ matches: false, confidence: 'high', reason: 'This feature is disabled' }`
- 分类器使用 `sideQuery()` 调用 LLM 做权限决策
- 系统提示词包含 allow/soft_deny/environment 规则（`getDefaultExternalAutoModeRules()`）

### 8.3 Core 权限引擎

`permissionPolicy.ts` (94 行)：简单的模式匹配 + allowlist/blocklist，通配符仅支持 `*` 和 `prefix*`。缺失 glob 模式、LLM 分类器、组织策略、hook 集成。

---

## 9. UI & 终端渲染

| 特性 | 官方 | cc-local |
|---|---|---|
| Ink 文件数 | 52 | 98 |
| 组件数 | 146+ | 146+ |
| 虚拟消息列表 | ✅ | ✅ |
| 主题系统 | ✅ | ✅ |
| Vim 模式 | ✅ | ✅ |
| Fast 模式 | ✅ | ❌ |
| PostCompact 调查 UI | ✅ | ✅ `usePostCompactSurvey.tsx` |

---

## 10. 插件系统

| 特性 | 官方 | cc-local |
|---|---|---|
| 本地插件 | ✅ | ✅ |
| URL 插件 | ✅ | ✅ |
| 市场 | ✅ | ✅ |
| 官方注册表 | ✅ | ✅ |
| MCPB 包 | ✅ | ❌ |

---

## 11. Bridge & 远程控制

| 特性 | 官方 | cc-local |
|---|---|---|
| Bridge API | ✅ | ✅ (35 文件, ~7627 行) |
| 远程控制 | ✅ | ✅ |
| Capacity Wake | ✅ | ❌ |
| Trusted Device | ✅ | ✅ `enrollTrustedDevice()` + `clearTrustedDeviceToken()` |
| JWT 工具 | ✅ | ✅ |

---

## 12. Auto-Dream 记忆整合

| 特性 | 官方 | cc-local |
|---|---|---|
| 手动 /dream | ✅ | ✅ |
| 后台自动整合 | ✅ | ✅ |
| 剪枝 /prune | ✅ | ❓ 未确认 |
| 整合提示词 | ✅ | ✅ |

---

## 关键差异总结

### P0 — 重大缺失（影响核心功能）

1. **Auto Mode Yolo 分类器** — Core 层完全缺失；**CLI 层已完整实现**（~1700 行，`TRANSCRIPT_CLASSIFIER` flag 已启用）。当前 CLI 默认路径走桥接模式，分类器在桥接路径下可用
2. **Bash 分类器** — **ANT-ONLY stub**，始终返回 disabled。这意味着即使在 auto 模式下，Bash 命令无法被自动分类，只能手动审批或全部放行
3. **Worktree 工具** — Core 层 stub；CLI 层也**未找到真实实现**（EnterWorktree/ExitWorktree 无实际 git worktree 操作代码）
4. **三级上下文压缩** — Core 层仅 92 行基础版；CLI 层有 5 个活跃策略 + 4 个 stub 策略；Reactive Compact、Cached MC、Snip 均被 feature flag 封锁
5. **MCP OAuth 认证流** — Core 层完全缺失；**CLI 层已完整实现**（~1500 行，DCR + PKCE + XAA），但 Core MCPManager 无法触发
6. **延迟工具加载** — Core 层无 DeferredTool 概念；**CLI 层完整实现**（757 行搜索逻辑 + 自动阈值激活）
7. **WebSearch 实现差异** — 官方用 Anthropic 服务器 API；cc-local 用 DuckDuckGo HTML 抓取+正则解析，搜索质量和可靠性差距显著

### P1 — 重要缺失（影响体验/扩展性）

8. **MCP Channel 通知** — **CLI 层已实现**（317 行），但 7 层门控使其在大多数场景下不可用
9. **MCP Elicitation** — **CLI 层已实现**（314 行，含 hook 集成），但需要 MCP 服务器主动请求
10. **MCP 资源订阅** — **完全缺失**，Core 和 CLI 均未找到 subscribe/unsubscribe/updated 实现
11. **MCPB 插件包格式** — 完全缺失
12. **MCP 企业控制** — CLI 有 allowedMcpServers/deniedMcpServers 实现；strictMcpServersOnly 仅 VS Code 扩展 schema 定义，无执行逻辑
13. **SessionStore SDK 接口** — 完全缺失
14. **转录镜像** — 9 行空函数 stub（KAIROS flag 门控）
15. **Core 权限模式缺失** — Core 仅 4 种模式，缺 auto 和 plan
16. **Core PreCompact/PostCompact hooks** — Core 无 hook 集成；**CLI 已完整实现**
17. **Fast 模式** — 缺失
18. **Core Plan Mode 是 stub** — EnterPlanMode/ExitPlanMode 仅返回文本，不切换执行模式
19. **Core SendMessage/SendUserMessage 是 stub** — 无实际消息路由

### P2 — 小差异（可后续补充）

20. **Read 工具** — PDF/图片/Notebook/二进制检测
21. **Edit 工具** — `replace_all`/`dry_run`/备份
22. **Write 工具** — append 模式/大小限制/备份
23. **Grep 工具** — type/-A-B-C/multiline/offset
24. **Glob 工具** — ripgrep 后端/type/mtime 排序
25. **WebFetch 工具** — AI 提取/JS 渲染/重试/content-type
26. **TaskUpdate** — 依赖链/owner/metadata
27. **404/401 MCP 重连** — 自动重连和重认证
28. **非阻塞 MCP 连接** — `MCP_CONNECTION_NONBLOCKING`
29. **30+ 模型 ID** — 新模型/别名未同步
30. **Core 会话存储** — SQLite vs JSONL 格式差异

---

## 代码量对比速查

| 模块 | 官方 npm (估计) | cc-local Core | cc-local CLI |
|---|---|---|---|
| 工具系统 | ~5000+ 行 | 2,076 行 | 完整 (React Compiler 输出) |
| MCP 管理 | ~2000+ 行 | 548 行 | ~2000+ 行 (含 OAuth 1500 行) |
| 权限系统 | ~1500+ 行 | 94 行 | ~1800+ 行 (含分类器) |
| 上下文压缩 | ~3000+ 行 | 92 行 | 4,142 行 (15 文件) |
| 会话管理 | ~1000+ 行 | 533 行 (SQLite) | ~1400+ 行 (JSONL + cleanup) |
| Bridge | ~5000+ 行 | — | ~7,627 行 (35 文件) |

---

## 重要纠正记录

与初版对比，以下为经过深度代码审计后的纠正：

| 项目 | 初版结论 | 纠正后 | 证据 |
|---|---|---|---|
| PreCompact/PostCompact hooks | ❌ 完全缺失 | ✅ CLI 层已完整实现 | `compact.ts` 中 `executePreCompactHooks()` / `executePostCompactHooks()` |
| ElicitationResult hook | ❌ 未实现 | ✅ CLI 层已实现 | `elicitationHandler.ts` 中 `runElicitationResultHooks()` |
| Yolo 分类器 | ❌ 未实现 | ✅ CLI 层已实现且**已启用** | `TRANSCRIPT_CLASSIFIER` 是 6/91 启用的 flag 之一 |
| MCP OAuth | ⚠️ 有基础 | ✅ CLI 层完整实现 | `services/mcp/auth.ts` ~1500 行 |
| Channel 通知 | ❌ 未实现 | ✅ CLI 层已实现 | `channelNotification.ts` 317 行，7 层门控 |
| Elicitation 机制 | ❌ 未实现 | ✅ CLI 层已实现 | `elicitationHandler.ts` 314 行 |
| Core Plan Mode | ✅ 有实现 | ❌ **STUB** | 返回文本但不切换执行模式 |
| Core SendMessage | ✅ 有实现 | ❌ **STUB** | 无实际消息分发 |
| Edit replace_all | ✅ 功能对齐 | ❌ **缺失** | Core 版无 `replace_all` 参数 |
