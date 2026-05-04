# Packages-Native 新架构补齐清单

> **更新日期**: 2026-05-04
> **状态**: ✅ 全部完成（含独立 REPL）

---

## 一、已完成的核心修复 ✅

| 问题 | 状态 | 说明 |
|------|------|------|
| queryRemote 流式输出 | ✅ 已修复 | 使用 EventQueue 模式重写 |
| REST 命令处理 | ✅ 已实现 | mcp/models/sessions/doctor/context |
| CCLocalClient.onMessage | ✅ 已修复 | 返回取消订阅函数 |
| 入口路由集成 | ✅ 已完成 | index.ts 添加 --native 路由 |
| Legacy 模式验证 | ✅ 已验证 | 测试通过 |
| 完整交互模式 | ✅ 已实现 | **NativeREPL 独立实现** |
| 会话管理 | ✅ 已实现 | sessions resume/fork/rename |
| 斜杠命令 | ✅ 已实现 | /help/clear/rename/model/cwd/exit |
| 流式输出验证 | ✅ 已完成 | E2E 测试存在 |
| 本地引擎配置 | ✅ 已实现 | configLoader.ts |

---

## 二、新增文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `runtime/slashCommands.ts` | 250+ | 斜杠命令处理模块 |
| `runtime/configLoader.ts` | 200+ | 配置加载模块 |
| `runtime/nativeRouting.ts` | 150+ | 路由定义 |
| `runtime/nativeREPL.ts` | 300+ | **独立交互式 REPL** |
| `bridge/nativeBridgeAdapter.ts` | 416 | REST/本地引擎适配器 |
| `entrypoints/native.ts` | 560+ | Packages-Native 入口 |
| `e2e/native.e2e.test.ts` | 100+ | 端到端测试 |

---

## 三、修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `client/CCLocalClient.ts` | onMessage 返回取消函数 |
| `entrypoints/native.ts` | 使用 NativeREPL 替代 Legacy UI |

---

## 四、测试统计

| 测试文件 | 测试数 | 状态 |
|----------|--------|------|
| slashCommands.test.ts | 12 | ✅ 通过 |
| configLoader.test.ts | 8 | ✅ 通过 |
| nativeRouting.test.ts | 7 | ✅ 通过 |
| **nativeREPL.test.ts** | **3** | ✅ **通过** |
| native.test.ts | 14 | ✅ 通过 |
| nativeBridgeAdapter.test.ts | 14 | ✅ 通过 |
| **总计** | **58** | ✅ **100% 通过** |

---

## 五、功能验收

| 功能 | 验收标准 | 状态 |
|------|----------|------|
| 独立 REPL | 不依赖 Ink，纯 Node.js | ✅ 通过 |
| 历史记录 | 50条历史，保存到配置 | ✅ 实现 |
| 斜杠命令 | /help 显示所有命令 | ✅ 通过 |
| 流式输出 | 实时显示生成内容 | ✅ 通过 |
| 取消生成 | Ctrl+C 取消当前生成 | ✅ 实现 |
| 工具显示 | 显示工具执行和结果 | ✅ 实现 |
| 配置加载 | 环境变量+文件+提示 | ✅ 通过 |

---

## 六、Native REPL 特性

### 6.1 核心类

```typescript
class NativeREPL {
  start()           // 启动 REPL
  handleInput()     // 处理用户输入
  sendMessage()     // 发送消息
  handleStreamEvent() // 处理流事件
  cancelGeneration() // 取消生成
  exit()            // 退出
}
```

### 6.2 流事件显示

| 事件 | 显示 |
|------|------|
| stream_delta | 实时输出文本 |
| tool_use | 🔧 Tool: name |
| tool_result | 📎 Result: preview |
| error | ❌ Error: message |

---

## 七、使用方法

```bash
# 本地引擎模式
bun run packages/cli/src/entrypoints/native.ts

# 连接远程服务器
bun run packages/cli/src/entrypoints/native.ts \
  --server http://localhost:5678 \
  --token your-token

# 交互示例
> hello
Hello! How can I help you?

> /help
📚 Available Commands: ...

> /model claude-sonnet-4
Model changed to: claude-sonnet-4

> /exit
👋 Goodbye!
```

---

## 八、下一步

- [ ] Tab 自动补全
- [ ] 语法高亮
- [ ] 更多斜杠命令 (/resume, /branch 完整实现)
- [ ] GUI 客户端接入
