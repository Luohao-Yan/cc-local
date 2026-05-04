# 后端服务并发架构审计报告

> **审计日期**: 2026-05-04
> **审计目标**: 评估当前架构对100+并发任务的支持能力
> **审计范围**: packages/server, packages/core

---

## 一、执行摘要

### 当前架构评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 并发模型 | ⚠️ 中等 | 单线程事件循环，适合 I/O 密集型 |
| 数据库架构 | 🔴 严重问题 | 单连接阻塞式 SQLite |
| 会话隔离 | ⚠️ 中等 | 无请求队列，存在竞态风险 |
| 资源管理 | 🔴 严重问题 | 无限制，无清理机制 |
| 扩展性 | 🔴 不支持 | 无法水平扩展 |

### 100+ 并发任务支持能力

```
当前架构最大并发能力估计：
├── WebSocket 连接：无限制（但无心跳检测）
├── 会话并发：~10-20 个（受 SQLite 阻塞限制）
├── 单会话请求：串行处理（无队列）
└── 推荐上限：20 个活跃会话
```

**结论：当前架构无法稳定支持100+并发任务**

---

## 二、关键发现

### 2.1 SQLite 单连接阻塞（🔴 严重）

**问题位置**: `packages/core/src/db/connection.ts`

```typescript
// 当前实现：单例模式，单连接
private static instance: DatabaseConnection

static getInstance(): DatabaseConnection {
  if (!DatabaseConnection.instance) {
    DatabaseConnection.instance = new DatabaseConnection(dbPath)
  }
  return DatabaseConnection.instance
}
```

**影响分析**:
- 所有数据库操作阻塞事件循环
- `bun:sqlite` 是同步 API，无法异步
- 每次数据库操作期间，整个服务无法响应其他请求

**性能估算**:
```
单次数据库操作耗时：~1-5ms
100个并发请求，每个需要2次数据库操作
总阻塞时间：200-1000ms（串行执行）

实际测试数据（需验证）：
- 创建会话：~2ms
- 插入消息：~1ms
- 加载会话（含100条消息）：~10-50ms
- forkSession（复制100条消息）：~50-100ms
```

### 2.2 AbortController 竞态条件（🔴 严重）

**问题位置**: `packages/server/src/sessions/SessionManager.ts:113-115`

```typescript
async sendMessageStream(sessionId, content, options, controller) {
  const runtime = this.getOrCreateRuntime(sessionId)
  runtime.abortController = new AbortController()  // 直接覆盖！
  // ...
}
```

**竞态场景**:
```
时间线：
T0: 客户端A 发送消息到 Session-1
T1: 创建 AbortController-A，开始生成
T2: 客户端B 发送消息到 Session-1（相同会话）
T3: 创建 AbortController-B，覆盖 AbortController-A
T4: 客户端A 调用 cancelGeneration()
T5: 只取消了 AbortController-B，AbortController-A 仍在运行（但无法取消）
```

### 2.3 无请求队列（⚠️ 中等）

**问题**: 多个请求同时到达同一会话时，并行执行而非串行处理

```typescript
// SessionManager.ts - 无队列机制
async sendMessageStream(sessionId, ...) {
  // 直接开始执行，不检查是否有正在进行的请求
  const engine = new QueryEngine(...)
  await engine.query(...)
}
```

**影响**:
- 同一会话的消息可能乱序
- 数据库写入可能冲突
- 资源（API调用）浪费

### 2.4 无界限并行工具执行（⚠️ 中等）

**问题位置**: `packages/core/src/engine/queryEngine.ts:226-281`

```typescript
const toolResultEntries = await Promise.all(
  toolCalls.map(async (toolCall) => {
    // 并行执行所有工具，无限制
  })
)
```

**风险**:
- 一个请求可能触发10+个工具调用
- 100个并发请求 × 10个工具 = 1000个并行操作
- 资源耗尽风险（文件描述符、子进程、内存）

### 2.5 WebSocket 连接无限制（⚠️ 中等）

**问题位置**: `packages/server/src/ws/WebSocketManager.ts`

```typescript
private clients = new Map<string, WSClient>()  // 无限制增长

onOpen(socket) {
  const id = randomUUID()
  this.clients.set(id, { socket, token, ... })
  // 无连接数检查，无心跳检测
}
```

**风险**:
- 无最大连接数限制
- 无连接超时清理
- 客户端断开后可能残留条目
- 内存泄漏风险

---

## 三、并发能力量化分析

### 3.1 理论极限计算

