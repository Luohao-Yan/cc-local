# Packages-Native 架构设计方案 v2

> **创建日期**: 2026-05-04
> **状态**: 进行中
> **基于**: 详细代码调查（非假设）

---

## 一、现有架构分析（已完成的代码）

### 1.1 核心模块清单

#### packages/core/src/ (17个文件)
```
已实现的核心功能：
├── engine/queryEngine.ts      ✅ 完整的 QueryEngine (397行)
│   ├── query() 方法           ✅ 支持流式输出
│   ├── executeWithTools()     ✅ 工具循环执行
│   └── cancel()               ✅ 取消机制
├── engine/anthropicClient.ts  ✅ Anthropic API 客户端
├── tools/registry.ts          ✅ 工具注册表 (127行)
├── tools/impl/*.ts            ✅ 22个工具实现
├── db/sessionStore.ts         ✅ SQLite 会话存储 (369行)
├── mcp/MCPManager.ts          ✅ MCP 管理器 (450+行)
├── permissions/permissionPolicy.ts ✅ 权限策略
├── config/configManager.ts    ✅ 配置管理
├── hooks/hookManager.ts       ✅ 钩子管理
├── analytics/analyticsManager.ts ✅ 分析管理
└── commands/registry.ts       ✅ 命令注册表
```

#### packages/cli/src/bridge/ (34个文件)
```
已实现的桥接层：
├── queryEngineAdapter.ts      ✅ AsyncGenerator 适配器 (241行)
│   ├── EventQueue 类          ✅ 回调到生成器桥接
│   ├── createQueryEngineAdapter() ✅ 流式输出适配
│   └── translateStreamEvent()  ✅ 事件转换
├── toolAdapters.ts            ✅ 工具适配器 (388行)
│   ├── agentToolAdapter       ✅
│   ├── taskOutputToolAdapter  ✅
│   ├── enterPlanModeToolAdapter ✅
│   └── ... 10个适配器
├── replBridge.ts              ✅ REPL 桥接核心 (25000+ tokens)
├── replBridgeTransport.ts     ✅ 传输层抽象 (371行)
│   ├── createV1ReplTransport() ✅ WS + POST
│   └── createV2ReplTransport() ✅ SSE + CCR
├── initReplBridge.ts          ✅ 桥接初始化 (570行)
├── bridgeMain.ts              ✅ 桥接主循环 (28000+ tokens)
├── bridgeConfig.ts            ✅ 配置获取
├── bridgeEnabled.ts           ✅ 启用检查
├── bridgeApi.ts               ✅ API 客户端
├── bridgeMessaging.ts         ✅ 消息处理
├── bridgeUI.ts                ✅ UI 显示
├── sessionRunner.ts           ✅ 会话运行器
├── createSession.ts           ✅ 会话创建
├── mcpBridgeAdapter.ts        ✅ MCP 桥接适配
├── remoteBridgeCore.ts        ✅ 远程桥接核心
└── ... (还有20+个辅助文件)
```

#### packages/cli/src/runtime/ (8个文件)
```
已实现的运行时模块：
├── launchOptions.ts           ✅ 启动配置 (96行)
│   ├── RootLaunchOptions 接口 ✅
│   ├── buildEffectiveRootOptions() ✅
│   └── loadSettingsFromOptions() ✅
├── launchContext.ts           ✅ 启动上下文 (51行)
│   ├── SinglePromptLaunchContext ✅
│   ├── InteractiveLaunchContext ✅
│   └── buildSinglePromptLaunchContext() ✅
├── routeContext.ts            ✅ 路由上下文 (64行)
│   ├── REST_BACKED_COMMANDS   ✅
│   ├── commandUsesRestApi()   ✅
│   └── shouldAutoStartEmbeddedServer() ✅
├── replRenderer.ts            ✅ REPL 渲染器 (本次创建)
└── legacyBridgeRenderer.ts    ✅ Legacy 桥接渲染器 (本次创建)
```

#### packages/cli/src/client/CCLocalClient.ts (420行)
```
已实现的客户端：
├── connect()                   ✅ 健康检查
├── createSession()             ✅ 创建会话
├── sendMessage()               ✅ 发送消息 (SSE)
├── sendEphemeralMessage()      ✅ 临时消息
├── cancelGeneration()          ✅ 取消生成
├── listSessions()              ✅ 列出会话
├── getSession()                ✅ 获取会话
├── getSessionMessages()        ✅ 获取消息历史
├── forkSession()               ✅ 分叉会话
├── listMcpServers()            ✅ MCP 服务器管理
└── consumeSSE()                ✅ SSE 消费
```

