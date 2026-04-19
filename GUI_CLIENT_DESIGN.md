# GUI 客户端设计文档

## 架构目标

1. **独立 GUI 客户端** - 用户安装桌面应用进行开发
2. **服务端模式** - 应用作为服务端给其他 Web 应用提供 API
3. **共享核心逻辑** - CLI/GUI/Server 使用相同的 `@cclocal/core`

## 技术选型

| 方案 | 优势 | 劣势 | 推荐 |
|------|------|------|------|
| **Tauri + Web** | 体积小、性能好、前端自由 | 需要 Rust | ⭐ |
| **Electron** | 成熟、生态丰富 | 体积大、内存占用 | |
| **PWA** | 无需安装、自动更新 | 功能受限 | |

推荐 **Tauri** - 现代、安全、跨平台

## 包结构

```
packages/
├── gui/                    # 桌面 GUI 客户端 (Tauri)
│   ├── src/
│   │   ├── main.rs         # Tauri 主进程 (Rust)
│   │   └── web/
│   │       ├── App.tsx     # React 应用
│   │       └── api.ts      # 服务端 API 调用
│   └── Cargo.toml
└── server/                 # 扩展服务端功能
    └── src/
        ├── http.ts         # 现有 HTTP/WebSocket
        └── rest.ts         # 新增 REST API
```

## 服务端增强

### 1. REST API 设计

```typescript
// 会话管理
GET  /api/sessions              // 列出会话
POST /api/sessions              // 创建会话
GET  /api/sessions/:id          // 获取会话详情
PUT  /api/sessions/:id          // 更新会话
DELETE /api/sessions/:id        // 删除会话

// 消息操作
GET  /api/sessions/:id/messages // 获取消息历史
POST /api/sessions/:id/messages // 发送消息（流式返回）
POST /api/chat                  // 直接聊天（无会话）

// 工具调用
POST /api/tools/:name/execute   // 直接执行工具

// 文件操作
GET    /api/files/content       // 读取文件
PUT    /api/files/content       // 写入文件
PATCH  /api/files/content       // 编辑文件
POST   /api/files/search        // 搜索文件
```

### 2. 跨域支持

```typescript
// server/src/http.ts 添加 CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 或配置特定域名
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

### 3. 认证机制

```typescript
// API Key 认证
const authHeader = request.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return new Response('Unauthorized', { status: 401 })
}
const apiKey = authHeader.slice(7)
if (!validateApiKey(apiKey)) {
  return new Response('Invalid API key', { status: 401 })
}
```

## GUI 客户端功能

### 核心功能

1. **会话管理**
   - 创建/删除会话
   - 会话列表（带搜索）
   - 会话详情（历史消息）

2. **聊天界面**
   - 消息输入（多行文本框）
   - 流式响应展示
   - 代码块高亮
   - 工具调用结果展示

3. **文件浏览器**
   - 侧边栏文件树
   - 点击预览文件
   - 右键菜单（打开方式）

4. **设置面板**
   - API Key 配置
   - 模型选择
   - 主题切换

### 界面布局

```
┌─────────────────────────────────────────────┐
│  CCLocal GUI                     [设置] [×] │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ 会话列表  │      聊天区域                    │
│ ──────── │   ┌─────────────────────────┐   │
│ + 新会话  │   │ User: 你好              │   │
│ ──────── │   ├─────────────────────────┤   │
│ 会话 1   │   │ Assistant: 你好！       │   │
│ 会话 2   │   │ 我能帮你什么？          │   │
│ 会话 3   │   ├─────────────────────────┤   │
│          │   │ User: 读取 package.json │   │
│          │   ├─────────────────────────┤   │
│          │   │ [工具调用: file_read]   │   │
│          │   │ {内容...}               │   │
│          │   └─────────────────────────┘   │
│          │                                  │
│          │  ┌────────────────────────────┐ │
│          │  │ 输入消息...          [发送] │ │
│          │  └────────────────────────────┘ │
└──────────┴──────────────────────────────────┘
```

## 实现步骤

### Phase 1: 服务端 REST API
1. 添加 CORS 支持
2. 实现 REST 端点
3. 添加 API Key 认证

### Phase 2: GUI 客户端
1. 创建 `packages/gui` 包
2. Tauri 项目初始化
3. React 前端开发
4. 与本地服务端集成

### Phase 3: Web 访问支持
1. 服务端绑定配置（host/port）
2. 网络安全（CORS、认证）
3. 文档和示例

## API 使用示例

```bash
# 创建会话
curl -X POST http://localhost:5678/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"name": "Project Setup", "cwd": "/path/to/project"}'

# 发送消息（流式）
curl -X POST http://localhost:5678/api/sessions/123/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"content": "读取 package.json"}'

# 直接执行工具
curl -X POST http://localhost:5678/api/tools/bash/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"command": "ls -la"}'
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | Tauri (Rust) |
| 前端框架 | React + TypeScript |
| UI 组件 | shadcn/ui |
| 状态管理 | Zustand |
| 流式请求 | fetch + ReadableStream |
| 代码高亮 | PrismJS |

## 与现有架构的关系

```
┌─────────────────────────────────────────────────────────┐
│                     CCLocal Server                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ WebSocket│  │   HTTP   │  │  REST    │              │
│  │ (CLI/    │  │  (SSE)   │  │  (GUI/   │              │
│  │  VSCode) │  │          │  │  Web)    │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       └─────────────┴─────────────┘                     │
│                     │                                   │
│              @cclocal/core                              │
│         ┌───────────┼───────────┐                      │
│         ▼           ▼           ▼                      │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│    │QueryEngine│ │ ToolRegistry│ │ SessionStore│        │
│    └─────────┘ └─────────┘ └─────────┘                 │
└─────────────────────────────────────────────────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
┌──────┐ ┌──────┐ ┌──────┐
│ CLI  │ │VSCode│ │ GUI  │
└──────┘ └──────┘ └──────┘
```
