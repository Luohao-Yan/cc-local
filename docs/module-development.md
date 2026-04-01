# 模块开发指南

> 本文档指导你如何在 Claude Code Rebuilt 中添加新工具、新命令、新组件等

---

## 目录

1. [如何添加新工具](#如何添加新工具)
2. [如何添加新命令](#如何添加新命令)
3. [如何添加新组件](#如何添加新组件)
4. [如何添加新 Skill](#如何添加新-skill)
5. [如何添加新 Plugin](#如何添加新-plugin)

---

## 如何添加新工具

### 工具系统概述

工具是 Claude Code 与外部系统交互的核心方式。每个工具都定义在 `src/tools/<ToolName>/` 目录下。

### 工具开发步骤

#### 1. 创建工具目录

```bash
mkdir -p src/tools/MyNewTool
```

#### 2. 创建工具实现文件

创建 `src/tools/MyNewTool/MyNewTool.ts`：

```typescript
import { z } from 'zod';
import { buildTool, type ToolUseContext } from '../../Tool.js';

// 1. 定义输入 Schema（使用 Zod）
export const MyNewToolInputSchema = z.object({
  // 必填参数
  requiredParam: z.string().describe('必填参数说明'),
  // 可选参数
  optionalParam: z.number().optional().describe('可选参数说明'),
});

// 2. 定义输出 Schema（可选但推荐）
export const MyNewToolOutputSchema = z.object({
  success: z.boolean(),
  result: z.string(),
});

// 3. 导出工具定义
export const MyNewTool = buildTool({
  // 基本信息
  name: 'my_new_tool',
  description: '工具的详细描述，告诉模型何时使用这个工具',
  version: 'v1',

  // Schema 定义
  inputSchema: MyNewToolInputSchema,
  outputSchema: MyNewToolOutputSchema,

  // 工具特性
  isEnabled: () => true, // 可以根据功能标志返回
  isReadOnly: false, // 是否是只读工具
  isConcurrencySafe: true, // 是否并发安全

  // 权限检查
  async checkPermissions(input, context: ToolUseContext) {
    // 在这里实现权限检查逻辑
    // 返回 { allowed: true } 或 { allowed: false, reason: '...' }
    return { allowed: true };
  },

  // 输入验证（可选，Zod 已经提供了基本验证）
  async validateInput(input, context: ToolUseContext) {
    // 额外的验证逻辑
    return input;
  },

  // 核心执行逻辑
  async call(input, context: ToolUseContext) {
    const { requiredParam, optionalParam = 42 } = input;

    try {
      // 在这里实现工具的核心逻辑
      const result = await doSomething(requiredParam, optionalParam);

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // 工具结果展示（可选，自定义渲染）
  async renderToolUseMessage(input, result, context: ToolUseContext) {
    // 返回自定义的 JSX 或 null 使用默认渲染
    return null;
  },
});

// 4. 导出默认工具
export default MyNewTool;
```

#### 3. 注册工具

在 `src/tools.ts` 中添加：

```typescript
import { MyNewTool } from './tools/MyNewTool/MyNewTool.js';

// 在 getAllBaseTools() 函数中添加
export function getAllBaseTools(): Tools {
  return [
    // ... 现有工具
    MyNewTool, // <-- 添加这里
  ];
}
```

### 工具示例参考

查看现有工具作为参考：

| 工具 | 位置 | 说明 |
|------|------|------|
| FileReadTool | `src/tools/FileReadTool/` | 文件读取，处理多种格式 |
| BashTool | `src/tools/BashTool/` | Shell 命令执行 |
| AgentTool | `src/tools/AgentTool/` | 子 Agent 启动 |
| WebSearchTool | `src/tools/WebSearchTool/` | Web 搜索 |

---

## 如何添加新命令

### 命令系统概述

斜杠命令（`/command`）是用户直接调用的功能。命令定义在 `src/commands/<command-name>/` 目录下。

### 命令类型

命令有三种类型：

| 类型 | 说明 |
|------|------|
| `local` | 纯本地执行，返回文本 |
| `local-jsx` | 本地执行，返回 JSX UI |
| `prompt` | 扩展为发送给模型的提示文本 |

### 命令开发步骤

#### 1. 创建命令目录

```bash
mkdir -p src/commands/my-command
```

#### 2. 创建命令实现

创建 `src/commands/my-command/index.ts`：

```typescript
import { type Command } from '../../types/command.js';

// Local 命令示例
export const myCommand: Command = {
  type: 'local',
  name: 'my-command',
  description: '命令的描述',
  aliases: ['mc'], // 可选的别名
  source: 'builtin',

  // 可用性检查（可选）
  isEnabled: () => true,

  // 执行逻辑
  async run(args: string[], context) {
    const [param1, param2] = args;

    // 在这里实现命令逻辑
    console.log('执行 my-command');

    return {
      type: 'success',
      message: `成功执行！参数: ${param1}, ${param2}`,
    };
  },
};

export default myCommand;
```

#### Prompt 命令示例

```typescript
import { type Command } from '../../types/command.js';

export const myPromptCommand: Command = {
  type: 'prompt',
  name: 'my-prompt-command',
  description: '这是一个 prompt 命令',
  source: 'builtin',
  content: `
这是发送给模型的提示内容。

可以包含多行文本。
`,
  // 或者使用函数动态生成
  async getPromptForCommand(args, context) {
    return `动态生成的提示: ${args.join(' ')}`;
  },
};
```

#### Local-JSX 命令示例

```typescript
import React from 'react';
import { type Command } from '../../types/command.js';
import { Box, Text } from '../../ink.js';

export const myJsxCommand: Command = {
  type: 'local-jsx',
  name: 'my-jsx-command',
  description: '这是一个 JSX 命令',
  source: 'builtin',

  async run(args, context) {
    return {
      type: 'jsx',
      jsx: (
        <Box flexDirection="column" gap={1}>
          <Text color="success">Hello from JSX!</Text>
          <Text>Arguments: {args.join(', ')}</Text>
        </Box>
      ),
    };
  },
};
```

#### 3. 注册命令

在 `src/commands.ts` 中添加：

```typescript
import myCommand from './commands/my-command/index.js';

// 在 COMMANDS 函数中添加
const COMMANDS = memoize((): Command[] => [
  // ... 现有命令
  myCommand, // <-- 添加这里
]);
```

### 命令示例参考

| 命令 | 位置 | 类型 | 说明 |
|------|------|------|------|
| help | `src/commands/help/` | prompt | 帮助命令 |
| model | `src/commands/model/` | local-jsx | 模型选择 |
| plan | `src/commands/plan/` | local | 计划模式切换 |
| commit | `src/commands/commit.js` | local | Git 提交 |

---

## 如何添加新组件

### 组件系统概述

项目使用 **React + 自定义 Ink** 构建终端 UI。组件位于 `src/components/` 目录下。

### 组件开发步骤

#### 1. 创建组件文件

创建 `src/components/MyComponent.tsx`：

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text, Button } from '../ink.js';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 组件挂载时的逻辑
    return () => {
      // 组件卸载时的清理
    };
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="blue">{title}</Text>
      <Text>Count: {count}</Text>
      <Button
        label="Increment"
        onPress={() => {
          setCount(c => c + 1);
          onAction?.();
        }}
      />
    </Box>
  );
}

export default MyComponent;
```

### Ink 内置组件

| 组件 | 说明 |
|------|------|
| `Box` | 容器，类似 div |
| `Text` | 文本显示 |
| `Button` | 按钮 |
| `ScrollBox` | 可滚动容器 |
| `Spinner` | 加载动画 |
| `TextInput` | 文本输入 |

### 布局系统

项目使用 **Yoga** 布局引擎，支持 Flexbox：

```typescript
<Box flexDirection="row" justifyContent="space-between">
  <Box flexGrow={1}>左侧</Box>
  <Box>右侧</Box>
</Box>
```

### 状态管理

使用 `useAppState` hook 访问全局状态：

```typescript
import { useAppState } from '../state/AppState.js';

function MyComponent() {
  const model = useAppState(state => state.model);
  const settings = useAppState(state => state.settings);

  return <Text>当前模型: {model}</Text>;
}
```

---

## 如何添加新 Skill

### Skills 系统概述

Skills 是可重用的提示模板，位于 `src/skills/` 目录。项目支持：
- **内置 Skills** (`bundledSkills.ts`)
- **目录加载 Skills** (`./skills/` 目录)
- **MCP Skills** (从 MCP 服务器加载)

### 内置 Skill 开发步骤

#### 1. 在 `src/skills/bundledSkills.ts` 中添加

```typescript
import { registerBundledSkill } from './bundledSkills.js';

registerBundledSkill({
  name: 'my-skill',
  description: 'Skill 的描述，告诉模型何时使用',
  kind: 'builtin',
  source: 'bundled',
  whenToUse: '当需要执行特定任务时使用此 skill',

  // 提示内容
  content: `
这是 skill 的提示内容。

可以包含多行文本和指令。
`,

  // 或者动态生成
  async getPromptForCommand(args, context) {
    return `动态提示: ${args.join(' ')}`;
  },
});
```

### 目录加载 Skill

在项目根目录创建 `skills/` 目录，添加 `my-skill.md`：

```markdown
---
name: my-skill
description: 我的自定义 skill
whenToUse: 当需要时使用
---

这是 skill 的内容。

可以包含 Markdown 格式。
```

---

## 如何添加新 Plugin

### 插件系统概述

插件可以提供 skills、hooks 和 MCP 服务器。内置插件位于 `src/plugins/`。

### 插件开发步骤

#### 1. 创建插件

在 `src/plugins/builtinPlugins.ts` 中注册：

```typescript
import { registerBuiltinPlugin } from './builtinPlugins.js';

registerBuiltinPlugin({
  name: 'my-plugin',
  version: '1.0.0',
  description: '我的插件描述',

  // 插件可以提供 skills
  async getSkills() {
    return [
      // 返回 skill 数组
    ];
  },

  // 插件可以提供 hooks
  async getHooks() {
    return {
      // 返回 hooks
    };
  },

  // 插件可以提供 MCP 服务器
  async getMcpServers() {
    return [
      // 返回 MCP 服务器配置
    ];
  },
});
```

---

## 最佳实践

### 工具开发

- ✅ 使用 Zod 定义输入输出 Schema
- ✅ 实现 `checkPermissions()` 进行权限检查
- ✅ 工具应该是幂等的
- ✅ 合理使用 `isReadOnly` 标记

### 命令开发

- ✅ 简单功能用 `local` 命令
- ✅ 需要交互用 `local-jsx` 命令
- ✅ 需要 AI 辅助用 `prompt` 命令
- ✅ 提供清晰的 `description`

### 组件开发

- ✅ 使用函数组件和 Hooks
- ✅ 合理使用 Flexbox 布局
- ✅ 避免过度渲染，使用选择器
- ✅ 支持主题切换

### 通用原则

- ✅ 遵循项目的 TypeScript 严格模式
- ✅ 使用项目已有的工具函数
- ✅ 参考现有代码的模式
- ✅ 先写小的验证性变更
- ✅ 测试你的更改

---

## 下一步

- 阅读 [调试指南](./debugging.md) 学习调试技巧
- 查看 [架构分析](../PROJECT_ANALYSIS.md) 深入理解系统
- 参考 [DEVELOPING.md](../DEVELOPING.md) 了解开发流程