---

## 二、数据流分析

### 2.1 Legacy 模式数据流（已存在）
```
┌─────────────────────────────────────────────────────────────────┐
│                     Legacy 模式数据流                            │
├─────────────────────────────────────────────────────────────────┤
│  index.ts                                                       │
│      ↓ shouldUseLegacyUi() = true                               │
│  ui/legacyAdapter.ts                                            │
│      ↓ delegateToLegacyUi()                                     │
│  entrypoints/cli.tsx                                            │
│      ↓ main()                                                   │
│  main.tsx → launchRepl()                                        │
│      ↓                                                           │
│  screens/REPL.tsx                                               │
│      ↓ for await (event of query())                             │
│  query.ts                                                       │
│      ↓                                                           │
│  services/api/*.ts → Anthropic API                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Packages-Native 模式数据流（设计目标）
```
┌─────────────────────────────────────────────────────────────────┐
│                 Packages-Native 模式数据流                       │
├─────────────────────────────────────────────────────────────────┤
│  index.ts                                                       │
│      ↓ shouldUseLegacyUi() = false                              │
│  runtime/routeContext.ts                                       │
│      ↓ commandUsesRestApi()                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ REST API 模式                                                ││
│  │   client/CCLocalClient.ts                                   ││
│  │       ↓ HTTP REST + SSE                                      ││
│  │   packages/server (后端服务)                                 ││
│  │       ↓ SessionManager                                       ││
│  │   packages/core/QueryEngine                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 本地 QueryEngine 模式                                         ││
│  │   bridge/queryEngineAdapter.ts                              ││
│  │       ↓ createQueryEngineAdapter()                           ││
│  │   packages/core/QueryEngine                                  ││
│  │       ↓ toolRegistry                                         ││
│  │   packages/core/tools/impl/*.ts                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 关键模块依赖关系
```
index.ts
├── client/CCLocalClient.ts      [独立模块]
├── runtime/
│   ├── launchOptions.ts         [无外部依赖]
│   ├── launchContext.ts         [依赖 launchOptions]
│   ├── routeContext.ts          [无外部依赖]
│   └── replRenderer.ts          [依赖 replLauncher, ink]
├── bridge/
│   ├── queryEngineAdapter.ts    [依赖 @cclocal/core, toolAdapters]
│   ├── toolAdapters.ts          [依赖 legacy tools]
│   ├── replBridge.ts            [依赖 transport, types]
│   ├── replBridgeTransport.ts   [依赖 SSETransport, CCRClient]
│   └── initReplBridge.ts        [依赖 replBridge, bridgeConfig]
└── ui/legacyAdapter.ts          [独立模块]
```

---

## 三、真正缺失的部分

### 3.1 已识别的问题

| 编号 | 问题 | 优先级 | 状态 |
|------|------|--------|------|
| M1 | index.ts 无法正确路由到 packages-native 模式 | P0 | ⬜ 待修复 |
| M2 | runtime/replRenderer.ts 刚创建，未测试 | P1 | ⬜ 待验证 |
| M3 | bridge/ 与 runtime/ 模块间连接不完整 | P1 | ⬜ 待修复 |
| M4 | packages/server WebSocket 类型声明缺失 | P2 | ✅ 已修复 |
| M5 | Tool 接口 call/execute 不匹配 | P1 | ✅ 已修复 |

### 3.2 需要创建/修改的文件

| 文件 | 操作 | 原因 |
|------|------|------|
| `index.ts` | 修改 | 修复路由逻辑 |
| `runtime/replRenderer.ts` | 完善 | 补充完整的 REPL 启动逻辑 |
| `entrypoints/native.ts` | 新建 | packages-native 入口点 |
| `bridge/nativeBridgeAdapter.ts` | 新建 | 连接 native 模式到 bridge |

---

## 四、实现计划

### Phase 1: 入口路由修复 (P0)

**目标**: 使 index.ts 能正确选择 legacy 或 packages-native 模式

#### 当前问题
```typescript
// index.ts 现有问题：
// 1. 直接调用 renderInteractiveRepl() 但该函数签名不匹配
// 2. 没有正确的 packages-native 入口点
```

#### 解决方案
```typescript
// 修改 index.ts 路由逻辑
async function main() {
  const args = process.argv.slice(2)
  const firstCommand = getFirstCommand(args)

  if (shouldUseLegacyUi(args)) {
    // Legacy 模式
    delegateToLegacyUi(args)
  } else if (hasNativeFlag(args) || commandUsesRestApi(firstCommand)) {
    // Packages-Native 模式
    await runNativeMode(args)
  } else {
    // 默认使用 Legacy
    delegateToLegacyUi(args)
  }
}
```

### Phase 2: Native 入口点创建 (P1)

**目标**: 创建 `entrypoints/native.ts` 作为 packages-native 入口

```typescript
// packages/cli/src/entrypoints/native.ts
import { CCLocalClient } from '../client/CCLocalClient.js'
import { QueryEngine } from '@cclocal/core'

export async function runNativeMode(args: string[]): Promise<void> {
  // 1. 解析参数
  const options = parseNativeArgs(args)

  // 2. 连接服务器或使用本地引擎
  if (options.serverUrl) {
    await runWithServer(options)
  } else {
    await runWithLocalEngine(options)
  }
}

async function runWithServer(options: NativeOptions): Promise<void> {
  const client = new CCLocalClient({
    serverUrl: options.serverUrl,
    authToken: options.authToken,
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
  })

  await client.connect()

  // 创建或恢复会话
  const session = options.sessionId
    ? await client.getSession(options.sessionId)
    : await client.createSession({ cwd: options.cwd })

  // 设置消息处理器
  client.onMessage((event) => {
    handleStreamEvent(event)
  })

  // 开始交互循环
  await startInteractiveLoop(client, session)
}

async function runWithLocalEngine(options: NativeOptions): Promise<void> {
  const { createQueryEngineAdapter } = await import('../bridge/queryEngineAdapter.js')

  // 使用本地 QueryEngine
  const queryGenerator = createQueryEngineAdapter({
    messages: [],
    model: options.model,
    maxTurns: options.maxTurns,
    onStream: (event) => handleStreamEvent(event),
  })

  for await (const event of queryGenerator) {
    handleQueryEvent(event)
  }
}
```

### Phase 3: Bridge 适配器完善 (P1)

**目标**: 完善 bridge 与 runtime 的连接

```typescript
// packages/cli/src/bridge/nativeBridgeAdapter.ts
import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'
import { toolRegistry } from '@cclocal/core'

/**
 * Native Bridge 适配器
 * 将 packages-native 调用适配到 bridge 层
 */
