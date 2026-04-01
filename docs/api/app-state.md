# AppState API

> AppState 是 Claude Code 的全局状态管理系统，包含 450+ 字段。

---

## 目录

- [概述](#概述)
- [useAppState Hook](#useappstate-hook)
- [AppState 结构](#appstate-结构)
- [常用状态字段](#常用状态字段)

---

## 概述

AppState 使用 Zustand 风格的状态管理，支持：
- 选择器模式（selector）避免过度渲染
- 函数式更新
- 订阅状态变化

AppState 定义在 `src/state/AppState.ts`。

---

## useAppState Hook

### 基本用法

```typescript
import { useAppState } from '../state/AppState.js';

function MyComponent() {
  // 选择单个字段
  const model = useAppState(state => state.model);

  // 选择多个字段
  const { model, temperature } = useAppState(state => ({
    model: state.model,
    temperature: state.settings.temperature,
  }));

  return <Text>当前模型: {model}</Text>;
}
```

### shallow 比较

对于返回对象的选择器，使用 shallow 比较：

```typescript
import { useAppState } from '../state/AppState.js';
import { shallow } from 'zustand/shallow';

function MyComponent() {
  // 使用 shallow 比较避免不必要的重渲染
  const { model, temperature } = useAppState(
    state => ({
      model: state.model,
      temperature: state.settings.temperature,
    }),
    shallow
  );

  return <Text>模型: {model}, 温度: {temperature}</Text>;
}
```

---

## 获取和设置状态（组件外）

### getAppState

在 React 组件外获取状态：

```typescript
import { getAppState } from '../state/AppState.js';

const state = getAppState();
console.log('当前模型:', state.model);
```

### setAppState

在 React 组件外更新状态：

```typescript
import { setAppState } from '../state/AppState.js';

// 对象形式
setAppState({ model: 'sonnet' });

// 函数形式
setAppState(state => ({
  model: state.model === 'sonnet' ? 'opus' : 'sonnet'
}));
```

### subscribe

订阅状态变化：

```typescript
import { subscribe, getAppState } from '../state/AppState.js';

// 订阅所有变化
const unsubscribe = subscribe((state, prevState) => {
  if (state.model !== prevState.model) {
    console.log('模型变化:', prevState.model, '→', state.model);
  }
});

// 取消订阅
unsubscribe();
```

---

## AppState 结构

AppState 包含以下主要部分：

```typescript
interface AppState {
  // 核心设置
  model: string;
  settings: ModelSettings;

  // UI 状态
  ui: UIState;
  theme: Theme;

  // 对话状态
  messages: Message[];
  conversationId: string;

  // 认证状态
  auth: AuthState;

  // MCP 状态
  mcpServers: MCPServers;

  // 工具状态
  tools: ToolState;

  // ... 450+ 更多字段
}
```

---

## 常用状态字段

### 模型设置

```typescript
interface ModelSettings {
  model: string;                    // 模型名称: 'opus', 'sonnet', 'haiku'
  temperature: number;              // 温度: 0-1
  maxTokens: number;                // 最大 token 数
  topP: number;                     // top-p 采样
  topK: number;                     // top-k 采样
  systemPrompt: string;             // 系统提示词
}
```

使用示例：

```typescript
const model = useAppState(state => state.model);
const temperature = useAppState(state => state.settings.temperature);
const systemPrompt = useAppState(state => state.settings.systemPrompt);
```

### UI 状态

```typescript
interface UIState {
  sidebarOpen: boolean;
  currentScreen: 'repl' | 'doctor' | 'resume';
  isLoading: boolean;
  compactMode: boolean;
}
```

使用示例：

```typescript
const currentScreen = useAppState(state => state.ui.currentScreen);
const isLoading = useAppState(state => state.ui.isLoading);
```

### 消息状态

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'tool_result';
  content: string;
  timestamp: number;
  // ... 更多字段
}

interface AppState {
  messages: Message[];
  isStreaming: boolean;
}
```

使用示例：

```typescript
const messages = useAppState(state => state.messages);
const isStreaming = useAppState(state => state.isStreaming);

// 获取最新消息
const latestMessage = useAppState(
  state => state.messages[state.messages.length - 1]
);
```

### 认证状态

```typescript
interface AuthState {
  isAuthenticated: boolean;
  apiKey?: string;
  user?: User;
}
```

使用示例：

```typescript
const isAuthenticated = useAppState(state => state.auth.isAuthenticated);
```

### 主题

```typescript
interface Theme {
  name: 'light' | 'dark' | 'auto';
  colors: ThemeColors;
}
```

使用示例：

```typescript
const themeName = useAppState(state => state.theme.name);
```

---

## 状态更新模式

### 简单更新

```typescript
setAppState({ model: 'opus' });
```

### 嵌套更新

```typescript
setAppState(state => ({
  settings: {
    ...state.settings,
    temperature: 0.8
  }
}));
```

### 数组更新

```typescript
// 添加消息
setAppState(state => ({
  messages: [...state.messages, newMessage]
}));

// 清空消息
setAppState({ messages: [] });
```

---

## 相关文档

- [架构分析](../../PROJECT_ANALYSIS.md#状态管理) - AppState 架构详解
- [模块开发指南](../module-development.md#如何添加新组件) - 组件中使用 AppState
