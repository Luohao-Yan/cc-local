<div align="center">

# Claude Code Local

**基于 Claude Code 重构的本地 CLI 工具，支持第三方兼容 Anthropic API 的 LLM 服务**

[![TypeScript](https://img.shields.io/badge/TypeScript-512K%2B_lines-3178C6?logo=typescript&logoColor=white)](#技术栈)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun&logoColor=white)](#技术栈)
[![React + Ink](https://img.shields.io/badge/UI-React_%2B_Ink-61DAFB?logo=react&logoColor=black)](#技术栈)

</div>

---

## 特性

- 🔌 支持任何兼容 Anthropic API 格式的第三方 LLM（豆包、DeepSeek、通义千问等），无需 Anthropic 账号
- 🚀 完整的 Claude Code 终端交互体验：REPL、工具调用、MCP 集成
- 📦 可打包为单文件，全局安装后在任意目录使用
- 🇨🇳 国内网络友好，内置镜像源配置

---

## 目录

- [快速开始](#快速开始)
- [全局安装](#全局安装在任意目录使用)
- [使用方法](#使用方法)
- [环境变量说明](#环境变量说明)
- [构建打包](#构建打包)
- [项目结构](#项目结构)
- [工作原理](#工作原理)
- [技术栈](#技术栈)
- [常见问题](#常见问题)
- [致谢](#致谢)
- [免责声明](#免责声明)

---

## 快速开始

### 1. 安装 Bun

项目运行在 [Bun](https://bun.sh/) (v1.1+) 上：

```bash
# macOS 推荐使用 Homebrew
brew install bun

# 或通过 npm 安装
npm install -g bun

# 或使用官方脚本（国内可能较慢）
curl -fsSL https://bun.sh/install | bash
```

### 2. 克隆项目并安装依赖

```bash
git clone https://github.com/Luohao-Yan/cc-local.git
cd cc-local

# 国内用户推荐使用镜像源加速
bun install --registry https://registry.npmmirror.com
```

### 3. 配置 LLM API

复制配置模板并填入你的 API 信息：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 第三方 LLM API 配置（以豆包为例）
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/coding
ANTHROPIC_MODEL=doubao-seed-2.0-code

# 跳过安装方式检查
DISABLE_INSTALLATION_CHECKS=1
```

> 💡 也支持原版 Anthropic API：只需设置 `ANTHROPIC_API_KEY=sk-ant-...`，无需设置 `ANTHROPIC_BASE_URL`。

### 4. 启动

```bash
bun run start
```

你应该能看到 Claude Code 的终端界面，可以直接开始对话。

---

## 全局安装（在任意目录使用）

不想每次都进项目目录？可以打包后注册为全局命令 `cc`：

```bash
# 1. 打包成单文件
bun run build

# 2. 添加执行权限
chmod +x dist/cli.js

# 3. 创建全局软链接（需要 sudo 密码）
sudo ln -sf $(pwd)/dist/cli.js /usr/local/bin/cc
```

然后把环境变量写入 shell 配置文件（永久生效）：

```bash
# zsh 用户（macOS 默认）
cat >> ~/.zshrc << 'EOF'
export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_BASE_URL="https://your-api-endpoint.com/api"
export ANTHROPIC_MODEL="your-model-name"
export DISABLE_INSTALLATION_CHECKS=1
EOF
source ~/.zshrc

# bash 用户
# 将上面的 ~/.zshrc 替换为 ~/.bashrc
```

之后在任意目录直接运行：

```bash
cc
```

---

## 使用方法

```bash
# 启动交互式 REPL
bun run start
# 全局安装后等价于：cc

# 查看版本
bun run start -- --version

# 查看帮助
bun run start -- --help

# 单次提问（适合脚本/CI，输出结果后退出）
bun run start -- --print "解释这个项目的架构"

# 最小化启动（跳过 hooks、plugins、auto-memory）
bun run start -- --bare

# 指定系统提示词
bun run start -- --system-prompt "你是一个 Go 语言专家"

# 指定模型
bun run start -- --model sonnet
```

---

## 环境变量说明

| 变量 | 必填 | 说明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | LLM 服务的 API Key |
| `ANTHROPIC_BASE_URL` | 第三方 API 必填 | API 端点地址，使用原版 Anthropic 时无需设置 |
| `ANTHROPIC_MODEL` | 否 | 模型名称，不设置则使用默认模型 |
| `DISABLE_INSTALLATION_CHECKS` | 否 | 设为 `1` 跳过安装方式检查警告 |

### 已验证的第三方 LLM 服务

| 服务商 | `ANTHROPIC_BASE_URL` | `ANTHROPIC_MODEL` 示例 |
|---|---|---|
| 豆包（火山引擎） | `https://ark.cn-beijing.volces.com/api/coding` | `doubao-seed-2.0-code` |

> 欢迎提交 PR 补充更多已验证的服务商。

---

## 构建打包

将项目打包为单个 JS 文件：

```bash
# 打包到 dist/cli.js（约 22MB）
bun run build

# 运行打包产物
bun dist/cli.js

# 查看帮助
bun dist/cli.js --help
```

---

## 项目结构

```
.
├── src/
│   ├── entrypoints/cli.tsx   # 进程入口
│   ├── main.tsx              # Commander CLI 配置，REPL 启动
│   ├── commands.ts           # 斜杠命令注册
│   ├── tools.ts              # 工具注册（Bash, Edit, Read 等）
│   ├── Tool.ts               # 工具基础类型定义
│   ├── query.ts              # LLM 查询引擎
│   ├── ink/                  # 内置 Ink 终端渲染器
│   ├── components/           # React 终端 UI 组件
│   ├── screens/              # 全屏 UI（REPL, Doctor, Resume）
│   ├── services/             # API 客户端, MCP, 分析, 压缩
│   ├── hooks/                # React Hooks
│   ├── utils/                # 工具函数
│   ├── types/                # 重构的类型定义
│   └── _external/            # 构建兼容层
│       ├── preload.ts        # 运行时 MACRO + bun:bundle shim
│       ├── globals.d.ts      # MACRO 类型声明
│       └── shims/            # 内部私有包的 stub 模块
├── scripts/
│   └── build-external.ts     # Bun.build() 构建脚本（feature flags + defines）
├── .env.example              # 环境变量配置模板
├── package.json
├── tsconfig.json
└── bunfig.toml               # Bun 预加载配置 + .md text loader
```

---

## 工作原理

原版 Claude Code 依赖 Bun 的 `bun:bundle` 模块实现编译时 feature flags，以及 `MACRO.*` 全局变量实现构建时常量。本项目提供了：

1. **`bunfig.toml` + `preload.ts`** — 注册 Bun 插件，在运行时解析 `import { feature } from 'bun:bundle'`，并定义 `MACRO.VERSION` 等全局变量。
2. **`scripts/build-external.ts`** — `Bun.build()` 构建脚本，通过插件替换 `bun:bundle`，通过 `define` 注入 `MACRO.*`，将私有包标记为 external。90+ 个内部 feature flags 全部禁用，仅启用少量安全 flags。
3. **`src/_external/shims/`** — 为 `@ant/*` 内部包和原生 NAPI 插件提供的轻量 no-op 模块。
4. **重构的类型文件** — `src/types/message.ts`、`src/types/tools.ts` 等泄露源码中缺失的高引用模块。

### 第三方 API 适配

本项目在原版基础上增加了第三方 API 支持：

- 检测到 `ANTHROPIC_BASE_URL` 指向非 Anthropic 地址时，自动跳过 OAuth 认证、preflight 连通性检查和 API Key 审批流程
- API Key 通过 Anthropic SDK 的标准 `x-api-key` header 传递，兼容所有实现了 Anthropic Messages API 的服务

---

## 技术栈

| 分类 | 技术 |
|---|---|
| 语言 | [TypeScript](https://www.typescriptlang.org/) (strict) |
| 运行时 | [Bun](https://bun.sh) |
| 终端 UI | [React](https://react.dev) + [Ink](https://github.com/vadimdemedes/ink) |
| CLI 解析 | [Commander.js](https://github.com/tj/commander.js) (extra-typings) |
| Schema 校验 | [Zod](https://zod.dev) |
| 协议 | [MCP SDK](https://modelcontextprotocol.io) · LSP |
| API | [Anthropic SDK](https://docs.anthropic.com) |

---

## 常见问题

### `bun install` 卡住或很慢

国内网络访问 npm 源较慢，使用镜像源：

```bash
bun install --registry https://registry.npmmirror.com
```

或在 `bunfig.toml` 中永久配置：

```toml
[install]
registry = "https://registry.npmmirror.com"
```

### 启动时提示 "Unable to connect to Anthropic services"

使用第三方 API 时，确保 `.env` 中正确设置了 `ANTHROPIC_BASE_URL`。项目会自动跳过对 `api.anthropic.com` 的连通性检查。

### 启动时提示 "Not logged in · Please run /login"

确保 `.env` 中同时设置了 `ANTHROPIC_API_KEY` 和 `ANTHROPIC_BASE_URL`。使用第三方 API 时不需要登录 Anthropic 账号。

### 提示 "Claude Code has switched from npm to native installer"

在 `.env` 中添加 `DISABLE_INSTALLATION_CHECKS=1` 即可消除。

### 全局安装后 `cc` 命令找不到

确认软链接创建成功：

```bash
ls -la /usr/local/bin/cc
```

如果使用的是 Apple Silicon Mac，也可以链接到：

```bash
sudo ln -sf $(pwd)/dist/cli.js /opt/homebrew/bin/cc
```

---

## 致谢

本项目基于 [@weikma](https://github.com/weikma) 的出色工作。感谢原始重构项目：

- **原始仓库**: [weikma/claude-code-rebuilt](https://github.com/weikma/claude-code-rebuilt)

---

## 免责声明

**Claude Code 的所有原始源代码均为 [Anthropic, PBC](https://www.anthropic.com/) 的知识产权。** 本仓库基于意外泄露的源代码，**仅供研究、教育和存档目的使用**。

- 本项目不附带任何许可证。不授予任何商业用途的使用、修改、分发或创建衍生作品的权限。
- 本项目为独立重构工作，**与 Anthropic 无任何关联、认可或赞助关系**。
- 如果您是 Anthropic 的代表并希望移除此仓库，请提交 issue 或直接联系维护者。
