# 2. React Compiler Runtime Shim 策略

| 状态 | 日期 |
|------|------|
| 已接受 | 2026-03-31 |

## 上下文

泄露的源代码中，**所有 `.tsx` 文件都是 React Compiler 的输出**，而不是原始源代码。这些文件都包含：

```typescript
import { c as $$c } from "react/compiler-runtime";
```

`react/compiler-runtime` 是 React Compiler 内部使用的模块，不是公开的 API，也没有发布到 npm。

## 决策

**创建三层 shim 系统来处理 `react/compiler-runtime` 依赖：**

1. **运行时 Shim** (`src/_external/preload.ts`) - Bun 插件在运行时解析导入
2. **构建时 Shim** (`scripts/build-external.ts`) - 构建插件处理相同的导入
3. **TypeScript Shim** (`src/types/react-compiler-runtime.d.ts` + `tsconfig.json` 路径映射) - 类型声明

## 后果

### 正面
- 无需修改 100+ 个 `.tsx` 文件中的导入语句
- 保持原始代码结构不变
- 运行时和构建时行为一致
- TypeScript 类型检查可以正常工作

### 负面
- Shim 系统增加了一层抽象
- 如果 React Compiler 输出格式变化，需要更新 shim
- 无法利用 React Compiler 的实际优化（只是空操作 shim）

## Shim 实现

### 运行时 Shim (`preload.ts`)
```typescript
const reactCompilerRuntimeShim = {
  c: (size: number) => new Array(size).fill(Symbol.for("react.memo_cache_sentinel")),
};
```

### 类型声明
```typescript
declare module 'react/compiler-runtime' {
  export function c(size: number): any[];
}
```

## 备选方案

考虑过但拒绝的方案：
1. **批量修改所有文件** - 删除导入并替换调用，但这会破坏 git 历史
2. **使用实际的 React Compiler** - 缺少原始源代码，无法重新编译
3. **使用别名到空模块** - 会导致运行时错误

## 相关决策
- [0001 - 使用 Bun 运行时](./0001-use-bun-runtime.md)
- [0004 - 类型错误处理策略](./0004-type-error-handling-strategy.md)
