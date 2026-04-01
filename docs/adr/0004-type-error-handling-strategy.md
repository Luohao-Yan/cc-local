# 4. 类型错误处理策略

| 状态 | 日期 |
|------|------|
| 已接受 | 2026-03-31 |

## 上下文

泄露的源代码缺少大量类型定义：
- 内部 `@ant/*` 包没有类型声明
- 某些核心模块（如 `src/types/message.ts`）缺失
- React Compiler 输出的代码类型信息不完整
- 原生 NAPI 模块没有类型定义

这导致 `bun run typecheck` 输出大量错误。

## 决策

**采用"允许类型错误存在"的策略，因为这些错误不影响运行时：**

1. **不尝试修复所有类型错误** - 大多数错误是由于缺少原始类型定义
2. **使用 `// @ts-ignore`** - 针对特定的、阻塞性的类型错误
3. **添加最小类型声明** - 仅在必要时在 `src/types/` 下添加类型
4. **保持 `strict: true`** - 继续使用严格模式，但容忍现有错误

## 后果

### 正面
- 无需花费大量时间重建完整类型系统
- Bun 可以直接运行代码，类型错误不影响运行时
- 保持 TypeScript 严格模式的好处（对于新代码）

### 负面
- `bun run typecheck` 会输出大量错误（预期行为）
- 新贡献者可能会困惑
- IDE 中会显示红色波浪线

## 类型错误处理指南

### 何时添加类型声明
- 当某个模块被大量其他模块依赖时
- 当类型错误阻塞了关键功能时
- 在 `src/types/` 下创建，如 `src/types/missing-module.d.ts`

### 何时使用 `// @ts-ignore`
- 针对单行、非关键的类型错误
- 添加注释说明原因：`// @ts-ignore - 缺少 @ant/message 类型定义`

### 何时使用 `any`
- 对于无法推断类型的变量
- 作为临时解决方案，而非最终方案

## tsconfig.json 配置

保持严格模式，但放宽某些检查：
```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "noImplicitAny": false  // 仅在调试时临时放宽
  }
}
```

## 备选方案

考虑过但拒绝的方案：
1. **关闭严格模式** - 会失去 TypeScript 的大部分好处
2. **全面重建类型系统** - 需要数周时间，且没有原始类型参考
3. **使用 `any`  everywhere** - 会让 TypeScript 变成 JavaScript

## 相关决策
- [0002 - React Compiler Runtime Shim](./0002-react-compiler-runtime-shim.md)
- [0005 - 内部包 Shim 策略](./0005-internal-package-shim-strategy.md)
