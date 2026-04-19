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
| CLI 客户端 | ✅ 完成 | 连接服务端，提供基础 REPL |
| 核心工具 | ✅ 完成 | 已接入 6 个工具：bash、file_read、file_write、file_edit、glob、grep |
| VS Code 扩展 | ✅ 完成 | WebSocket 客户端实现 |
| 工具调用循环 | ✅ 完成 | QueryEngine 已支持 tool_use -> execute -> tool_result 循环 |
| 会话持久化 | ✅ 基础完成 | 已有 SQLite 能力，但服务端链路仍需继续补强 |

## 下一步工作

1. **认证与权限模型升级** - 在 GUI/Web 接入前收紧 API Key、CORS 和权限边界
2. **会话持久化补强** - 完善服务端的重启恢复、消息分页和状态同步
3. **测试覆盖** - 为 QueryEngine、SessionManager、REST API 建立最小测试基线
4. **MCP 适配到 `packages/`** - 将原始 `src/` 中较成熟的 MCP 能力抽取为新架构可复用模块
5. **GUI 客户端实现** - 基于稳定 REST API 和 SSE 能力落地 Tauri 客户端
6. **统一文档维护** - 让架构、API、GUI 设计和真实代码进度保持同步

更细的实施建议见 [ROADMAP.md](./ROADMAP.md)。

## 技术决策

- **Bun** - 构建和运行时（支持 TypeScript 直接运行）
- **Monorepo** - 便于代码共享和统一管理
- **WebSocket + SSE** - 双协议支持，WebSocket 用于客户端，SSE 用于 HTTP API
- **EventEmitter** - 无 React 状态管理，适合服务端
- **简化 REPL** - 先使用 readline，后续可添加 Ink 增强 UI