export class NativeBridgeAdapter {
  private client?: CCLocalClient
  private queryEngine?: QueryEngine

  constructor(private options: NativeBridgeOptions) {}

  async initialize(): Promise<void> {
    if (this.options.mode === 'remote') {
      this.client = new CCLocalClient(this.options.clientConfig)
      await this.client.connect()
    } else {
      this.queryEngine = new QueryEngine(this.options.engineOptions)
    }
  }

  async query(messages: Message[], options: QueryOptions): Promise<QueryResult> {
    if (this.client) {
      // 远程模式
      return this.queryRemote(messages, options)
    } else {
      // 本地模式
      return this.queryLocal(messages, options)
    }
  }

  private async queryRemote(messages: Message[], options: QueryOptions): Promise<QueryResult> {
    // 通过 CCLocalClient 发送请求
    await this.client!.sendMessage(messages[messages.length - 1]!.content, options)
    // 等待 SSE 流完成
    return this.collectResult()
  }

  private async queryLocal(messages: Message[], options: QueryOptions): Promise<QueryResult> {
    // 使用本地 QueryEngine
    return this.queryEngine!.query(messages, options)
  }
}
```

### Phase 4: 测试验证 (P2)

**目标**: 验证双模式功能正确

#### 测试用例

| 用例 | 命令 | 预期结果 |
|------|------|----------|
| Legacy 模式 | `cclocal` | 启动 legacy UI |
| Native 本地模式 | `cclocal --native --local-engine` | 使用本地 QueryEngine |
| Native 远程模式 | `cclocal --native --server http://localhost:5678` | 连接后端服务 |
| 混合模式 | `cclocal mcp list` | REST API 命令 |

### Phase 5: 并发优化 (P3)

**目标**: 支持 100+ 并发任务

#### 优化点
1. 连接池管理
2. 请求队列
3. 背压控制
4. 内存优化

---

## 五、进度跟踪

### 里程碑