```
假设：
- 单次数据库操作平均耗时：2ms
- 单次API调用平均耗时：500ms（含网络）
- 服务器内存：2GB 可用
- 每个会话平均内存：5MB

瓶颈分析：
1. 数据库：
   - 每秒数据库操作数：1000ms / 2ms = 500次
   - 每个请求需要2-4次数据库操作
   - 理论最大吞吐：~125-250 请求/秒

2. API调用：
   - Bun 单线程，事件循环可处理数千并发连接
   - 瓶颈在于 API 密钥速率限制（通常 50-100 请求/分钟）

3. 内存：
   - 2GB / 5MB = 400 个会话
   - 实际考虑消息历史，约 100-200 个会话

实际并发能力：
- 短期突发：~50 个并发请求（数据库串行化）
- 稳定运行：~20-30 个活跃会话
- 长时间运行：受内存泄漏影响
```

### 3.2 100+ 并发任务场景模拟

```
场景：100个用户同时使用 AI 辅助编程

请求模式：
- 每30秒发送一条消息
- 平均响应时间5秒
- 每个响应包含3次工具调用

计算：
- 每秒请求数：100 / 30 = 3.3 req/s
- 同时活跃的生成：3.3 × 5 = 16-17 个
- 数据库操作：16 × 4 = 64 ops/s

瓶颈判断：
✅ API吞吐量：在限额内
✅ CPU：主要等待I/O，CPU负载低
❌ 数据库：64 ops/s × 2ms = 128ms 阻塞/秒（12.8% CPU时间）
⚠️ 内存：100个会话 × 5MB = 500MB（可接受，但需监控）
❌ 稳定性：无请求队列，同一会话并发请求可能冲突
```

---

## 四、改进方案

### 4.1 短期方案（P0 - 1-2周）

#### A. 添加会话请求队列

```typescript
// SessionManager.ts
class SessionManager {
  private requestQueues = new Map<string, Array<() => Promise<void>>>()

  async sendMessageStream(sessionId, content, options, controller) {
    return new Promise((resolve, reject) => {
      // 加入队列而非直接执行
      const task = async () => {
        try {
          const result = await this._executeMessageStream(sessionId, content, options, controller)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      }

      // 获取或创建队列
      let queue = this.requestQueues.get(sessionId)
      if (!queue) {
        queue = []
        this.requestQueues.set(sessionId, queue)
      }

      queue.push(task)

      // 如果队列中只有这一个任务，立即执行
      if (queue.length === 1) {
        this._processQueue(sessionId)
      }
    })
  }

  private async _processQueue(sessionId) {
    const queue = this.requestQueues.get(sessionId)
    while (queue && queue.length > 0) {
      const task = queue[0]
      await task()
      queue.shift()
    }
  }
}
```

#### B. 修复 AbortController 竞态

```typescript
async sendMessageStream(sessionId, content, options, controller) {
  const runtime = this.getOrCreateRuntime(sessionId)

  // 检查是否有正在进行的请求
  if (runtime.abortController && !runtime.abortController.signal.aborted) {
    throw new Error('Session busy: another request is in progress')
  }

  runtime.abortController = new AbortController()
  // ...
}
```

#### C. 添加工具执行并发限制

```typescript
// queryEngine.ts
const MAX_PARALLEL_TOOLS = 5

async executeWithTools(messages) {
  // 分批执行工具
  const toolBatches = chunk(toolCalls, MAX_PARALLEL_TOOLS)
  for (const batch of toolBatches) {
    const results = await Promise.all(
      batch.map(toolCall => this.executeTool(toolCall))
    )
    // ...
  }
}
```

### 4.2 中期方案（P1 - 1-2月）

#### A. 迁移到异步数据库

**方案一：使用 better-sqlite3 + Worker Thread**

```typescript
// worker.ts
import { Database } from 'better-sqlite3'

const db = new Database('sessions.db')

self.onmessage = async (e) => {
  const { id, method, args } = e.data
  try {
    const result = db[method](...args)
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error })
  }
}

// connection.ts
class DatabaseConnection {
  private worker: Worker
  private pendingCallbacks = new Map<string, { resolve, reject }>()

  async query(method, ...args): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = randomUUID()
      this.pendingCallbacks.set(id, { resolve, reject })
      this.worker.postMessage({ id, method, args })
    })
  }
}
```

**方案二：迁移到 PostgreSQL**

```typescript
// 使用 pg 或 postgres.js
import postgres from 'postgres'

const sql = postgres({
  host: 'localhost',
  max: 20,  // 连接池大小
  idle_timeout: 30,
})

// 自动支持并发
```

#### B. 添加 WebSocket 连接管理

```typescript
class WebSocketManager {
  private MAX_CONNECTIONS = 500
  private CONNECTION_TIMEOUT = 5 * 60 * 1000  // 5分钟

  onOpen(socket) {
    if (this.clients.size >= this.MAX_CONNECTIONS) {
      socket.close(1013, 'Server busy')
      return
    }
    // ...

    // 启动心跳检测
    this.startHeartbeat(client)
  }

  private startHeartbeat(client) {
    client.heartbeatTimer = setInterval(() => {
      if (Date.now() - client.lastActivity > this.CONNECTION_TIMEOUT) {
        client.socket.close(1001, 'Connection timeout')
        this.clients.delete(client.id)
      }
    }, 60000)
  }
}
```

