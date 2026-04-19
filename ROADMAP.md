# CCLocal 改造路线图

本文档用于同步 `packages/` 新架构的真实开发进度，并给出下一阶段的落地顺序。

如果你准备继续完善项目，建议优先参考本文档，再结合 [ARCHITECTURE.md](./ARCHITECTURE.md)、[API.md](./API.md)、[GUI_CLIENT_DESIGN.md](./GUI_CLIENT_DESIGN.md) 分模块推进。

## 当前定位

仓库目前存在两条并行演进路线：

- `src/`：原始 Claude Code Rebuilt 主线，功能较完整，包含 MCP、命令系统、Ink UI 等大体量实现。
- `packages/`：面向 CCLocal 的新 Client/Server 架构，目标是沉淀出更清晰、可复用、可扩展的本地化版本。

接下来的开发重点建议放在 `packages/`，因为这条线已经形成了独立的 `shared/core/server/cli/vscode-ext` 分层，但还没有完全闭环。

## 已完成

### 基础架构

- Monorepo workspace 已建立，包含 `shared`、`core`、`server`、`cli`、`vscode-ext` 5 个包
- `@cclocal/shared` 已提供消息、会话、工具、流事件等共享类型
- `@cclocal/core` 已实现 `QueryEngine`、`AnthropicClient`、`ToolRegistry`
- `@cclocal/server` 已实现 Bun HTTP 服务、SSE 流式响应、WebSocket 入口
- `@cclocal/cli` 已具备基础 REPL 和服务端连接能力
- `@cclocal/vscode-ext` 已完成基础扩展骨架

### 核心能力

- Anthropic 兼容 API 已接入
- 工具调用循环已在 `packages/core/src/engine/queryEngine.ts` 中实现
- 会话数据已接入 SQLite 存储能力
- 基础工具已具备 6 个：`bash`、`file_read`、`file_write`、`file_edit`、`glob`、`grep`
- REST API 第一版已经可用，含认证、SSE、文件与工具相关端点

### 设计文档

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [API.md](./API.md)
- [GUI_CLIENT_DESIGN.md](./GUI_CLIENT_DESIGN.md)
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)

## 仍待补齐

这些不是“想做的功能”，而是现在最影响继续扩展的缺口。

| 任务 | 优先级 | 预估时间 | 原因 |
|---|---|---:|---|
| 认证与权限模型升级 | high | 2-4 天 | 当前 API Key 和 CORS 仍偏简化，GUI/Web 接入前需要先收口安全边界 |
| 会话与消息持久化补强 | high | 2-4 天 | `SessionManager` 目前以内存态为主，服务重启恢复、分页、索引仍需完善 |
| 测试基线 | high | 3-5 天 | 没有测试护栏时，后续做 GUI 或 MCP 容易反复回归 |
| 工具系统扩展接口 | medium | 3-5 天 | 需要为 MCP 和更多外部工具预留统一注册与权限模型 |
| MCP 接入到 `packages/` 架构 | medium | 1-2 周 | 原始 `src/` 已有成熟实现，但 `packages/` 侧还缺独立整合 |
| GUI 客户端落地 | medium | 2-3 周 | 依赖服务端能力稳定，否则前端会被后端接口变化反复拖累 |

## 推荐开发顺序

### Phase 1：先把服务端做“可承载”

目标：让 `packages/server` + `packages/core` 成为稳定底座。

1. 统一认证和权限校验
2. 补齐会话持久化、消息历史分页、重启恢复
3. 为工具执行增加更明确的错误码、超时、取消、审计日志
4. 增加最小可用测试集

这一阶段完成后，GUI、MCP、插件化都会顺很多。

### Phase 2：再做 MCP 适配层

目标：不是简单“支持 MCP”，而是让 `packages/` 侧拥有自己的 MCP 集成入口。

建议拆成三个子任务：

1. 在 `@cclocal/core` 中定义 MCP server/provider 抽象
2. 让 `ToolRegistry` 支持动态注册 MCP 暴露出来的工具
3. 在 `@cclocal/server` 中增加 MCP 管理 API 和连接状态查询

这样后续 CLI、GUI、VS Code 都能共用同一套 MCP 连接状态。

### Phase 3：最后推进 GUI

目标：让 GUI 只是“消费已有能力”，而不是倒逼后端重构。

建议最小可用版本先做：

1. 会话列表
2. 聊天窗口
3. SSE 流式输出
4. 工具调用展示
5. 本地文件浏览器
6. 设置页（模型、API Key、服务地址）

## 推荐本周可直接开工的事项

如果你现在就想继续开发，最值得先做的是下面这个顺序：

1. 给 `packages/server` 的会话读写链路补完整持久化
2. 给 REST API 增加更稳定的错误响应格式
3. 为 `QueryEngine` 和 `SessionManager` 补 3-5 个核心测试
4. 再开始抽 `packages/core` 的 MCP 接口层

原因很简单：这四步会直接降低后面 GUI 和外部工具集成的返工概率。

## 与现有文档的关系

- [ARCHITECTURE.md](./ARCHITECTURE.md)：描述分层和模块职责
- [API.md](./API.md)：描述对外 HTTP 接口
- [GUI_CLIENT_DESIGN.md](./GUI_CLIENT_DESIGN.md)：描述 GUI 方案，但应建立在稳定服务端之上
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)：可作为 MCP 和复杂能力迁移时的参考源

## 一句话建议

先把 `packages/` 做成稳定平台，再做 GUI；MCP 放在 GUI 之前，比直接开前端更划算。
