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
- 🚀 默认保留旧版 Claude Code 的 React + Ink 终端 UI、REPL、帮助输出和 `--print` 体验
- 🧩 MCP 工具生态：stdio / SSE / HTTP transport、命名空间、allow/block 策略
- 🛡️ 权限模式：`default` / `dontAsk` / `acceptEdits` / `bypassPermissions` 与工具 allow/block
- 📦 可打包为可分发 CLI 产物，全局安装后在任意目录使用
- 🇨🇳 国内网络友好，内置镜像源配置

---

## 目录

- [快速开始](#快速开始)
- [全局安装](#全局安装在任意目录使用)
- [更新到最新版本](#更新到最新版本)
- [使用方法](#使用方法)
- [环境变量说明](#环境变量说明)
- [多模型配置](#多模型配置)
- [REST API 与 MCP](#rest-api-与-mcp)
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

### 4. 启动

```bash
bun run start
```

这会启动和旧版一致的 Claude Code 终端界面，可以直接开始对话。新 `packages/*` 能力作为底座和管理子命令存在，不替换默认 UI。

也可以先跑一次单次请求验证：

```bash
bun run start -- --print "say ok"
```

---

## 全局安装（在任意目录使用）

不想每次都进项目目录？运行安装脚本，自动打包并注册全局命令 `cclocal`：

### macOS / Linux

```bash
bash scripts/install-global.sh
```

> 💡 默认命令名为 `cclocal`（Claude Code Local）。如需自定义命令名，可传参指定：
>
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

建议立刻做一次最小验证：

```bash
cclocal --help
cclocal --print "say ok"
```

> ⚠️ **注意**：旧版脚本使用 `cc` 作为命令名，但 `cc` 是 macOS/Linux 系统自带的 C 编译器（clang），会导致命令冲突。现已改为 `cclocal`。
>
> 💡 脚本会自动检测 bun 路径、打包项目，并在 `/opt/homebrew/bin/cclocal` 或 `/usr/local/bin/cclocal` 创建一个全局启动脚本，实际指向当前仓库的 `dist/cli.js`。如果检测到旧版 `.env` 配置，会自动迁移到 `~/.claude/models.json`。

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

- 如果使用 `bun run start` 启动，会直接运行仓库里的最新 TypeScript 源码
- 如果使用全局命令 `cclocal`，`bun run build` 后全局命令会自动使用更新后的 `dist/cli.js`，无需重新安装
- 如果你换了仓库路径，或者想重建全局入口，可以重新执行一次 `bash scripts/install-global.sh`

> 💡 `~/.claude/models.json` 配置文件不会被 `git pull` 覆盖，你的模型配置会保留。

---

## 使用方法

```bash
# 启动正式 CLI（默认保持旧版 Claude Code UI）
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

> `bun run start` / 全局 `cclocal` 当前默认保持旧版 Claude Code UI。  
> 新 `packages` 能力通过 `mcp`、`models`、`sessions`、`server` 等管理子命令接入，避免主交互体验变成简化版。

### 日常用户命令

全局安装后，日常使用不需要手动启动 server，也不需要手写 token：

```bash
# 进入交互式对话
cclocal

# 单次提问
cclocal --print "总结当前项目"

# 查看可用模型
cclocal models list

# 查看最近会话
cclocal sessions list

# 继续最近会话
cclocal --continue

# 恢复指定会话
cclocal --resume <SESSION_ID>

# 查看 MCP 服务器
cclocal mcp list
```

如果你已经单独运行了 `bun run start:server`，或者要连接远程 CCLocal server，再使用 `--server` / `--token`：

```bash
cclocal --server http://127.0.0.1:5678 --token your-local-token sessions list
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

**方式一：手动编辑配置文件（推荐）**

创建或编辑 `~/.claude/models.json`（Windows 为 `%USERPROFILE%\.claude\models.json`）：

**方式二：环境变量**

如果只配置一个兼容 Anthropic API 的服务，也可以通过环境变量启动：

```bash
export ANTHROPIC_BASE_URL="https://your-provider.example.com"
export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_MODEL="your-model"

cclocal
```

---

## REST API 与 MCP

本仓库同时提供 `packages/` Client/Server 底座，用于 REST API、MCP 管理、会话管理和后续 GUI/扩展集成：

- `packages/server`: 本地 HTTP + SSE 服务端
- `packages/core`: QueryEngine、会话存储、MCP 管理器
- `packages/cli`: `cclocal` 的管理子命令路由层

默认 `bun run start` 和全局 `cclocal` 不会展示简化版 packages REPL，而是保持旧版 Claude Code UI。只有 `cclocal mcp ...`、`cclocal models ...`、`cclocal sessions ...` 等管理命令会进入 packages 路径并按需自动拉起内嵌 server。

### 启动本地服务端

```bash
# 可选：固定 API key
export CCLOCAL_API_KEY=your-local-token

# 可选：允许浏览器来源
export CCLOCAL_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5173

bun run start:server
```

启动后可以使用 [API.md](./API.md) 中的 REST 端点管理会话、消息和 MCP 服务器。

### 注册并连接 MCP 服务器

日常 CLI 使用会自动拉起内嵌 server，所以可以直接运行：

#### stdio MCP

```bash
cclocal mcp add-stdio filesystem npx @modelcontextprotocol/server-filesystem /path/to/project \
  --namespace local_fs \
  --allow-tools read_file,list_directory

cclocal mcp connect filesystem
```

#### SSE MCP

```bash
cclocal mcp add-sse docs http://127.0.0.1:8080/sse \
  --header "Authorization: Bearer YOUR_REMOTE_TOKEN"

cclocal mcp connect docs
```

### 动态工具策略

MCP 动态工具在连接成功后，默认会进入模型工具池，命名格式为：

```text
mcp__<namespace-or-server-name>__<tool-name>
```

你可以通过注册参数控制暴露范围：

- `namespace`: 指定工具命名空间，避免不同服务器工具重名
- `allowedTools`: 仅暴露指定工具
- `blockedTools`: 屏蔽指定工具
- `syncToolsToRegistry: false`: 保留连接，但不自动暴露给模型

常用管理命令：

```bash
# 查看已注册的 MCP 服务器
cclocal mcp list

# 查看某个 MCP 服务器的配置和已暴露工具
cclocal mcp show filesystem

# inspect 是 show 的别名
cclocal mcp inspect filesystem

# 断开连接
cclocal mcp disconnect filesystem

# 删除服务器
cclocal mcp remove filesystem
```

### 通过 REST 发起对话

只要 MCP server 已连接，且工具被同步进 registry，模型对话时就会自动看到这些动态工具。

默认对话仍走旧版 Claude Code UI；REST 和 packages 子命令用于管理和集成：

```bash
# 交互式对话
cclocal

# 单次提问
cclocal --print "读取项目里的 README 并总结一下"
```

如果模型在当前上下文里判断需要使用已连接的 MCP 动态工具，它会自动调用对应的 `mcp__<namespace>__<tool>` 工具。

### 用 CLI 管理会话

新 CLI 现在也能直接查看和续接 REST 会话：

```bash
# 创建新会话
cclocal sessions new "MCP Demo" --model claude-sonnet-4 --cwd "$(pwd)"

# 查看最近会话
cclocal sessions list

# 查看某个会话详情和最近 20 条消息
cclocal sessions show <SESSION_ID> --messages 20

# 直接用已有会话发一条单次消息
cclocal sessions use <SESSION_ID> --print "继续刚才的话题"

# 用已有会话试验另一个模型
cclocal sessions use <SESSION_ID> --model doubao --print "继续刚才的话题"

# 基于已有会话继续单次对话
cclocal --session <SESSION_ID> --print "继续刚才的话题，总结一下下一步"

# 基于已有会话进入交互式 REPL
cclocal --session <SESSION_ID>

# 重命名会话
cclocal sessions rename <SESSION_ID> "新的会话名"

# 删除会话
cclocal sessions delete <SESSION_ID>

# 查看服务端暴露的模型列表
cclocal models list
```

REST 示例：

```bash
# 创建会话
curl -X POST http://127.0.0.1:5678/api/v1/sessions \
  -H "Authorization: Bearer your-local-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"MCP Demo","cwd":"'"$(pwd)"'","model":"claude-sonnet-4"}'

# 发送消息（SSE 流）
curl -N -X POST http://127.0.0.1:5678/api/v1/sessions/<SESSION_ID>/messages \
  -H "Authorization: Bearer your-local-token" \
  -H "Content-Type: application/json" \
  -d '{"content":"读取项目里的 README 并总结一下"}'
```

现在 `packages/` 这条线已经验证了：

- MCP server 可注册、连接、断开
- 动态工具可按策略进入默认工具池
- REST -> SessionManager -> QueryEngine -> MCP 动态工具 -> SSE/持久化 这条链路可跑通

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
| `smallFastModel` | 否 | 快速小模型配置，保留给需要轻量模型的兼容流程 |
| `settings.disableInstallationChecks` | 否 | 设为 `true` 跳过安装方式检查警告 |

> 💡 **安全建议**：API Key 可以使用 `{env:VARIABLE_NAME}` 语法引用环境变量，例如 `"apiKey": "{env:DOUBAO_API_KEY}"`，避免在配置文件中硬编码敏感凭证。

> ⚠️ 如果使用项目级配置 `.claude/models.json`，建议将其加入 `.gitignore`，防止意外提交敏感信息。

### 模型管理命令

| 命令 | 说明 |
|------|------|
| `cclocal models list` | 查看服务端当前暴露的模型 |
| `cclocal model current` | 查看当前模型覆盖值 |
| `cclocal model use <name>` | 使用指定模型进入 REPL 或配合 `--print` 单次调用 |
| `cclocal --model <name>` | 启动时指定模型 |

### 切换模型

```bash
# 查看模型
cclocal models list

# 查看当前模型覆盖
cclocal model current

# 在 REPL 中查看或切换
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
- **手动启动用户**：建议直接创建 `~/.claude/models.json`；旧 `.env` 可参考安装脚本迁移逻辑手动迁移

---

## 终端宠物伴侣（/buddy）

`/buddy` 属于旧 Ink 全屏 UI 的特色功能。因为 `cclocal` 默认保持旧版 Claude Code UI，所以该功能仍在默认交互入口中可用。

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

默认交互入口保持旧版 Claude Code UI，因此原有权限模式和 `/permissions` 交互仍按旧 UI 行为工作。packages 管理子命令和 REST 路径也会透传 `--permission-mode`、`--allowed-tools`、`--disallowed-tools` 等策略。

### 当前权限模式

```bash
# 接受文件编辑类操作，仍保留其它风险操作确认
cclocal --permission-mode acceptEdits

# 明确允许/禁止工具
cclocal --allowed-tools file_read,grep --disallowed-tools bash

# 完全绕过权限提示，仅建议在受信任临时环境中使用
cclocal --permission-mode bypassPermissions
```

### 通过 settings.json 设为默认

在 `~/.claude/settings.json` 中添加：

```json
{
  "permissions": {
    "defaultMode": "acceptEdits"
  }
}
```

### Auto Mode

旧版 Claude Code UI 中保留过基于分类器的 Auto Mode：

```bash
cclocal --permission-mode auto
cclocal --enable-auto-mode
```

也可以在 REPL 里按 Shift+Tab 循环切换权限模式。

### Auto Mode 配置

以下配置适用于 Auto Mode 分类器：

### Auto Mode 行为

- ✅ 读文件、搜索代码等只读操作直接通过，不走分类器
- ✅ 安全的写操作（项目目录内的文件修改）自动放行
- ✅ 常规 bash 命令（npm test、git status 等）自动执行
- ⛔ 删除文件、修改系统配置等高风险操作会被拦截
- ⛔ 访问凭证、数据外泄等安全敏感操作会被阻止

### 分类器规则

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

将项目打包为可分发 JS 产物：

```bash
# 打包统一入口 dist/cli.js、内嵌服务端 dist/server.js、旧 UI 入口 dist/legacy-cli.js
bun run build

# 运行打包产物
bun dist/cli.js

# 查看帮助
bun dist/cli.js --help
```

`dist/cli.js` 是统一路由入口：默认用户路径会转到旧 UI；packages 管理子命令会优先使用仓库源码中的 packages server，如果只分发 `dist/` 目录，也会自动回退到同目录的 `dist/server.js`。默认 UI 在脱离源码目录时会使用同目录的 `dist/legacy-cli.js`。

完整迁移验收：

```bash
bun run acceptance:complete
```

这会覆盖类型检查、测试、全量构建、parity audit、默认入口、分发产物、动态端口、无残留进程和脱离源码目录运行等关键路径。

---

## 项目结构

```
.
├── packages/
│   ├── cli/                  # cclocal 路由与 packages 管理子命令
│   ├── server/               # 本地 REST/SSE/WebSocket 服务端
│   ├── core/                 # QueryEngine、ToolRegistry、MCPManager
│   ├── shared/               # 共享类型
│   └── vscode-ext/           # VS Code 扩展基座
├── src/                      # 旧 Claude Code UI 与主交互体验
│   ├── entrypoints/cli.tsx
│   └── _external/            # 构建兼容层与 shim
├── scripts/
│   ├── build-external.ts     # 构建 dist/cli.js + dist/server.js + dist/legacy-cli.js
│   └── acceptance-complete.sh # 完整迁移验收脚本
├── dist/
│   ├── cli.js                # 可分发统一路由入口
│   ├── server.js             # 可分发内嵌服务端
│   └── legacy-cli.js         # 可分发旧 UI 入口，保证默认体验不降级
├── .env.example              # 环境变量配置模板
├── package.json
├── tsconfig.json
└── bunfig.toml               # Bun 预加载配置 + .md text loader
```

---

## 工作原理

当前 `dist/cli.js` 是统一路由入口：无子命令、`--print`、`--help` 等主用户路径保持旧版 Claude Code UI；`mcp`、`models`、`sessions` 等管理子命令进入 `packages/cli`，并在需要 REST 能力时自动拉起 `packages/server`。

旧 Claude Code 源码依赖 Bun 的 `bun:bundle` 模块实现编译时 feature flags，以及 `MACRO.*` 全局变量实现构建时常量。本项目为 legacy 路径提供了：

1. **`bunfig.toml` + `preload.ts`** — 注册 Bun 插件，在运行时解析 `import { feature } from 'bun:bundle'`，并定义 `MACRO.VERSION` 等全局变量。
2. **`scripts/build-external.ts`** — 默认构建统一路由 `dist/cli.js`、packages 服务端 `dist/server.js`、旧 UI `dist/legacy-cli.js`；设置 `CCLOCAL_BUILD_LEGACY=1` 时只构建旧 `src/*` 入口，并通过插件替换 `bun:bundle`、注入 `MACRO.*`、处理私有包 external。
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

先确认全局启动脚本是否创建成功：

```bash
which cclocal
ls -la /opt/homebrew/bin/cclocal /usr/local/bin/cclocal
```

如果命令存在但你想重建一次，直接重新执行：

```bash
bash scripts/install-global.sh
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
