# Packages-Native 可用性测试指南

> **测试日期**: 2026-05-04
> **测试目标**: 验证 packages-native 架构的端到端可用性

---

## 一、测试前准备

### 1.1 环境要求

```bash
# 检查 bun 版本
bun --version  # 需要 >= 1.2.0

# 检查 Node.js 版本（如需要）
node --version  # 需要 >= 20.0.0

# 检查项目依赖
bun install
```

### 1.2 构建项目

```bash
# 完整构建
bun run build

# 预期输出：
# - dist/cli.js
# - dist/server.js
# - dist/legacy-cli.js
```

### 1.3 运行单元测试

```bash
# 运行 packages-native 相关测试
bun test packages/cli/src/runtime/slashCommands.test.ts
bun test packages/cli/src/runtime/configLoader.test.ts
bun test packages/cli/src/runtime/nativeRouting.test.ts
bun test packages/cli/src/entrypoints/native.test.ts
bun test packages/cli/src/bridge/nativeBridgeAdapter.test.ts

# 预期：55 tests, 119 assertions, 100% pass
```

---

## 二、Legacy 模式兼容性测试

### 2.1 目的

验证新增代码不影响现有 Legacy 模式。

### 2.2 测试步骤

```bash
# 启动 Legacy 模式
bun run start:legacy

# 预期：正常的 Claude Code UI 界面
# 测试命令：
# - 输入 "hello" - 应收到响应
# - 输入 "/help" - 应显示帮助
# - 输入 "/exit" - 应正常退出
```

### 2.3 验收标准

- [ ] Legacy 模式正常启动
- [ ] 输入响应正常
- [ ] 斜杠命令正常工作
- [ ] 正常退出无错误

---

## 三、Native 本地引擎模式测试

### 3.1 单次提示模式

```bash
# 测试本地引擎
bun run packages/cli/src/entrypoints/native.ts -p "What is 2+2?"

# 预期：输出 "4" 或类似答案
```

### 3.2 帮助命令

```bash
# 显示帮助
bun run packages/cli/src/entrypoints/native.ts --help

# 预期：显示完整帮助信息
```

### 3.3 验收标准

- [ ] 单次提示返回正确响应
- [ ] 帮助信息显示完整
- [ ] 无运行时错误

---

## 四、Native 远程 REST 模式测试

### 4.1 启动后端服务器

```bash
# 终端 1：启动服务器
bun run start:server

# 预期输出：
# Server started on http://localhost:5678
```

### 4.2 测试服务器连接

```bash
# 终端 2：测试连接
curl http://localhost:5678/health

# 预期：{"status":"ok"}
```

### 4.3 测试 REST 命令

```bash
# 测试 sessions 命令
bun run packages/cli/src/entrypoints/native.ts \
  --server http://localhost:5678 \
  sessions list

# 预期：显示会话列表（可能为空）

# 测试 mcp 命令
bun run packages/cli/src/entrypoints/native.ts \
  --server http://localhost:5678 \
  mcp list

# 预期：显示 MCP 服务器列表

# 测试 models 命令
bun run packages/cli/src/entrypoints/native.ts \
  --server http://localhost:5678 \
  models list

# 预期：显示可用模型列表

# 测试 doctor 命令
bun run packages/cli/src/entrypoints/native.ts \
  --server http://localhost:5678 \
  doctor

# 预期：运行诊断并显示结果
```

### 4.4 验收标准

- [ ] 服务器启动成功
- [ ] sessions 命令正常
- [ ] mcp 命令正常
- [ ] models 命令正常
- [ ] doctor 命令正常

---

## 五、完整交互模式测试

### 5.1 本地引擎交互

```bash
# 启动交互模式
bun run packages/cli/src/entrypoints/native.ts --local-engine

# 测试：
# 1. 输入问题，检查响应
# 2. 测试 Ctrl+C 取消
# 3. 输入 /help 查看命令
# 4. 输入 /exit 退出
```

### 5.2 远程模式交互

```bash
# 连接服务器交互
bun run packages/cli/src/entrypoints/native.ts \
  --server http://localhost:5678

# 测试同上
```

### 5.3 验收标准

- [ ] 交互模式正常启动
- [ ] 消息发送接收正常
- [ ] 取消操作正常
- [ ] 斜杠命令正常
- [ ] 正常退出

---

## 六、并发性能测试

### 6.1 多会话并发

```bash
# 运行并发测试
bun test packages/server/src/sessions/SessionManager.test.ts

# 预期：所有测试通过，验证：
# - 同会话请求串行处理
# - 不同会话并行处理
# - 取消操作正确清理
```

### 6.2 WebSocket 连接测试

```bash
# 运行 WebSocket 测试
bun test packages/server/src/ws/WebSocketManager.test.ts

# 预期：所有测试通过，验证：
# - 连接限制生效
# - 空闲超时清理
# - 心跳保活正常
```

### 6.3 速率限制测试

```bash
# 运行速率限制测试
bun test packages/server/src/middleware/rateLimiter.test.ts

# 预期：所有测试通过
```

---

## 七、E2E 测试（需要 API Key）

### 7.1 设置环境变量

```bash
# 设置 API Key
export ANTHROPIC_API_KEY="your-api-key"
```

### 7.2 运行 E2E 测试

```bash
# 运行端到端测试
bun test packages/cli/src/e2e/native.e2e.test.ts

# 注意：需要 ANTHROPIC_API_KEY 环境变量
```

---

## 八、故障排查

### 8.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 模块导入失败 | 路径问题 | 检查 tsconfig.json paths |
| 服务器启动失败 | 端口占用 | 检查 5678 端口 |
| API 调用失败 | 无 API Key | 设置 ANTHROPIC_API_KEY |
| 测试超时 | Mock 配置错误 | 检查 vi.mock 调用 |

### 8.2 日志调试

```bash
# 启用调试日志
DEBUG=cclocal:* bun run packages/cli/src/entrypoints/native.ts -p "test"
```

---

## 九、测试检查清单

### 9.1 基础功能

- [ ] 项目构建成功
- [ ] 单元测试全部通过
- [ ] Legacy 模式不受影响

### 9.2 Native 本地模式

- [ ] 单次提示正常
- [ ] 帮助信息显示
- [ ] 无运行时错误

### 9.3 Native 远程模式

- [ ] 服务器启动成功
- [ ] REST 命令正常
- [ ] 交互模式正常

### 9.4 并发测试

- [ ] SessionManager 测试通过
- [ ] WebSocketManager 测试通过
- [ ] RateLimiter 测试通过

### 9.5 E2E 测试

- [ ] API Key 配置正确
- [ ] E2E 测试通过

---

## 十、快速测试命令汇总

```bash
# 1. 构建
bun run build

# 2. 单元测试
bun test packages/cli/src/runtime/*.test.ts
bun test packages/cli/src/bridge/nativeBridgeAdapter.test.ts
bun test packages/cli/src/entrypoints/native.test.ts

# 3. 并发测试
bun test packages/server/src/sessions/SessionManager.test.ts
bun test packages/server/src/ws/WebSocketManager.test.ts
bun test packages/server/src/middleware/rateLimiter.test.ts
bun test packages/core/src/engine/queryEngine.test.ts

# 4. Legacy 模式
bun run start:legacy

# 5. Native 模式
bun run packages/cli/src/entrypoints/native.ts --help
bun run packages/cli/src/entrypoints/native.ts -p "Hello"

# 6. 服务器模式
bun run start:server  # 终端 1
bun run packages/cli/src/entrypoints/native.ts --server http://localhost:5678 mcp list  # 终端 2
```
