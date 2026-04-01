# 工具系统 API

> 工具系统是 Claude Code 与外部系统交互的核心方式。

---

## 目录

- [Tool 基类](#tool-基类)
- [buildTool()](#buildtool)
- [ToolUseContext](#toolusecontext)
- [工具注册表](#工具注册表)

---

## Tool 基类

### ToolDefinition

工具定义接口，所有工具必须实现：

```typescript
interface ToolDefinition<TInput, TOutput> {
  // 基本信息
  name: string;
  description: string;
  version: string;

  // Schema 定义
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;

  // 工具特性
  isEnabled?: () => boolean;
  isReadOnly?: boolean;
  isConcurrencySafe?: boolean;
  requiresExplicitPermission?: boolean;

  // 核心方法
  checkPermissions?: (input: TInput, context: ToolUseContext) => Promise<PermissionResult>;
  validateInput?: (input: TInput, context: ToolUseContext) => Promise<TInput>;
  call: (input: TInput, context: ToolUseContext) => Promise<TOutput>;
  renderToolUseMessage?: (input: TInput, result: TOutput, context: ToolUseContext) => Promise<React.ReactNode | null>;
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 工具名称（snake_case） |
| `description` | `string` | ✅ | 工具描述（告诉模型何时使用） |
| `version` | `string` | ✅ | 版本号（如 'v1'） |
| `inputSchema` | `ZodType` | ✅ | 输入参数 Zod Schema |
| `outputSchema` | `ZodType` | ❌ | 输出结果 Zod Schema |
| `isEnabled` | `() => boolean` | ❌ | 工具是否启用 |
| `isReadOnly` | `boolean` | ❌ | 是否为只读工具 |
| `isConcurrencySafe` | `boolean` | ❌ | 是否并发安全 |
| `checkPermissions` | `Function` | ❌ | 权限检查 |
| `validateInput` | `Function` | ❌ | 输入验证（Zod 之外） |
| `call` | `Function` | ✅ | 核心执行逻辑 |
| `renderToolUseMessage` | `Function` | ❌ | 自定义结果渲染 |

---

## buildTool()

构建工具的工厂函数。

### 签名

```typescript
function buildTool<TInput, TOutput>(
  definition: ToolDefinition<TInput, TOutput>
): Tool<TInput, TOutput>;
```

### 示例

```typescript
import { z } from 'zod';
import { buildTool, type ToolUseContext } from '../Tool.js';

export const EchoTool = buildTool({
  name: 'echo',
  description: '返回输入的消息',
  version: 'v1',

  inputSchema: z.object({
    message: z.string().describe('要返回的消息'),
    uppercase: z.boolean().optional().describe('是否转为大写'),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    result: z.string(),
  }),

  isEnabled: () => true,
  isReadOnly: true,
  isConcurrencySafe: true,

  async checkPermissions(input, context: ToolUseContext) {
    return { allowed: true };
  },

  async validateInput(input, context: ToolUseContext) {
    // 额外的验证逻辑
    if (input.message.length > 1000) {
      throw new Error('消息太长');
    }
    return input;
  },

  async call(input, context: ToolUseContext) {
    const { message, uppercase = false } = input;
    let result = message;
    if (uppercase) {
      result = result.toUpperCase();
    }
    return { success: true, result };
  },

  async renderToolUseMessage(input, result, context: ToolUseContext) {
    // 自定义渲染（可选）
    return null; // 使用默认渲染
  },
});
```

---

## ToolUseContext

传递给工具方法的上下文对象。

### 类型定义

```typescript
interface ToolUseContext {
  // 取消信号
  signal: AbortSignal;

  // MCP 服务器
  mcpServers: MCPServers;

  // 工作目录
  cwd: string;

  // 会话 ID
  sessionId: string;

  // ... 更多内部字段
}
```

### 常用属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `signal` | `AbortSignal` | 用于取消长时间运行的操作 |
| `cwd` | `string` | 当前工作目录 |
| `mcpServers` | `MCPServers` | MCP 服务器管理器 |

### 使用 AbortSignal

```typescript
async call(input, context: ToolUseContext) {
  const { signal } = context;

  // 检查是否已取消
  if (signal.aborted) {
    throw new Error('Operation cancelled');
  }

  // 监听取消事件
  signal.addEventListener('abort', () => {
    // 清理资源
  });

  // 传递给支持 signal 的 API
  const result = await fetch(input.url, { signal });

  return { success: true, result };
}
```

---

## 工具注册表

### getAllBaseTools()

返回所有内置工具的数组。

```typescript
import { getAllBaseTools } from '../tools.js';

const tools = getAllBaseTools();
console.log(`Loaded ${tools.length} tools`);
```

### 工具类型

```typescript
type Tools = ReturnType<typeof getAllBaseTools>;
type Tool = Tools[number];
```

---

## 权限检查

### PermissionResult

`checkPermissions()` 返回的结果类型：

```typescript
type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string };
```

### 示例

```typescript
async checkPermissions(input, context: ToolUseContext) {
  // 检查文件路径
  if (input.path.includes('/etc/')) {
    return {
      allowed: false,
      reason: 'Cannot access system files'
    };
  }
  return { allowed: true };
}
```

---

## 工具特性标记

### isReadOnly

标记工具为只读（不修改文件系统）：

```typescript
export const ReadFileTool = buildTool({
  // ...
  isReadOnly: true,
  // ...
});
```

### isConcurrencySafe

标记工具可以安全地并发执行：

```typescript
export const EchoTool = buildTool({
  // ...
  isConcurrencySafe: true,
  // ...
});
```

---

## 相关文档

- [模块开发指南](../module-development.md#如何添加新工具) - 完整的工具开发教程
- [工具列表](../../PROJECT_ANALYSIS.md#工具系统) - 所有内置工具列表
