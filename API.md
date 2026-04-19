# CCLocal REST API 文档

## 基础信息

- **Base URL**: `http://localhost:5678/api/v1`
- **WebSocket**: `ws://localhost:5678/ws`
- **认证**: Bearer Token (`Authorization: Bearer <api_key>`)

## 认证

首次启动服务端自动生成 API key，存储在 `~/.cclocal/api_key`

```bash
# 获取 API key
cat ~/.cclocal/api_key

# 使用示例
curl -H "Authorization: Bearer $(cat ~/.cclocal/api_key)" http://localhost:5678/api/v1/sessions
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

## 错误处理

所有错误返回 JSON 格式：

```json
{
  "error": "Error message here"
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

服务端默认启用 CORS，允许所有来源：

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