#### C. 添加速率限制

```typescript
import { RateLimiter } from 'limiter'

class SessionManager {
  private limiters = new Map<string, RateLimiter>()

  private getLimiter(token: string): RateLimiter {
    if (!this.limiters.has(token)) {
      this.limiters.set(token, new RateLimiter({
        tokensPerInterval: 10,
        interval: 'minute',
      }))
    }
    return this.limiters.get(token)!
  }

  async sendMessageStream(sessionId, content, options, controller) {
    const limiter = this.getLimiter(options.token)
    await limiter.removeTokens(1)
    // ...
  }
}
```

### 4.3 长期方案（P2 - 3-6月）

#### A. 微服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  API GW   │   │  API GW   │   │  API GW   │
    │ Instance 1│   │ Instance 2│   │ Instance 3│
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
    ┌─────▼───────────────▼───────────────▼─────┐
    │              Redis Pub/Sub                 │
    └─────┬───────────────┬───────────────┬─────┘
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  Session  │   │  Session  │   │  Session  │
    │  Worker 1 │   │  Worker 2 │   │  Worker 3 │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
    ┌─────▼───────────────▼───────────────▼─────┐
    │              PostgreSQL                    │
    └────────────────────────────────────────────┘
```

#### B. 会话分片

```typescript
// 按会话ID分片到不同工作进程
const SHARD_COUNT = 10

function getShard(sessionId: string): number {
  return parseInt(sessionId.slice(-1), 16) % SHARD_COUNT
}

// 每个工作进程只处理分配给它的会话
class SessionWorker {
  private shardId: number

  async handleMessage(sessionId, content) {
    if (getShard(sessionId) !== this.shardId) {
      throw new Error('Session belongs to different shard')
    }
    // ...
  }
}
```

---

## 五、实施路线图

### Phase 1: 稳定性修复（1-2周）

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 添加会话请求队列 | P0 | 2天 |
| 修复 AbortController 竞态 | P0 | 0.5天 |
| 添加工具执行并发限制 | P0 | 1天 |
| 添加 WebSocket 心跳检测 | P1 | 1天 |
| 添加速率限制 | P1 | 1天 |

**目标**：稳定支持 20-30 个并发会话

### Phase 2: 性能优化（1-2月）

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 迁移数据库到 Worker Thread | P1 | 1周 |
| 添加连接池管理 | P1 | 2天 |
| 添加消息分页加载 | P2 | 2天 |
| 添加资源监控 | P2 | 2天 |

**目标**：稳定支持 50-100 个并发会话

### Phase 3: 架构升级（3-6月）

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 迁移到 PostgreSQL | P2 | 2周 |
| 实现微服务架构 | P2 | 1月 |
| 添加会话分片 | P2 | 2周 |
| 添加自动扩缩容 | P2 | 1周 |

**目标**：稳定支持 100+ 个并发会话

---

## 六、测试验证计划

### 6.1 压力测试场景

```typescript
// 使用 autocannon 或 artillery
import autocannon from 'autocannon'

const result = await autocannon({
  url: 'http://localhost:5678',
  connections: 100,
  duration: 60,
  requests: [
    {
      method: 'POST',
      path: '/api/v1/sessions',
      body: JSON.stringify({ cwd: '/test' }),
    },
    {
      method: 'POST',
      path: '/api/v1/sessions/:sessionId/messages',
      body: JSON.stringify({ content: 'Hello' }),
    },
  ],
})

console.log(result)
```

### 6.2 监控指标

```typescript
// 添加 Prometheus 指标
const activeConnections = new Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
})

const requestLatency = new Histogram({
  name: 'request_latency_seconds',
  help: 'Request latency in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
})

const dbOperations = new Counter({
  name: 'db_operations_total',
  help: 'Total database operations',
  labelNames: ['operation', 'status'],
})
```

---

## 七、结论

### 当前完成度

| 项目 | 完成度 | 说明 |
|------|--------|------|
| 单用户 CLI | ✅ 90% | 基本可用 |
| 10 用户并发 | ⚠️ 60% | 需要稳定性修复 |
| 50 用户并发 | ❌ 30% | 需要数据库优化 |
| 100+ 用户并发 | ❌ 10% | 需要架构升级 |

### 建议优先级

```
立即执行：
├── P0: 添加会话请求队列
├── P0: 修复 AbortController 竞态
└── P0: 添加工具执行并发限制

短期执行：
├── P1: 添加 WebSocket 连接管理
├── P1: 添加速率限制
└── P1: 数据库迁移到 Worker Thread

长期规划：
├── P2: 迁移到 PostgreSQL
├── P2: 微服务架构
└── P2: 会话分片
```
