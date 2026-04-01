# 命令系统 API

> 斜杠命令（`/command`）是用户直接调用的功能。

---

## 目录

- [命令类型](#命令类型)
- [Command 接口](#command-接口)
- [命令注册表](#命令注册表)
- [命令上下文](#命令上下文)

---

## 命令类型

命令有三种类型：

| 类型 | 说明 | 返回类型 |
|------|------|---------|
| `local` | 纯本地执行，返回文本 | `CommandResult` |
| `local-jsx` | 本地执行，返回 JSX UI | `CommandResult` (jsx) |
| `prompt` | 扩展为发送给模型的提示文本 | `string` |

---

## Command 接口

### Local 命令

```typescript
interface LocalCommand {
  type: 'local';
  name: string;
  description: string;
  aliases?: string[];
  source: 'builtin' | 'plugin' | 'user';
  isEnabled?: () => boolean;
  hidden?: boolean;
  run: (args: string[], context: CommandContext) => Promise<CommandResult>;
}
```

### Local-JSX 命令

```typescript
interface LocalJsxCommand {
  type: 'local-jsx';
  name: string;
  description: string;
  aliases?: string[];
  source: 'builtin' | 'plugin' | 'user';
  isEnabled?: () => boolean;
  hidden?: boolean;
  run: (args: string[], context: CommandContext) => Promise<CommandResult>;
}
```

### Prompt 命令

```typescript
interface PromptCommand {
  type: 'prompt';
  name: string;
  description: string;
  aliases?: string[];
  source: 'builtin' | 'plugin' | 'user';
  isEnabled?: () => boolean;
  hidden?: boolean;
  content?: string;
  getPromptForCommand?: (args: string[], context: CommandContext) => Promise<string>;
}
```

### 通用字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | `'local' \| 'local-jsx' \| 'prompt'` | ✅ | 命令类型 |
| `name` | `string` | ✅ | 命令名称（kebab-case） |
| `description` | `string` | ✅ | 命令描述 |
| `aliases` | `string[]` | ❌ | 命令别名 |
| `source` | `'builtin' \| 'plugin' \| 'user'` | ✅ | 命令来源 |
| `isEnabled` | `() => boolean` | ❌ | 是否启用 |
| `hidden` | `boolean` | ❌ | 是否在帮助中隐藏 |

---

## 命令结果

### CommandResult

```typescript
type CommandResult =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'jsx'; jsx: React.ReactNode }
  | { type: 'silent' };
```

### 示例

```typescript
// 成功
return { type: 'success', message: 'Done!' };

// 错误
return { type: 'error', message: 'Something went wrong' };

// JSX
return { type: 'jsx', jsx: <Text>Hello!</Text> };

// 静默（无输出）
return { type: 'silent' };
```

---

## 示例

### Local 命令示例

```typescript
import { type Command } from '../../types/command.js';

export const helloCommand: Command = {
  type: 'local',
  name: 'hello',
  description: '向用户打招呼',
  aliases: ['hi'],
  source: 'builtin',

  isEnabled: () => true,

  async run(args: string[], context: CommandContext) {
    const name = args[0] || 'World';
    return {
      type: 'success',
      message: `Hello, ${name}!`,
    };
  },
};
```

### Local-JSX 命令示例

```typescript
import React from 'react';
import { type Command } from '../../types/command.js';
import { Box, Text } from '../../ink.js';

export const statusCommand: Command = {
  type: 'local-jsx',
  name: 'status',
  description: '显示当前状态',
  source: 'builtin',

  async run(args: string[], context: CommandContext) {
    const { model } = context.appState;

    return {
      type: 'jsx',
      jsx: (
        <Box flexDirection="column" gap={1}>
          <Text color="blue">当前状态</Text>
          <Text>模型: {model}</Text>
        </Box>
      ),
    };
  },
};
```

### Prompt 命令示例

```typescript
import { type Command } from '../../types/command.js';

export const explainCommand: Command = {
  type: 'prompt',
  name: 'explain',
  description: '解释选中的代码',
  source: 'builtin',

  // 静态内容
  content: '请详细解释这段代码的功能。',

  // 或者动态生成
  async getPromptForCommand(args: string[], context: CommandContext) {
    const language = args[0] || 'TypeScript';
    return `请用中文解释这段 ${language} 代码：`;
  },
};
```

---

## 命令上下文

### CommandContext

传递给 `run()` 和 `getPromptForCommand()` 的上下文：

```typescript
interface CommandContext {
  // 应用状态
  appState: AppState;

  // 状态更新函数
  setAppState: (update: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void;

  // 会话 ID
  sessionId: string;

  // 工作目录
  cwd: string;

  // ... 更多字段
}
```

### 使用 AppState

```typescript
async run(args: string[], context: CommandContext) {
  const { appState, setAppState } = context;

  // 读取状态
  const currentModel = appState.model;

  // 更新状态
  setAppState({ model: 'sonnet' });

  // 函数式更新
  setAppState(state => ({
    model: state.model === 'sonnet' ? 'opus' : 'sonnet'
  }));

  return { type: 'success', message: `模型已切换` };
}
```

---

## 命令注册表

### COMMANDS

获取所有命令的 memoized 函数：

```typescript
import { COMMANDS } from '../commands.js';

const commands = COMMANDS();
console.log(`Loaded ${commands.length} commands`);
```

### 查找命令

```typescript
// 通过名称查找
const findCommand = (name: string) => {
  return COMMANDS().find(cmd =>
    cmd.name === name || cmd.aliases?.includes(name)
  );
};
```

---

## 相关文档

- [模块开发指南](../module-development.md#如何添加新命令) - 完整的命令开发教程
- [命令列表](../../PROJECT_ANALYSIS.md#命令系统) - 所有内置命令列表
