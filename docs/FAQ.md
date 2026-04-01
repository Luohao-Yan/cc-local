# 常见问题解答

> 关于 Claude Code Rebuilt 项目的常见问题解答

---

## 目录

1. [项目基础](#项目基础)
2. [开发环境](#开发环境)
3. [运行问题](#运行问题)
4. [类型错误](#类型错误)
5. [功能开发](#功能开发)
6. [架构相关](#架构相关)

---

## 项目基础

### Q: 这个项目是什么？

A: Claude Code Rebuilt 是 Anthropic Claude Code 的重构版本，基于泄露的源代码重建。它是一个功能强大的 AI 辅助编程工具，使用 Bun 运行时、React + Ink 终端 UI，支持工具调用、命令系统、MCP 集成等。

### Q: 为什么所有 .tsx 文件都有 `react/compiler-runtime` 导入？

A: 这些文件是 **React Compiler** 的输出，不是原始源代码。原始源代码经过 React Compiler 编译后生成了这些文件，因此都包含运行时导入。项目通过三层 shim 系统来处理这个问题：
- 运行时 shim (`src/_external/preload.ts`)
- 构建时 shim (`scripts/build-external.ts`)
- TypeScript 类型声明 (`src/types/react-compiler-runtime.d.ts`)

### Q: 项目的原始源代码在哪里？

A: 原始源代码未包含在泄露的内容中。当前仓库中的是 React Compiler 编译后的输出。

### Q: 可以在生产环境使用吗？

A: 不建议。这是基于泄露源码的重建项目，主要用于学习和研究目的。

---

## 开发环境

### Q: 必须使用 Bun 吗？可以用 Node.js 吗？

A: **必须使用 Bun**。项目深度依赖 Bun 的特性：
- Bun 的包管理
- Bun 的运行时 API
- Bun 的构建系统
- 预加载机制 (`bunfig.toml`)

Node.js 无法直接运行此项目。

### Q: 支持哪些 Bun 版本？

A: 建议使用 **Bun v1.3.11 或更高版本**。

### Q: 如何安装 Bun？

A:
```bash
curl -fsSL https://bun.sh/install | bash
```

### Q: `bun install` 失败怎么办？

A: 尝试清理缓存后重新安装：
```bash
rm -rf node_modules bun.lock .bun
bun install
```

### Q: 需要设置 API Key 吗？

A: 是的，需要设置 Anthropic API Key：
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

---

## 运行问题

### Q: 启动时提示 `react/compiler-runtime` 模块找不到？

A: 确保以下文件都正确配置：

1. `bunfig.toml` 存在且包含 `preload = "./src/_external/preload.ts"`
2. `src/_external/preload.ts` 包含 react/compiler-runtime shim
3. 清理缓存后重新运行：
   ```bash
   rm -rf .bun
   bun run start
   ```

### Q: 启动后没有任何输出就退出了？

A: 排查步骤：
```bash
# 1. 检查 Bun 版本
bun --version

# 2. 检查预加载是否工作
bun run src/entrypoints/cli.tsx --version

# 3. 启用调试输出
NODE_DEBUG=* bun run start

# 4. 检查是否有语法错误
bun build src/entrypoints/cli.tsx
```

### Q: 如何运行开发版本？

A:
```bash
# 交互式 REPL
bun run start

# 带参数
bun run start -- --help
bun run start -- --version
bun run start -- --print "hello"
```

### Q: 如何构建生产版本？

A:
```bash
bun run build
# 输出到 dist/cli.js

# 运行构建后的版本
bun dist/cli.js --version
```

### Q: REPL 启动后很卡顿？

A: 可能的原因：
- 上下文太大 - 使用 `/compact` 命令压缩
- 消息太多 - 清除历史消息
- 启用了太多调试日志 - 减少 `DEBUG=` 范围

---

## 类型错误

### Q: `bun run typecheck` 有很多错误怎么办？

A: **大部分类型错误不影响运行**。原因：
- 缺少原始类型定义
- 某些内部模块 (`@ant/*`) 的类型缺失
- React Compiler 输出的代码类型信息不完整

解决方案：
- 可以忽略非关键错误
- 使用 `// @ts-ignore` 注释特定行
- 在 `src/types/` 下添加缺失的类型声明

### Q: 如何忽略特定的类型错误？

A:
```typescript
// @ts-ignore - 缺少类型定义
const value = someFunction();

// 或者使用 any
const value: any = something;
```

### Q: `Module '"..."' has no exported member '...'` 错误？

A: 这是常见的类型缺失错误。解决方案：
1. 使用 `// @ts-ignore` 忽略
2. 在 `src/types/` 下创建模块声明
3. 使用类型断言 `as any`

### Q: 类型错误会影响运行吗？

A: **不会**。Bun 直接运行 TypeScript/JavaScript，不依赖类型检查结果。类型错误只在 `bun run typecheck` 时显示。

---

## 功能开发

### Q: 如何添加新工具？

A: 简要步骤：
1. 创建 `src/tools/MyNewTool/MyNewTool.ts`
2. 使用 Zod 定义输入输出 Schema
3. 实现 `call()` 方法
4. 在 `src/tools.ts` 中注册

详细指南请参考 [module-development.md](./module-development.md)

### Q: 如何添加新命令？

A: 简要步骤：
1. 创建 `src/commands/my-command/index.ts`
2. 选择命令类型 (`local` / `local-jsx` / `prompt`)
3. 实现 `run()` 方法
4. 在 `src/commands.ts` 中注册

详细指南请参考 [module-development.md](./module-development.md)

### Q: 如何添加新组件？

A: 简要步骤：
1. 创建 `src/components/MyComponent.tsx`
2. 使用 React + Ink 组件
3. 使用 `useAppState` 访问全局状态
4. 在需要的地方导入使用

详细指南请参考 [module-development.md](./module-development.md)

### Q: 工具和命令的区别是什么？

A:
| 特性 | 工具 (Tools) | 命令 (Commands) |
|------|-------------|-----------------|
| 调用者 | AI 模型 | 用户 (斜杠命令) |
| 前缀 | 无 (模型调用) | `/` (如 `/help`) |
| 定义位置 | `src/tools/` | `src/commands/` |
| Schema | Zod 必需 | 可选 (参数解析) |
| 权限检查 | `checkPermissions()` | `isEnabled()` |

### Q: 如何测试我的更改？

A:
1. 运行类型检查：`bun run typecheck`
2. 验证启动：`bun run start -- --version`
3. 在 REPL 中测试功能
4. 如适用，添加调试日志

### Q: 功能标志 (Feature Flags) 在哪里？

A: 在 `scripts/build-external.ts` 中的 `ENABLED_FEATURES` 和 `EXTERNAL_DISABLED_FEATURES` 数组。项目有 91 个功能标志，当前仅启用了 3 个。

---

## 架构相关

### Q: 查询引擎的工作原理是什么？

A: 查询引擎采用 **无限循环架构**：
1. 接收用户输入
2. 发送给 AI 模型
3. 模型可能返回工具调用
4. 执行工具并返回结果
5. 重复直到模型生成最终答案

核心在 `src/query.ts` 的 `queryLoop()` 函数。

### Q: AppState 有多大？

A: AppState 有 **450+ 字段**，是全局状态管理的核心。使用 Zustand 风格的选择器模式访问。

### Q: Ink 渲染器是自定义的吗？

A: 是的，项目包含 **52 个文件** 的自定义 Ink 实现，位于 `src/ink/` 目录。

### Q: 有多少工具和命令？

A:
- **工具**: 50+ 个，位于 `src/tools/`
- **命令**: 100+ 个，位于 `src/commands/`

详细列表请参考 [PROJECT_ANALYSIS.md](../PROJECT_ANALYSIS.md)

### Q: MCP 是什么？

A: MCP (Model Context Protocol) 是一个开放协议，用于连接 AI 助手与外部数据源和工具。项目支持 MCP 集成。

### Q: 插件系统可以做什么？

A: 插件可以提供：
- Skills (提示模板)
- Hooks (生命周期钩子)
- MCP 服务器

内置插件在 `src/plugins/builtinPlugins.ts` 中注册。

---

## 更多帮助

如果以上 FAQ 没有解决你的问题：

1. 查看 [调试指南](./debugging.md) - 详细的调试技巧
2. 查看 [开发指南](../DEVELOPING.md) - 开发流程说明
3. 查看 [模块开发指南](./module-development.md) - 功能开发教程
4. 查看 [架构分析](../PROJECT_ANALYSIS.md) - 深入理解系统架构
5. 检查 Git 历史 - 了解最近的变更
