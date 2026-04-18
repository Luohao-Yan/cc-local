# VSCode CCLocal 扩展

在 VSCode 右侧侧边栏中使用 [cc-local](https://github.com/Luohao-Yan/cc-local) AI 编程助手。

## 功能

- 💬 右侧侧边栏聊天界面，流式显示 AI 回复
- ⚙ 工具调用可视化（显示 AI 正在执行的操作）
- 🖱 右键菜单：选中代码后直接发送给 AI 解释
- 🔄 新建会话 / 清空记录
- ⏹ 随时停止生成

## 前置条件

必须先安装并配置好 cc-local：

```bash
# 1. 克隆 cc-local 项目
git clone https://github.com/Luohao-Yan/cc-local.git
cd cc-local

# 2. 安装依赖
bun install

# 3. 配置模型 (~/.claude/models.json)

# 4. 全局安装（推荐）
bash scripts/install-global.sh
```

## 安装扩展

### 方式一：从源码安装（开发模式）

```bash
cd vscode-extension
npm install
npm run compile

# 在 VSCode 中按 F5 启动调试实例
# 或将整个 vscode-extension 目录复制到 ~/.vscode/extensions/cclocal-0.1.0/
```

### 方式二：打包安装

```bash
cd vscode-extension
npm install
npm run package   # 生成 vscode-cclocal-0.1.0.vsix

# 在 VSCode 中：Cmd+Shift+P → Extensions: Install from VSIX
```

## 配置

在 VSCode 设置中搜索 `cclocal`：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `cclocal.cclocalPath` | `cclocal` | cclocal 全局命令路径 |
| `cclocal.bunPath` | `""` | bun 路径（未全局安装时使用） |
| `cclocal.projectPath` | `""` | cc-local 项目路径（bun run 方式启动时填写） |
| `cclocal.model` | `""` | 指定模型（留空使用 models.json 默认值） |
| `cclocal.autoSendWorkspaceContext` | `true` | 自动附加当前工作区路径 |

### 未全局安装时的配置示例

```json
{
  "cclocal.bunPath": "/Users/你的用户名/.bun/bin/bun",
  "cclocal.projectPath": "/Users/你的用户名/开发/cc-local"
}
```

## 使用方法

1. 点击左侧活动栏的 **CCLocal 图标**（或 `Cmd+Shift+P` → `CCLocal: 新建会话`）
2. 在底部输入框输入消息，**Enter** 发送，**Shift+Enter** 换行
3. 选中代码后右键 → **CCLocal: 发送选中代码到 CCLocal**

## 架构说明

```
VSCode Extension (Node.js)
    ├── CclocalViewProvider  → 管理侧边栏 Webview
    ├── CclocalProcess       → 管理 cclocal 子进程
    │     └── spawn cclocal --print <prompt> --output-format stream-json --verbose
    └── extension.ts         → 命令注册与入口
```

通信流程：
```
用户输入 → Webview → Extension → spawn cclocal 进程
cclocal stdout (stream-json) → Extension 解析 → Webview 流式渲染
```
