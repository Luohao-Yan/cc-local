# Claude Code Rebuilt - 开发指南

> 本文档指导你如何在 Claude Code Rebuilt 项目上进行二次开发

---

## 目录

1. [环境准备](#环境准备)
2. [项目结构](#项目结构)
3. [开发工作流](#开发工作流)
4. [调试技巧](#调试技巧)
5. [常见问题](#常见问题)

---

## 环境准备

### 必需工具

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| **Bun** | v1.3.11+ | JavaScript/TypeScript 运行时 |
| **Git** | 任意 | 版本控制 |
| **编辑器** | 任意 | 推荐 VS Code / WebStorm |

### 安装步骤

1. **安装 Bun**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **克隆项目**
   ```bash
   git clone <repository-url>
   cd claude-code-rebuilt
   ```

3. **安装依赖**
   ```bash
   bun install
   ```

4. **设置 API Key**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

5. **验证安装**
   ```bash
   bun run start -- --version
   # 应该输出: 99.0.0-external (Claude Code)
   ```

---

## 项目结构

### 核心目录说明

```
claude-code-rebuilt/
├── src/
│   ├── entrypoints/          # 入口点
│   │   └── cli.tsx           # 主入口
│   ├── main.tsx               # CLI 设置和 REPL 启动
│   ├── commands.ts            # 命令注册表
│   ├── tools.ts               # 工具注册表
│   ├── Tool.ts                # 工具类型定义
│   ├── query.ts               # 查询引擎核心
│   │
│   ├── ink/                   # 自定义 Ink 渲染器 (52 文件)
│   ├── components/            # React 组件 (146+)
│   ├── screens/               # 全屏 UI
│   ├── services/              # 核心服务 (41+)
│   ├── hooks/                 # React Hooks (87+)
│   ├── utils/                 # 工具函数 (335+)
│   ├── tools/                 # 工具实现 (50+)
│   ├── commands/              # 命令实现 (100+)
│   ├── skills/                # Skills 系统
│   ├── plugins/               # 插件系统
│   ├── state/                 # 状态管理
│   ├── context/               # React Context
│   ├── types/                 # 类型定义
│   ├── constants/             # 常量
│   └── _external/             # 构建兼容层
│
├── scripts/
│   └── build-external.ts      # 构建脚本
│
├── docs/                      # 文档目录
│   ├── module-development.md  # 模块开发指南
│   ├── debugging.md           # 调试指南
│   ├── FAQ.md                # 常见问题
│   ├── adr/                  # 架构决策记录
│   └── api/                  # API 参考
│
├── package.json
├── tsconfig.json
├── bunfig.toml
└── DEVELOPING.md              # 本文档
```

### 关键文件速查

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/main.tsx` | 785KB | 主 CLI 设置 |
| `src/query.ts` | - | 查询引擎核心 |
| `src/tools.ts` | 390 | 工具注册表 |
| `src/commands.ts` | 755 | 命令注册表 |
| `src/utils/auth.ts` | 65KB | 认证逻辑 |
| `src/_external/preload.ts` | 28 | 运行时 shim |

---

## 开发工作流

### 1. 运行开发版本

```bash
# 启动交互式 REPL
bun run start

# 启动并传递参数
bun run start -- --help
bun run start -- --print "hello"
bun run start -- --bare
```

### 2. 类型检查

```bash
# 运行 TypeScript 类型检查
bun run typecheck
```

### 3. 构建生产版本

```bash
# 构建到 dist/cli.js
bun run build

# 运行构建后的版本
bun dist/cli.js --version
```

### 4. 代码规范

项目使用严格的 TypeScript 配置：

- ✅ `strict: true`
- ✅ 严格的空值检查
- ✅ 无隐式 `any`

### 5. Git 工作流

```bash
# 创建功能分支
git checkout -b feature/my-feature

# 开发完成后提交
git add .
git commit -m "feat: add my feature"

# 推送到远程
git push origin feature/my-feature
```

---

## 调试技巧

### 1. 启用调试日志

```bash
# 设置调试环境变量
export DEBUG=*
bun run start
```

### 2. 使用 console.log 调试

在代码中添加：
```typescript
import { logForDebugging } from './utils/debug.js';

logForDebugging('My debug message', { data: 'value' });
```

### 3. 启动分析器

项目内置了启动分析器，关键检查点会自动记录。

### 4. 常见调试场景

#### 调试工具执行

在 `src/tools/<YourTool>/<YourTool>.ts` 中添加断点或日志。

#### 调试命令执行

在 `src/commands/<your-command>/index.ts` 中添加日志。

#### 调试查询引擎

在 `src/query.ts` 的 `queryLoop()` 函数中添加日志。

---

## 常见问题

### Q: 如何修复 `react/compiler-runtime` 错误？

A: 项目已经通过 `src/_external/preload.ts` 提供了 shim，确保 `bunfig.toml` 正确配置了预加载。

### Q: 类型检查报错很多怎么办？

A: 很多类型错误是由于缺少原始类型定义导致的，不影响运行。可以使用 `// @ts-ignore` 忽略特定错误。

### Q: 如何添加新的功能标志？

A: 在 `scripts/build-external.ts` 中修改 `ENABLED_FEATURES` 或 `EXTERNAL_DISABLED_FEATURES` 数组。

### Q: Bun 安装依赖失败？

A: 尝试：
```bash
rm -rf node_modules bun.lock
bun install
```

### Q: 如何测试我的更改？

A:
1. 运行 `bun run typecheck` 确保类型正确
2. 运行 `bun run start -- --version` 确保能启动
3. 在 REPL 中测试你的功能

---

## 下一步

- 阅读 [模块开发指南](./docs/module-development.md) 学习如何添加新功能
- 阅读 [调试指南](./docs/debugging.md) 了解更多调试技巧
- 查看 [常见问题](./docs/FAQ.md) 获取更多帮助
- 参考 [架构分析](./PROJECT_ANALYSIS.md) 深入理解项目架构
