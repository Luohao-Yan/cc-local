# API 参考

本目录包含 Claude Code Rebuilt 项目的 API 参考文档。

> 注意：此 API 参考基于泄露的源代码重建。原始文档不可用，此内容是通过代码分析生成的。

---

## 目录

- [工具系统](./tools.md) - Tool 基类和工具开发 API
- [命令系统](./commands.md) - 命令系统 API
- [状态管理](./app-state.md) - AppState API
- [工具函数](./utils.md) - 通用工具函数

---

## 快速索引

| 模块 | 文件 | 说明 |
|------|------|------|
| `Tool` | `src/Tool.ts` | 工具基类定义 |
| `tools.ts` | `src/tools.ts` | 工具注册表 |
| `commands.ts` | `src/commands.ts` | 命令注册表 |
| `query.ts` | `src/query.ts` | 查询引擎 |
| `AppState` | `src/state/AppState.ts` | 全局状态管理 |
| `logError` | `src/utils/log.ts` | 错误日志 |
| `logForDebugging` | `src/utils/debug.ts` | 调试日志 |
| `profileCheckpoint` | `src/utils/startupProfiler.ts` | 启动分析 |

---

## 核心类型定义

### ToolUseContext

工具调用上下文，传递给所有工具的 `call()` 方法：

```typescript
interface ToolUseContext {
  signal: AbortSignal;
  mcpServers: MCPServers;
  // ... 更多字段
}
```

### Command

命令定义类型：

```typescript
interface Command {
  type: 'local' | 'local-jsx' | 'prompt';
  name: string;
  description: string;
  aliases?: string[];
  source: 'builtin' | 'plugin' | 'user';
  isEnabled?: () => boolean;
  run?: (args: string[], context: CommandContext) => Promise<CommandResult>;
  content?: string;
  getPromptForCommand?: (args: string[], context: CommandContext) => Promise<string>;
}
```

---

## 使用示例

### 创建工具

```typescript
import { z } from 'zod';
import { buildTool, type ToolUseContext } from '../Tool.js';

export const MyTool = buildTool({
  name: 'my_tool',
  description: '工具描述',
  version: 'v1',
  inputSchema: z.object({ param: z.string() }),
  async call(input, context: ToolUseContext) {
    return { success: true, result: input.param };
  },
});
```

### 创建命令

```typescript
import { type Command } from '../types/command.js';

export const myCommand: Command = {
  type: 'local',
  name: 'my-command',
  description: '命令描述',
  source: 'builtin',
  async run(args, context) {
    return { type: 'success', message: 'Hello!' };
  },
};
```

---

## 相关文档

- [模块开发指南](../module-development.md) - 如何使用这些 API 开发新功能
- [调试指南](../debugging.md) - 调试技巧
- [架构分析](../../PROJECT_ANALYSIS.md) - 系统架构概览
