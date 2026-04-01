# 调试指南

> 本文档指导你如何调试 Claude Code Rebuilt 项目

---

## 目录

1. [调试基础](#调试基础)
2. [日志系统](#日志系统)
3. [常见问题排查](#常见问题排查)
4. [性能分析](#性能分析)
5. [TypeScript 类型错误处理](#typescript-类型错误处理)

---

## 调试基础

### 1. 启用调试模式

```bash
# 启动调试模式
export DEBUG=*
bun run start

# 或者只启用特定模块的调试
export DEBUG=claude:*
bun run start
```

### 2. 使用 console.log 调试

在代码中添加调试日志：

```typescript
// 简单日志
console.log('调试信息', data);

// 使用项目的调试工具
import { logForDebugging } from '../utils/debug.js';

logForDebugging('我的调试消息', {
  key: 'value',
  complex: object,
});
```

### 3. 使用启动分析器

项目内置了启动分析器，在 `src/utils/startupProfiler.ts` 中：

```typescript
import { profileCheckpoint } from '../utils/startupProfiler.js';

profileCheckpoint('my_module_start');
// ... 你的代码
profileCheckpoint('my_module_end');
```

### 4. 调试 REPL

在 REPL 中使用 `/debug` 相关命令（如果可用）：
- `/status` - 查看当前状态
- `/cost` - 查看费用统计
- `/stats` - 查看统计信息

---

## 日志系统

### 日志级别

项目使用多个日志函数：

| 函数 | 说明 | 文件 |
|------|------|------|
| `logError()` | 错误日志 | `src/utils/log.ts` |
| `logEvent()` | 事件日志 | `src/services/analytics/index.ts` |
| `logForDebugging()` | 调试日志 | `src/utils/debug.ts` |

### 使用 logError

```typescript
import { logError } from '../utils/log.js';

try {
  // 可能出错的代码
} catch (error) {
  logError(error as Error);
}
```

### 使用 logForDebugging

```typescript
import { logForDebugging } from '../utils/debug.js';

// 条件调试日志
logForDebugging('工具调用前', { input });
// ... 执行
logForDebugging('工具调用后', { result });
```

### 分析服务日志

分析服务使用队列化日志，避免导入循环：

```typescript
import { logEvent } from '../services/analytics/index.js';

logEvent('my_custom_event', {
  param1: 'value1',
  param2: 'value2',
});
```

---

## 常见问题排查

### 问题 1: 启动失败

**症状**: `bun run start` 没有输出或立即退出

**排查步骤**:

```bash
# 1. 检查 Bun 版本
bun --version

# 2. 检查依赖是否安装
ls -la node_modules/

# 3. 重新安装依赖
rm -rf node_modules bun.lock
bun install

# 4. 检查 preload 是否工作
bun run src/entrypoints/cli.tsx --version

# 5. 查看详细错误
NODE_DEBUG=* bun run start
```

**常见原因**:
- `bunfig.toml` 配置错误
- `src/_external/preload.ts` 语法错误
- 缺少环境变量

---

### 问题 2: TypeScript 类型错误很多

**症状**: `bun run typecheck` 输出大量错误

**排查步骤**:

1. **忽略非关键错误** - 很多错误是由于缺少原始类型定义导致的，不影响运行

2. **使用 @ts-ignore** - 针对特定错误行：
   ```typescript
   // @ts-ignore - 缺少类型定义
   const value = someFunction();
   ```

3. **检查 tsconfig.json** - 确保配置正确

4. **添加类型声明** - 在 `src/types/` 下创建缺失的类型

---

### 问题 3: 工具执行失败

**症状**: 调用工具时没有反应或报错

**排查步骤**:

1. **检查工具注册** - 确认在 `src/tools.ts` 中已添加
2. **检查权限** - `checkPermissions()` 是否返回 `allowed: true`
3. **检查输入验证** - Zod schema 是否匹配
4. **添加调试日志** - 在工具的 `call()` 方法中添加日志

```typescript
async call(input, context: ToolUseContext) {
  console.log('工具输入:', input); // 添加这行
  // ... 原有代码
}
```

---

### 问题 4: 命令无法识别

**症状**: 输入 `/my-command` 提示未知命令

**排查步骤**:

1. **检查命令注册** - 确认在 `src/commands.ts` 中已添加
2. **检查命令名称** - `name` 字段是否正确
3. **检查 `isEnabled()`** - 是否返回 `true`
4. **重新加载** - 某些命令需要重启 REPL

---

### 问题 5: React 组件不渲染

**症状**: 组件没有显示或显示异常

**排查步骤**:

1. **检查 Ink 组件** - 使用正确的 Ink 组件 (`Box`, `Text` 等)
2. **检查布局** - Flexbox 属性是否正确
3. **添加调试** - 在组件中添加简单文本：
   ```typescript
   return (
     <Box>
       <Text>调试文本</Text>
       {/* ... 原有组件 */}
     </Box>
   );
   ```
4. **检查状态** - useAppState 选择器是否正确

---

### 问题 6: react/compiler-runtime 错误

**症状**: 提示找不到 `react/compiler-runtime` 模块

**解决方案**:
1. 确认 `bunfig.toml` 存在且包含 `preload` 配置
2. 确认 `src/_external/preload.ts` 正确导出了 shim
3. 清理并重新运行：
   ```bash
   rm -rf .bun
   bun run start
   ```

---

## 性能分析

### 1. 使用启动分析器

启动分析器自动记录关键检查点的时间：

```typescript
import { profileCheckpoint } from '../utils/startupProfiler.js';

profileCheckpoint('my_checkpoint');
```

### 2. 使用 Bun 的性能分析

```bash
# 运行性能分析
bun --inspect run start

# 或者生成 CPU profile
bun --cpu-prof run start
```

### 3. 常见性能瓶颈

| 瓶颈 | 原因 | 解决方案 |
|------|------|----------|
| 启动慢 | 模块加载多 | 检查动态导入 |
| REPL 卡顿 | 消息太多 | 启用上下文压缩 |
| 内存高 | 状态太大 | 清理不必要的状态 |

---

## TypeScript 类型错误处理

### 策略 1: 忽略不影响运行的错误

很多类型错误是由于缺少原始类型定义导致的，但不影响运行：

```typescript
// 在 tsconfig.json 中可以放宽某些检查
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noImplicitAny": false  // 仅在调试时临时放宽
  }
}
```

### 策略 2: 使用 `any` 绕过

对于无法解决的类型问题：

```typescript
// 使用 any
const value: any = something;

// 使用类型断言
const value = something as SomeType;
```

### 策略 3: 创建类型声明

在 `src/types/` 下创建声明文件：

```typescript
// src/types/missing-module.d.ts
declare module 'missing-module' {
  export function someFunction(): any;
}
```

### 常见类型错误及解决方案

| 错误 | 解决方案 |
|------|----------|
| `Module '"..."' has no exported member '...'` | 添加类型声明或使用 `// @ts-ignore` |
| `Parameter '...' implicitly has an 'any' type` | 添加类型注解或 `: any` |
| `Property '...' does not exist on type '...'` | 使用类型断言 `(obj as any).property` |

---

## 调试工具推荐

### 1. Bun 内置工具

```bash
# 依赖检查
bun pm ls

# 类型检查
bunx tsc --noEmit

# 运行单个文件
bun run src/my-file.ts
```

### 2. REPL 调试命令

在 REPL 中可以使用：
- `/cost` - 查看费用
- `/stats` - 查看统计
- `/status` - 查看状态
- `/compact` - 压缩上下文

---

## 获取帮助

如果以上方法无法解决问题：

1. 查看 [FAQ.md](./FAQ.md) - 常见问题解答
2. 查看 [PROJECT_ANALYSIS.md](../PROJECT_ANALYSIS.md) - 架构分析
3. 检查 Git 历史 - 看看最近的变更
4. 添加更多日志 - 逐步定位问题

---

## 调试检查清单

在提交 issue 或求助前，请确认：

- [ ] 已运行 `bun install`
- [ ] 已运行 `bun run typecheck`
- [ ] 已添加调试日志
- [ ] 已清理缓存 (`rm -rf .bun node_modules`)
- [ ] 已尝试最小复现案例
- [ ] 已记录完整的错误信息
