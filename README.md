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
- 🐣 终端宠物伴侣（/buddy）：18 种物种、5 个稀有度、AI 生成性格、对话反应
- 🤖 Auto Mode 自动模式：AI 安全分类器自动评估操作安全性，安全操作自动执行
- 📦 可打包为单文件，全局安装后在任意目录使用
- 🇨🇳 国内网络友好，内置镜像源配置

---

## 目录

- [快速开始](#快速开始)
- [全局安装](#全局安装在任意目录使用)
- [更新到最新版本](#更新到最新版本)
- [使用方法](#使用方法)
- [环境变量说明](#环境变量说明)
- [多模型配置](#多模型配置)
- [终端宠物伴侣](#终端宠物伴侣buddy)
- [Auto Mode 自动模式](#auto-mode-自动模式)
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
# macOS / Linux（推荐，官方安装脚本）
curl -fsSL https://bun.sh/install | bash

# 或通过 npm 安装（macOS / Windows / Linux 通用）
npm install -g bun

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

> ⚠️ **注意**：Bun 已从 Homebrew core 移除，`brew install bun` 会报错。请使用上述官方脚本或 npm 方式安装。

### 2. 克隆项目并安装依赖

```bash
git clone https://github.com/Luohao-Yan/cc-local.git
cd cc-local

# 国内用户推荐使用镜像源加速
bun install --registry https://registry.npmmirror.com
```

### 3. 配置 LLM API

创建模型配置文件 `~/.claude/models.json`：

```bash
# macOS / Linux
mkdir -p ~/.claude

# Windows (PowerShell)
mkdir -Force "$env:USERPROFILE\.claude"
```

编辑 `~/.claude/models.json`（Windows 为 `%USERPROFILE%\.claude\models.json`）：

```json
{
  "providers": {
    "doubao": {
      "name": "豆包",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/coding",
      "apiKey": "你的API密钥",
      "models": {
        "doubao-seed-2.0-code": {
          "name": "豆包 Seed 2.0 Code",
          "alias": ["doubao"]
        }
      }
    }
  },
  "defaultModel": "doubao",
  "settings": {
    "disableInstallationChecks": true
  }
}
```

> 💡 也支持原版 Anthropic API：只需设置环境变量 `ANTHROPIC_API_KEY=sk-ant-...`，无需创建 `models.json`。
>
> 💡 也可以跳过手动配置，直接启动程序后通过 `/model add` 命令交互式添加。

### 4. 启动

```bash
bun run start
```

你应该能看到 Claude Code 的终端界面，可以直接开始对话。

---

## 全局安装（在任意目录使用）

不想每次都进项目目录？运行安装脚本，自动打包并注册全局命令 `cclocal`：

### macOS / Linux

```bash
bash scripts/install-global.sh
```

> 💡 默认命令名为 `cclocal`（Claude Code Local）。如需自定义命令名，可传参指定：
> ```bash
> bash scripts/install-global.sh mycc
> ```

### Windows

```cmd
scripts\install-global.cmd
```

安装完成后，打开新的终端窗口，在任意目录直接运行：

```bash
cclocal
```

> ⚠️ **注意**：旧版脚本使用 `cc` 作为命令名，但 `cc` 是 macOS/Linux 系统自带的 C 编译器（clang），会导致命令冲突。现已改为 `cclocal`。
>
> 💡 脚本会自动检测 bun 路径、打包项目、创建全局命令。如果检测到旧版 `.env` 配置，会自动迁移到 `~/.claude/models.json`。

---

## 更新到最新版本

当项目有新功能或修复时，需要拉取最新代码并重新构建。

### macOS / Linux

```bash
cd cc-local
git pull origin main
bun install
bun run build
```

### Windows (PowerShell)

```powershell
cd cc-local
git pull origin main
bun install
bun run build
```

更新完成后：
- 如果使用 `bun run start` 启动，会自动构建并运行最新代码
- 如果使用全局命令 `cclocal`，`bun run build` 后全局命令会自动使用更新后的 `dist/cli.js`，无需重新安装

> 💡 `~/.claude/models.json` 配置文件不会被 `git pull` 覆盖，你的模型配置会保留。

---

## 使用方法

```bash
# 启动交互式 REPL
bun run start
# 全局安装后等价于：cclocal

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

> 💡 推荐使用 `~/.claude/models.json` 配置模型，以下环境变量作为备选方案仍然支持。

| 变量 | 必填 | 说明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 否* | LLM 服务的 API Key（使用 `models.json` 配置时无需设置） |
| `ANTHROPIC_BASE_URL` | 否* | API 端点地址（使用 `models.json` 配置时无需设置） |
| `ANTHROPIC_MODEL` | 否 | 模型名称，不设置则使用 `models.json` 中的 `defaultModel` |
| `DISABLE_INSTALLATION_CHECKS` | 否 | 设为 `1` 跳过安装方式检查警告（也可在 `models.json` 的 `settings` 中配置） |

\* 如果未配置 `models.json`，则 `ANTHROPIC_API_KEY` 为必填。

### 已验证的第三方 LLM 服务

| 服务商 | `ANTHROPIC_BASE_URL` | `ANTHROPIC_MODEL` 示例 |
|---|---|---|
| 豆包（火山引擎） | `https://ark.cn-beijing.volces.com/api/coding` | `doubao-seed-2.0-code` |

> 欢迎提交 PR 补充更多已验证的服务商。

---

## 多模型配置

通过 JSON 配置文件 `~/.claude/models.json` 管理多个第三方 LLM Provider 和模型。

### 新用户快速配置

**方式一：交互式添加（推荐）**

启动程序后，在 REPL 中输入：

```
/model add
```

按提示依次输入 API 端点、API Key、模型名称和别名即可。

**方式二：手动编辑配置文件**

创建或编辑 `~/.claude/models.json`（Windows 为 `%USERPROFILE%\.claude\models.json`）：

```json
{
  "providers": {
    "doubao": {
      "name": "豆包",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/coding",
      "apiKey": "你的API密钥",
      "models": {
        "doubao-seed-2.0-code": {
          "name": "豆包 Seed 2.0 Code",
          "alias": ["doubao"]
        }
      }
    }
  },
  "defaultModel": "doubao",
  "settings": {
    "disableInstallationChecks": true
  }
}
```

### 配置文件位置

| 级别 | 路径 | 说明 |
|------|------|------|
| 全局 | `~/.claude/models.json` | 对所有项目生效 |
| 项目级 | `.claude/models.json` | 仅对当前项目生效，同名 Provider 覆盖全局配置 |

### 多 Provider 多模型示例

一个 Provider 下可以配置多个模型，也可以配置多个 Provider：

```json
{
  "providers": {
    "doubao": {
      "name": "豆包",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/coding",
      "apiKey": "你的豆包密钥",
      "models": {
        "doubao-seed-2.0-code": {
          "name": "豆包 Seed 2.0 Code",
          "alias": ["doubao", "seed"]
        },
        "DeepSeek-V3.2": {
          "name": "DeepSeek V3.2",
          "alias": ["deepseek"]
        },
        "kimi-k2.5": {
          "name": "Kimi K2.5",
          "alias": ["kimi"]
        }
      }
    },
    "ollama": {
      "name": "Ollama 本地",
      "baseUrl": "http://localhost:11434/v1",
      "models": {
        "qwen3:32b": {
          "name": "Qwen3 32B",
          "alias": ["qwen"]
        }
      }
    }
  },
  "defaultModel": "doubao",
  "smallFastModel": "qwen"
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `providers` | ✅ | Provider 列表，key 为 Provider ID |
| `providers.*.name` | ✅ | Provider 显示名称 |
| `providers.*.baseUrl` | ✅ | API 端点，必须以 `http://` 或 `https://` 开头 |
| `providers.*.apiKey` | 否 | API 密钥，本地模型（Ollama 等）无需填写 |
| `providers.*.models` | ✅ | 该 Provider 下的模型列表 |
| `providers.*.models.*.name` | ✅ | 模型显示名称 |
| `providers.*.models.*.alias` | 否 | 别名数组，用于快速切换（如 `/model doubao`） |
| `defaultModel` | 否 | 启动时默认使用的模型（别名或模型 ID） |
| `smallFastModel` | 否 | buddy/observer 等场景使用的快速小模型 |
| `settings.disableInstallationChecks` | 否 | 设为 `true` 跳过安装方式检查警告 |

> 💡 **安全建议**：API Key 可以使用 `{env:VARIABLE_NAME}` 语法引用环境变量，例如 `"apiKey": "{env:DOUBAO_API_KEY}"`，避免在配置文件中硬编码敏感凭证。

> ⚠️ 如果使用项目级配置 `.claude/models.json`，建议将其加入 `.gitignore`，防止意外提交敏感信息。

### 模型管理命令

| 命令 | 说明 |
|------|------|
| `/model add` | 交互式添加新的 Provider 和模型，完成后自动验证连通性 |
| `/model list` | 以表格形式展示所有已配置的模型（别名、端点、来源） |
| `/model remove <别名>` | 移除指定模型配置 |
| `/model check` | 对所有已配置模型进行健康检查，展示可用状态 |

### 切换模型

```bash
# 在 REPL 中从菜单选择（推荐）
/model

# 启动时指定（使用别名或模型名）
cclocal --model doubao
cclocal --model qwen

# 在 REPL 中直接指定别名
/model doubao
/model qwen
```

切换时会自动设置对应 Provider 的 API 端点和 API Key，无需手动修改环境变量。

### 从旧版 .env 迁移

如果你之前使用 `.env` 文件配置模型：
- **全局安装用户**：重新运行 `bash scripts/install-global.sh`，安装脚本会自动检测 `.env` 并迁移到 `~/.claude/models.json`
- **手动启动用户**：启动时会收到迁移提示，也可以在 REPL 中运行 `/migrate-models` 命令自动迁移

---

## 终端宠物伴侣（/buddy）

本项目完整启用了 Claude Code 官方的 `/buddy` 终端宠物伴侣功能，1:1 复刻官方体验。

### 功能概览

输入 `/buddy` 即可孵化一个专属的 ASCII 终端宠物。宠物基于你的账号 ID 确定性生成，每次启动都是同一个。

- 🐣 **18 种物种**：鸭子、鹅、猫、龙、企鹅、幽灵、机器人等
- ⭐ **5 个稀有度**：Common (60%)、Uncommon (25%)、Rare (10%)、Epic (4%)、Legendary (1%)
- ✨ **1% 闪光概率**：独立于稀有度的额外闪光变体
- 📊 **五维属性**：DEBUGGING、PATIENCE、CHAOS、WISDOM、SNARK（0-100）
- 🎭 **AI 生成性格**：首次孵化时由 AI 生成独特的名字和性格描述
- 💬 **对话反应**：宠物会在 AI 回复后通过语音气泡对对话内容做出反应
- 🎨 **彩虹高亮**：输入框中的 `/buddy` 文字会显示为彩虹色

### 命令

| 命令 | 说明 |
|---|---|
| `/buddy` | 首次孵化宠物，之后显示属性卡片（按任意键关闭） |
| `/buddy pet` | 抚摸宠物，触发 2.5 秒爱心动画 |
| `/buddy off` | 静音宠物（隐藏反应气泡） |
| `/buddy on` | 取消静音 |

### 配置

`/buddy` 的孵化和对话反应功能需要调用小模型（`queryHaiku`）。在 `~/.claude/models.json` 中配置 `smallFastModel` 字段：

```json
{
  "smallFastModel": "doubao-seed-2.0-code"
}
```

如果不设置，默认会使用 Anthropic 的 haiku 模型名，第三方 API 可能不支持。

---

## Auto Mode 自动模式

本项目启用了 Claude Code 的 Auto Mode（自动模式），通过 AI 安全分类器自动评估每个操作的安全性，安全操作自动执行，危险操作仍会拦截提示。

### 启动方式

```bash
# 方式一：启动时通过参数进入 auto mode
bun run start -- --permission-mode auto

# 方式二：启动时通过 --enable-auto-mode 参数
bun run start -- --enable-auto-mode

# 方式三：在 REPL 中按 Shift+Tab 循环切换权限模式
# 顺序：default → acceptEdits → plan → auto → default
```

### 通过 settings.json 设为默认

在 `~/.claude/settings.json` 中添加：

```json
{
  "permissions": {
    "defaultMode": "auto"
  }
}
```

### Auto Mode 行为

- ✅ 读文件、搜索代码等只读操作直接通过，不走分类器
- ✅ 安全的写操作（项目目录内的文件修改）自动放行
- ✅ 常规 bash 命令（npm test、git status 等）自动执行
- ⛔ 删除文件、修改系统配置等高风险操作会被拦截
- ⛔ 访问凭证、数据外泄等安全敏感操作会被阻止

### 配置分类器规则

Auto Mode 的分类器支持通过 `autoMode` 配置自定义规则。在 `~/.claude/settings.json` 或 `.claude/settings.local.json` 中配置：

```json
{
  "autoMode": {
    "environment": [
      "Source control: github.com/your-org and all repos under it",
      "Trusted internal domains: *.internal.example.com"
    ],
    "allow": [
      "Deploying to staging is allowed"
    ],
    "soft_deny": [
      "Never run database migrations outside the migrations CLI"
    ]
  }
}
```

### 注意事项

- 分类器本身是一次额外的 API 调用，每个需要评估的操作都会消耗额外 token
- 第三方模型需要能正确理解分类器 prompt 并输出结构化响应，如果模型不支持可能导致误判
- 可通过 `/permissions` 查看被拒绝的操作记录

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
2. **`scripts/build-external.ts`** — `Bun.build()` 构建脚本，通过插件替换 `bun:bundle`，通过 `define` 注入 `MACRO.*`，将私有包标记为 external。90+ 个内部 feature flags 全部禁用，仅启用少量安全 flags（BUDDY、TRANSCRIPT_CLASSIFIER、BASH_CLASSIFIER）。
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

使用第三方 API 时，确保 `~/.claude/models.json` 中正确配置了 `baseUrl`。项目会自动跳过对 `api.anthropic.com` 的连通性检查。

### 启动时提示 "Not logged in · Please run /login"

确保 `~/.claude/models.json` 中配置了 Provider 和 `defaultModel`。使用第三方 API 时不需要登录 Anthropic 账号。

### 提示 "Claude Code has switched from npm to native installer"

在 `~/.claude/models.json` 中添加 `"settings": { "disableInstallationChecks": true }` 即可消除。

### 全局安装后 `cclocal` 命令找不到

确认软链接创建成功：

```bash
ls -la /usr/local/bin/cclocal
```

如果使用的是 Apple Silicon Mac，也可以链接到：

```bash
sudo ln -sf $(pwd)/dist/cli.js /opt/homebrew/bin/cclocal
```

Windows 用户确认 `%LOCALAPPDATA%\bun\bin` 在系统 PATH 中。

### Windows 下 `bun run start` 报错

确保使用 PowerShell（非 cmd）运行，且 Bun 版本 >= 1.1。如果遇到权限问题：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
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
