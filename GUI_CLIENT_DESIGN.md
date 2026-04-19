# GUI 客户端设计文档

参考: [OpenCode](https://github.com/anomalyco/opencode) - 开源编码助手，采用 Tauri + Client/Server 架构

## 架构目标

1. **独立 GUI 客户端** - 桌面应用（Tauri），体积小、性能好
2. **服务端模式** - 可作为服务端给 Web 应用提供 API
3. **共享核心逻辑** - CLI/GUI/Server 使用相同的 `@cclocal/core`
4. **多 Agent 支持** - 类似 OpenCode 的 build/plan 模式
5. **LSP 集成** - 代码补全、定义跳转等 IDE 功能

## 技术选型

参考 OpenCode 的实现，选择 **Tauri**:

| 特性 | OpenCode | CCLocal |
|------|----------|---------|
| 桌面框架 | Tauri | Tauri ✅ |
| 架构 | Client/Server | Client/Server ✅ |
| 安装方式 | npm/brew/scoop | npm/brew/scoop |
| 内置 Agents | build/plan | build/plan |
| LSP 支持 | ✅ | ✅ |

**优势**:

- 体积小 (~10MB vs Electron ~100MB+)
- 内存占用低
- 原生性能 (Rust 后端)
- 安全 (Web 前端隔离)

## 包结构 (参考 OpenCode)

```
packages/
├── gui-desktop/            # 桌面 GUI 客户端 (Tauri)
│   ├── src-tauri/          # Rust 后端
│   │   ├── Cargo.toml
│   │   └── src/main.rs     # Tauri 主进程
│   ├── src/                # Web 前端
│   │   ├── App.tsx         # React 应用入口
│   │   ├── components/     # UI 组件
│   │   │   ├── Chat.tsx    # 聊天界面
│   │   │   ├── Sidebar.tsx # 会话列表
│   │   │   └── FileTree.tsx # 文件浏览器
│   │   ├── hooks/          # 自定义 hooks
│   │   │   ├── useChat.ts  # 聊天状态管理
│   │   │   └── useAPI.ts   # API 调用
│   │   └── styles.css
│   └── package.json
│
├── server/                 # 服务端 (扩展)
│   └── src/
│       ├── http.ts         # HTTP/WebSocket
│       ├── rest.ts         # REST API
│       ├── cors.ts         # 跨域配置
│       └── auth.ts         # 认证中间件
│
└── core/                   # 共享核心 (已有)
    └── src/
        ├── engine/         # QueryEngine
        ├── tools/          # ToolRegistry
        └── db/             # SessionStore
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

### 3. 认证机制 (类似 OpenCode)

```typescript
// server/src/auth.ts
import { randomBytes } from 'crypto'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const CONFIG_DIR = join(homedir(), '.cclocal')
const API_KEY_FILE = join(CONFIG_DIR, 'api_key')

export function getOrCreateApiKey(): string {
  if (existsSync(API_KEY_FILE)) {
    return readFileSync(API_KEY_FILE, 'utf-8').trim()
  }
  
  // 生成新 key
  const apiKey = 'cc_' + randomBytes(32).toString('base64url')
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(API_KEY_FILE, apiKey, { mode: 0o600 }) // 仅限用户读取
  
  return apiKey
}

export function validateApiKey(key: string): boolean {
  return key === getOrCreateApiKey()
}

// HTTP 中间件
export function authMiddleware(request: Request): Response | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const apiKey = authHeader.slice(7)
  if (!validateApiKey(apiKey)) {
    return new Response('Invalid API key', { status: 401 })
  }
  
  return null // 认证通过
}
```

**OpenCode 模式**: 首次启动生成 API key，GUI 自动读取本地 key，Web 访问需要手动配置。

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

## 多 Agent 模式 (参考 OpenCode)

OpenCode 内置两种 Agents，通过 Tab 键切换：

| Agent | 权限 | 用途 |
|-------|------|------|
| **build** | 完整权限 | 默认，执行开发任务 |
| **plan** | 只读 | 分析代码、规划变更 |

CCLocal 实现：

```typescript
// core/src/agents/buildAgent.ts
export const buildAgent: Agent = {
  name: 'build',
  systemPrompt: 'You are a helpful coding assistant...',
  allowFileEdit: true,
  allowBash: true,
}

// core/src/agents/planAgent.ts
export const planAgent: Agent = {
  name: 'plan',
  systemPrompt: 'You are a code analysis assistant...',
  allowFileEdit: false,
  allowBash: 'ask', // 询问权限
}
```

## 安装方式 (参考 OpenCode)

```bash
# npm
npm install -g cclocal

# Homebrew (macOS/Linux)
brew install Luohao-Yan/tap/cclocal

# Scoop (Windows)
scoop bucket add extras
scoop install cclocal

# 桌面版
brew install --cask cclocal-desktop
```

## 开发计划

### Phase 1: 服务端增强 (2周)

- [ ] REST API 完整实现
- [ ] CORS 和认证
- [ ] API 文档 (Swagger/OpenAPI)

### Phase 2: GUI 客户端 (3周)

- [ ] Tauri 项目搭建
- [ ] React 前端开发
- [ ] 聊天界面 + 流式展示
- [ ] 文件浏览器

### Phase 3: 分发和文档 (1周)

- [ ] 安装包构建 (DMG/EXE/DEB)
- [ ] 安装脚本
- [ ] 使用文档
