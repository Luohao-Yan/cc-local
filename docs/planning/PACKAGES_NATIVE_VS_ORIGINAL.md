# Packages-Native vs 原版架构对比

> **对比日期**: 2026-05-04

---

## 一、架构差异

### 1.1 整体架构

| 维度 | 原版 Claude Code | Packages-Native |
|------|------------------|-----------------|
| **入口** | `src/entrypoints/cli.tsx` | `packages/cli/src/entrypoints/native.ts` |
| **UI** | React + Ink 全屏 UI | REST API + 可选 REPL |
| **状态管理** | 前端本地状态 | 服务器端 SessionManager |
| **数据流** | 前端 → API 直接调用 | Client → REST → Server → QueryEngine |
| **并发模型** | StreamingToolExecutor | 请求队列 + 批处理 |

### 1.2 数据流对比

**原版**:
```
CLI → Ink UI → StreamingToolExecutor → Tool Execution
         ↓
    API SDK (直接调用)
```

**Packages-Native**:
```
CLI → CCLocalClient → HTTP REST → SessionManager → QueryEngine
           ↓                ↓              ↓
         ServerToken     请求队列      工具执行
```

---

## 二、工具并发控制对比

### 2.1 原版并发控制

```typescript
// packages/cli/src/services/tools/toolOrchestration.ts

function getMaxToolUseConcurrency(): number {
  return parseInt(process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY || '', 10) || 10
}
```

**特点**:
- **默认最大并发**: 10
- **环境变量可配置**: `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`
- **智能并发**: 基于 `isConcurrencySafe` 属性
  - 只读工具（file_read, grep, glob 等）可并发
  - 写入工具（file_edit, bash 等）串行执行

### 2.2 当前 Packages-Native 实现

```typescript
// packages/core/src/engine/queryEngine.ts

const MAX_PARALLEL_TOOLS = 5  // 硬编码，过于保守
```

**问题**:
- ❌ 硬编码 5，太保守
- ❌ 没有区分工具的并发安全性
- ❌ 一刀切限制，影响性能

---

## 三、修复方案

### 3.1 采用原版并发控制逻辑

```typescript
// packages/core/src/engine/queryEngine.ts

/**
 * 最大并行工具执行数
 * 默认 10，可通过环境变量配置
 */
function getMaxToolUseConcurrency(): number {
  return parseInt(process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY || '', 10) || 10
}

/**
 * 检查工具是否并发安全
 * 只读工具可以并行，写入工具必须串行
 */
function isConcurrencySafe(toolName: string, input: unknown): boolean {
  const readOnlyTools = new Set([
    'file_read', 'grep', 'glob', 'list_directory',
    'web_search', 'web_fetch', 'query_progress'
  ])
  return readOnlyTools.has(toolName.toLowerCase())
}
```

### 3.2 分批执行逻辑

```typescript
// 分批执行工具调用
const batches = partitionByConcurrency(toolCalls)
for (const batch of batches) {
  if (batch.isConcurrencySafe) {
    // 并发安全批次：最多 10 个并行
    await Promise.all(batch.tools.map(t => executeTool(t)))
  } else {
    // 非并发安全批次：串行执行
    for (const tool of batch.tools) {
      await executeTool(tool)
    }
  }
}
```

---

## 四、其他功能差异

### 4.1 会话管理

| 功能 | 原版 | Packages-Native |
|------|------|-----------------|
| 会话存储 | 本地 JSON | SQLite (WAL 模式) |
| 会话列表 | 内存 | 持久化 |
| 跨进程共享 | ❌ 不支持 | ✅ 支持 |
| 并发访问 | ❌ 单进程 | ✅ 多进程安全 |

### 4.2 MCP 管理

| 功能 | 原版 | Packages-Native |
|------|------|-----------------|
| MCP 连接 | 前端管理 | 服务器端管理 |
| 动态工具 | 前端注册 | 后端注册 |
| 工具同步 | 实时 | SSE 事件推送 |

### 4.3 权限控制

| 功能 | 原版 | Packages-Native |
|------|------|-----------------|
| 权限模式 | 前端 UI 交互 | REST API + 配置 |
| 工具策略 | 前端决策 | 后端决策 |
| 确认流程 | 弹窗确认 | 回调确认 |

---

## 五、性能对比

### 5.1 并发能力

| 场景 | 原版 | Packages-Native (修复后) |
|------|------|---------------------------|
| 读取 20 个文件 | ~2s (10 并发) | ~2s (10 并发) |
| 混合读写 | 串行写入 | 串行写入 |
| 大批量只读 | 最大 10 并发 | 最大 10 并发 |

### 5.2 资源使用

| 指标 | 原版 | Packages-Native |
|------|------|-----------------|
| 内存 | 前端进程 | 服务器进程 + SQLite 缓存 |
| CPU | 前端处理 | 服务器处理 |
| 文件描述符 | 单进程限制 | 可配置 |

---

## 六、何时使用哪个

### 适合原版的场景

- 单用户交互式使用
- 需要完整 Ink UI 体验
- 不需要远程访问
- 不需要会话持久化

### 适合 Packages-Native 的场景

- 多用户/多客户端
- 需要 REST API 集成
- 需要会话跨进程共享
- 需要 GUI 客户端接入
- 需要 100+ 并发任务

---

## 七、总结

| 维度 | 建议 |
|------|------|
| 工具并发限制 | 改为 10，区分并发安全 |
| 环境变量 | 支持 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` |
| 工具分类 | 区分只读/写入工具 |
| 向后兼容 | 保持原版默认行为 |