| 阶段 | 目标 | 状态 |
|------|------|------|
| Phase 0 | 创建 nativeRouting.ts（不影响现有入口） | ✅ 已完成 |
| Phase 1 | nativeBridgeAdapter.ts - EventQueue 模式重写 queryRemote | ✅ 已完成 |
| Phase 2 | CCLocalClient.onMessage 返回取消函数 | ✅ 已完成 |
| Phase 3 | entrypoints/native.ts REST 命令实现 | ✅ 已完成 |
| Phase 4 | 端到端测试（E2E） | ✅ 已完成 |
| Phase 5 | 入口路由集成（index.ts） | ✅ 已完成 |

### 已完成

| 任务 | 日期 | 文件 |
|------|------|------|
| nativeRouting.ts 创建 | 2026-05-04 | `runtime/nativeRouting.ts` |
| nativeRouting.test.ts | 2026-05-04 | `runtime/nativeRouting.test.ts` |
| nativeBridgeAdapter.ts 重写（EventQueue） | 2026-05-04 | `bridge/nativeBridgeAdapter.ts` |
| nativeBridgeAdapter.test.ts | 2026-05-04 | `bridge/nativeBridgeAdapter.test.ts` |
| CCLocalClient.onMessage 修复 | 2026-05-04 | `client/CCLocalClient.ts` |
| entrypoints/native.ts REST命令实现 | 2026-05-04 | `entrypoints/native.ts` |
| native.test.ts | 2026-05-04 | `entrypoints/native.test.ts` |
| replRenderer.ts 完善 | 2026-05-04 | `runtime/replRenderer.ts` |
| replRenderer.test.ts | 2026-05-04 | `runtime/replRenderer.test.ts` |
| E2E 测试文件创建 | 2026-05-04 | `e2e/native.e2e.test.ts` |
| 入口路由集成 | 2026-05-04 | `index.ts` |

### 测试统计

| 测试文件 | 测试数 | 状态 |
|----------|--------|------|
| runtime/*.test.ts | 25 | ✅ 通过 |
| bridge/nativeBridgeAdapter.test.ts | 14 | ✅ 通过 |
| entrypoints/native.test.ts | 14 | ✅ 通过 |
| **总计** | **53+** | ✅ **全部通过** |

### 验证方法

```bash
# 构建验证
bun run build

# 单元测试
bun test packages/cli/src/runtime/*.test.ts
bun test packages/cli/src/bridge/nativeBridgeAdapter.test.ts
bun test packages/cli/src/entrypoints/native.test.ts

# E2E 测试（需要 ANTHROPIC_API_KEY）
ANTHROPIC_API_KEY=xxx bun test packages/cli/src/e2e/native.e2e.test.ts

# 手动验证 - Legacy 模式（不受影响）
bun run start

# 手动验证 - Native 模式
bun run start --native --server http://localhost:5678 mcp list
```

---

## 六、附录

### A. 现有文件完整清单

#### packages/core/src/ (17个文件)
- analytics/analyticsManager.ts
- commands/registry.ts
- compaction/compactionService.ts
- config/configManager.ts
- db/connection.ts, index.ts, sessionStore.ts, types.d.ts
- engine/anthropicClient.ts, queryEngine.ts, queryEngine.test.ts
- hooks/hookManager.ts
- mcp/MCPManager.ts, MCPManager.test.ts, index.ts, types.ts
- permissions/permissionPolicy.ts
- state/sessionState.ts
- tools/registry.ts, compatTools.test.ts
- tools/impl/*.ts (22个工具文件)
- index.ts

#### packages/cli/src/bridge/ (34个文件)
完整列表见上文 Section 1.1

#### packages/cli/src/runtime/ (8个文件)
- launchOptions.ts, launchOptions.test.ts
- launchContext.ts, launchContext.test.ts
- routeContext.ts, routeContext.test.ts
- replRenderer.ts
- legacyBridgeRenderer.ts

### B. 关键接口定义

```typescript
// @cclocal/shared
interface Tool {
  name: string
  description: string
  input_schema: ToolInputSchema
  execute(input: unknown, context: ToolContext): Promise<ToolResult>
}

interface StreamEvent {
  type: 'stream_start' | 'stream_delta' | 'stream_end' | 'error' | 'tool_call'
  messageId: string
  delta?: MessageContent
  error?: string
  toolCall?: { name: string; input: unknown }
}

// packages/core
interface QueryEngineOptions {
  model: string
  systemPrompt?: string
  maxTurns?: number
  enabledTools?: string[]
  onStream?: (event: StreamEvent) => void
  permissionPolicy?: PermissionPolicy
}
```
