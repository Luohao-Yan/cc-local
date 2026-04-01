# 1. 使用 Bun 运行时

| 状态 | 日期 |
|------|------|
| 已接受 | 2026-03-31 |

## 上下文

泄露的 Claude Code 源代码深度依赖 Bun 特有的功能和 API。原始代码使用了：

- `bun:bundle` 模块用于编译时功能标志
- Bun 的预加载机制 (`preload`)
- Bun 的包管理和解析
- Bun 的运行时 API

## 决策

**使用 Bun 作为唯一运行时，不支持 Node.js。**

## 后果

### 正面
- 无需修改代码以兼容 Node.js API
- 可以利用 Bun 的性能优势
- 保持与原始代码的行为一致
- Bun 的 TypeScript 支持无需额外构建步骤

### 负面
- 用户必须安装 Bun 才能运行项目
- 不能使用 Node.js 生态系统中的某些工具
- 与现有的 Node.js 部署流程不兼容

## 备选方案

考虑过但拒绝的方案：
1. **移植到 Node.js** - 需要大量工作，替换所有 Bun 特有的 API
2. **双运行时支持** - 维护成本过高，可能导致行为不一致

## 相关决策
- [0002 - React Compiler Runtime Shim](./0002-react-compiler-runtime-shim.md)
- [0003 - Feature Flag 策略](./0003-feature-flag-strategy.md)
