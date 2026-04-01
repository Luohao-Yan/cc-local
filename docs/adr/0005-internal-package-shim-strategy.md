# 5. 内部包 Shim 策略

| 状态 | 日期 |
|------|------|
| 已接受 | 2026-03-31 |

## 上下文

原始代码依赖多个 Anthropic 内部包和原生模块：
- `@ant/*` 命名空间下的私有包
- 原生 NAPI 插件 (`@ant/color-darwin-arm64`, `@ant/ripgrep`)
- 内部工具库 (`@ant/benchmark`, `@ant/telemetry`)

这些包都没有公开发布，也无法获取源代码。

## 决策

**创建轻量级的 shim/stub 包来替代内部依赖：**

1. **空操作 shim** - 导出空对象、空函数或默认值
2. **类型-only shims** - 仅提供类型声明，无实际实现
3. **部分实现** - 对于关键功能，提供最小可行实现

Shim 位于 `src/_external/shims/` 目录。

## 后果

### 正面
- 代码可以正常导入和运行
- 无需修改原始导入语句
- 可以通过 feature flag 控制是否使用 shimmed 功能

### 负面
- Shimmed 的功能不可用
- 某些代码路径可能不会按预期工作
- 需要维护 shim 与原始代码的兼容性

## Shim 实现模式

### 模式 1: 空对象 Shim
```typescript
// src/_external/shims/@ant/telemetry.ts
export default {};
export const logEvent = () => {};
export const trackMetric = () => {};
```

### 模式 2: 默认值 Shim
```typescript
// src/_external/shims/@ant/config.ts
export const getConfig = () => ({});
export const saveConfig = () => {};
```

### 模式 3: 类型-only Shim
```typescript
// src/types/ant-telemetry.d.ts
declare module '@ant/telemetry' {
  export function logEvent(name: string, data?: any): void;
}
```

## Shimmed 包列表

| 包 | 类型 | 说明 |
|----|------|------|
| `@ant/telemetry` | 空操作 | 遥测数据收集 |
| `@ant/benchmark` | 空操作 | 性能基准测试 |
| `@ant/config` | 默认值 | 配置管理 |
| `@ant/color-darwin-arm64` | 部分实现 | 颜色差异计算 |
| `@ant/ripgrep` | 类型-only | 文件搜索 |
| `@ant/keyring` | 空操作 | 密钥链访问 |

## 备选方案

考虑过但拒绝的方案：
1. **反编译内部包** - 法律和道德风险
2. **重新实现所有功能** - 工作量巨大，且没有规格说明
3. **删除所有内部包引用** - 需要大量修改原始代码

## 相关决策
- [0003 - Feature Flag 策略](./0003-feature-flag-strategy.md)
- [0004 - 类型错误处理策略](./0004-type-error-handling-strategy.md)
