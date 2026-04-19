# CCLocal Client/Server 架构

本文档描述 CCLocal 的新 Client/Server 架构。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      Monorepo 结构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   packages   │    │   packages   │    │   packages   │  │
│  │   /shared    │───▶│   /core      │    │   /server    │  │
│  │  (类型定义)   │    │  (业务逻辑)   │    │  (HTTP+WS)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                               │                   │         │
│                               ▼                   ▼         │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │   packages   │    │   packages   │                       │
│  │   /cli       │    │ /vscode-ext  │                       │
│  │  (终端客户端) │    │ (VS Code 扩展)│                       │
│  └──────────────┘    └──────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 模块说明

### @cclocal/shared

共享类型和工具函数，所有包都依赖此模块。

- `types/index.ts` - 核心类型定义（Message, Session, Tool, StreamEvent 等）

### @cclocal/core

无 UI 的业务逻辑层，包含 QueryEngine 和工具管理。

- `state/sessionState.ts` - 会话状态管理（无 React 依赖）
- `engine/queryEngine.ts` - AI 查询引擎
- `tools/registry.ts` - 工具注册表

### @cclocal/server

HTTP + WebSocket 服务端。

- `index.ts` - 服务端入口
- `api/server.ts` - HTTP API 服务器
- `ws/WebSocketManager.ts` - WebSocket 连接管理
- `sessions/SessionManager.ts` - 会话管理
- `auth/AuthManager.ts` - 简单认证管理

### @cclocal/cli

命令行客户端，连接服务端。

- `index.ts` - CLI 入口
- `client/CCLocalClient.ts` - WebSocket 客户端
- `repl/simpleRepl.ts` - 交互式 REPL

### @cclocal/vscode-ext

VS Code 扩展客户端。

- `extension.ts` - 扩展入口
- `CCLocalViewProvider.ts` - Webview 提供者
- `ServerManager.ts` - 服务端管理

## 通信协议

### HTTP REST API

```
GET  /health              - 健康检查
POST /api/v1/sessions     - 创建会话
GET  /api/v1/sessions/:id - 获取会话
POST /api/v1/sessions/:id/messages - 发送消息（SSE 流式）
POST /api/v1/sessions/:id/cancel   - 取消生成
```

### WebSocket 协议

```
连接: ws://localhost:5678/ws?token=<token>

消息格式:
{
  type: 'auth' | 'message' | 'cancel' | 'stream_start' | 'stream_delta' | 'stream_end' | 'error',
  payload?: object,
  timestamp: number
}
```

## 构建和运行

```bash
# 安装依赖
bun install

# 构建所有包
bun run build:all

# 启动服务端
bun run start:server

# 运行 CLI 客户端
bun run start

# 开发模式
bun run dev:server
bun run dev:cli
```

## 当前状态

| 组件 | 状态 | 说明 |
|------|------|------|
| Monorepo 结构 | ✅ 完成 | 5 个包已创建 |
| 共享类型 | ✅ 完成 | Message, Session, Tool 等类型定义 |
| QueryEngine | ✅ 完成 | 已接入 Anthropic API |
| AnthropicClient | ✅ 完成 | Claude API 封装，支持流式 |
| HTTP 服务端 | ✅ 完成 | Bun HTTP + SSE 流式响应 |
| WebSocket | ✅ 完成 | 双向通信支持 |
| CLI 客户端 | ✅ 完成 | 连接服务端，简化版 REPL |
| 核心工具 | ✅ 完成 | bash, file_read, file_write |
| VS Code 扩展 | ✅ 完成 | WebSocket 客户端实现 |

## 下一步工作

1. **更多工具迁移** - LSP, Glob, Grep, FileEdit 等
2. **工具执行集成** - 在 QueryEngine 中处理 tool_use 响应
3. **会话持久化** - 添加 SQLite 存储
4. **认证完善** - 实现更安全的认证机制
5. **MCP 支持** - 集成 Model Context Protocol
6. **测试覆盖** - 添加单元测试和集成测试

## 技术决策

- **Bun** - 构建和运行时（支持 TypeScript 直接运行）
- **Monorepo** - 便于代码共享和统一管理
- **WebSocket + SSE** - 双协议支持，WebSocket 用于客户端，SSE 用于 HTTP API
- **EventEmitter** - 无 React 状态管理，适合服务端
- **简化 REPL** - 先使用 readline，后续可添加 Ink 增强 UI
