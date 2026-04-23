# CCLocal REST API 文档

## 基础信息

- **Base URL**: `http://localhost:5678/api/v1`
- **WebSocket**: `ws://localhost:5678/ws`
- **认证**: Bearer Token 或 `X-API-Key`

## 认证

服务端支持两种 token 来源：

- 设置 `CCLOCAL_API_KEY`，使用固定 API key
- 不设置时，服务启动后生成临时 token，并在启动日志中打印

```bash
# 使用 Bearer Token
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:5678/api/v1/sessions

# 或使用 X-API-Key
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:5678/api/v1/sessions
```

## 端点列表

### 健康检查

```bash
GET /health
```

响应：
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### 会话管理

#### 创建会话
```bash
POST /api/v1/sessions
Content-Type: application/json

{
  "name": "Project Setup",
  "cwd": "/path/to/project",
  "model": "claude-sonnet-4"
}
```

#### 列出会话
```bash
GET /api/v1/sessions
```

#### 获取会话详情
```bash
GET /api/v1/sessions/:id
```

#### 更新会话
```bash
PUT /api/v1/sessions/:id
Content-Type: application/json

{
  "name": "New Name",
  "model": "claude-opus-4"
}
```

#### 删除会话
```bash
DELETE /api/v1/sessions/:id
```

### 消息操作

#### 获取消息历史
```bash
GET /api/v1/sessions/:id/messages?limit=50&offset=0
```

#### 发送消息 (SSE 流式)
```bash
POST /api/v1/sessions/:id/messages
Content-Type: application/json

{
  "content": "Hello, how are you?",
  "options": {
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

响应：Server-Sent Events
```
event: stream_start
data: {"messageId": "..."}

event: delta
data: {"type": "text_delta", "text": "Hello"}

event: stream_end
data: {}
```

#### 取消生成
```bash
POST /api/v1/sessions/:id/cancel
```

### 工具调用

#### 执行任意工具
```bash
POST /api/v1/tools/:name/execute
Content-Type: application/json

{
  "path": "/path/to/file",
  "offset": 1,
  "limit": 50
}
```

### 文件操作

#### 读取文件
```bash
POST /api/v1/files/read
Content-Type: application/json

{
  "path": "/path/to/file.txt",
  "offset": 1,
  "limit": 100
}
```

#### 写入文件
```bash
POST /api/v1/files/write
Content-Type: application/json

{
  "path": "/path/to/file.txt",
  "content": "file content here"
}
```

#### 编辑文件
```bash
POST /api/v1/files/edit
Content-Type: application/json

{
  "path": "/path/to/file.txt",
  "old_string": "old content",
  "new_string": "new content"
}
```

#### 搜索文件
```bash
POST /api/v1/files/search
Content-Type: application/json

{
  "type": "glob",
  "pattern": "**/*.ts"
}

# 或内容搜索
{
  "type": "content",
  "pattern": "function main",
  "path": "/path/to/dir"
}
```

### 模型列表

```bash
GET /api/v1/models
```

响应：
```json
[
  { "id": "claude-sonnet-4", "name": "Claude Sonnet 4" },
  { "id": "claude-opus-4", "name": "Claude Opus 4" },
  { "id": "doubao", "name": "Doubao" }
]
```

### MCP 管理

#### 列出 MCP 服务器
```bash
GET /api/v1/mcp/servers
```

#### 获取单个 MCP 服务器详情
```bash
GET /api/v1/mcp/servers/:name
```

#### 注册 MCP 服务器
```bash
POST /api/v1/mcp/servers
Content-Type: application/json

{
  "name": "filesystem",
  "config": {
    "type": "stdio",
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "/path/to/project"]
  }
}
```

也支持 SSE 服务器：

```json
{
  "name": "docs",
  "config": {
    "type": "sse",
    "url": "http://127.0.0.1:8080/sse",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN"
    }
  }
}
```

可选策略字段：

```json
{
  "name": "filesystem",
  "config": {
    "type": "stdio",
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "/path/to/project"],
    "namespace": "local_fs",
    "allowedTools": ["read_file", "list_directory"],
    "blockedTools": ["delete_file"],
    "syncToolsToRegistry": true
  }
}
```

字段说明：

- `namespace`: 动态工具注册到模型工具池时使用的命名空间，最终工具名形如 `mcp__<namespace>__<tool>`
- `allowedTools`: 只允许这些远端工具暴露给模型
- `blockedTools`: 显式屏蔽的远端工具
- `syncToolsToRegistry`: 是否把已连接的 MCP 工具同步进默认模型工具池；设为 `false` 时只保留连接，不自动暴露给模型

#### 删除 MCP 服务器
```bash
DELETE /api/v1/mcp/servers/:name
```

#### 连接 MCP 服务器
```bash
POST /api/v1/mcp/servers/:name/connect
```

连接成功后，如果 `syncToolsToRegistry` 未设为 `false`，该服务器暴露出的工具会自动进入默认工具池，模型可以直接调用。

#### 断开 MCP 服务器
```bash
POST /api/v1/mcp/servers/:name/disconnect
```

## 错误处理

所有错误返回 JSON 格式：

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Error message here"
  }
}
```

状态码：
- `200` - 成功
- `201` - 创建成功
- `400` - 请求错误
- `401` - 未认证
- `404` - 未找到
- `500` - 服务器错误

## CORS 支持

服务端默认允许 loopback 来源，也可以通过 `CCLOCAL_ALLOWED_ORIGINS` 配置显式允许来源列表。

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 完整示例

```bash
#!/bin/bash

API_KEY=$(cat ~/.cclocal/api_key)
BASE_URL="http://localhost:5678/api/v1"

# 1. 创建会话
SESSION=$(curl -s -X POST "$BASE_URL/sessions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "cwd": "'"$PWD"'"}')
SESSION_ID=$(echo $SESSION | jq -r '.id')

# 2. 发送消息
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/messages" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "List all files"}'

# 3. 获取历史
curl -s "$BASE_URL/sessions/$SESSION_ID/messages" \
  -H "Authorization: Bearer $API_KEY" | jq
```
