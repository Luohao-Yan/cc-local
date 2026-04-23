# CLI Auth Plugin Update Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 旧主线的认证、插件、更新相关命令

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下命令的真实行为：

- `auth status`
- `auth logout`
- `setup-token`
- `plugin validate`
- `plugin list`
- `update`

## 实际结论

### `auth status`

真实结论：

- 可用
- 未认证时返回 JSON `loggedIn: false`
- 已配置 API key 时返回 JSON `loggedIn: true` 且 `authMethod: "api_key"`

注意：

- 未认证状态下，命令会返回非零退出码

### `setup-token`

真实结论：

- 可用
- 会真实启动 OAuth/TUI 流程

验证结果：

- 启动后会显示欢迎界面
- 会输出 `Opening browser to sign in`
- 如果浏览器未打开，会继续显示可访问的登录 URL
- 会进入 `Paste code here if prompted` 等待状态

这说明 `setup-token` 不是空壳，至少启动和引导链路是活的。

### `auth logout`

真实结论：

- 可用

验证结果：

- 在隔离 `HOME` 且注入假的 `ANTHROPIC_API_KEY` 环境下执行：
  - `auth logout`
- 命令返回：
  - `Successfully logged out from your Anthropic account.`
- 同时会在隔离 HOME 下生成新的 `.claude.json`，说明退出流程不是空输出，而是真的走了配置回写与缓存清理路径

### `plugin validate`

真实结论：

- 可用

验证结果：

- 对一个最小 `plugin.json` 运行校验成功
- 会输出开发者向的警告，例如缺少 author 信息
- 最终返回 `Validation passed`

### `plugin list`

真实结论：

- 可用

验证结果：

- 在隔离 `HOME` 下、无已安装插件时，`plugin list --json` 返回 `[]`

### `update`

真实结论：

- 至少会进入真实更新检查流程

验证结果：

- 输出：
  - `Current version: ...`
  - `Checking for updates ...`

注意：

- 在当前本地环境下，12 秒窗口内未完成整个更新流程
- 因此本轮只能确认“已进入检查流程”，还不能把“完整更新成功/失败分支”算作已完全验证

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/smoke-auth-plugin-update.sh`
- `/Users/yanluohao/开发/cc-local/scripts/smoke-setup-token-start.sh`

其中：

- `smoke-auth-plugin-update.sh` 负责 `auth status`、`auth logout`、`plugin validate/list`、`update` 进入检查流
- `smoke-setup-token-start.sh` 负责 `setup-token` 的启动与引导输出

## 当前结论

这批命令里：

- `auth status`: 通过
- `auth logout`: 通过
- `setup-token` 启动链路：通过
- `plugin validate`: 通过
- `plugin list`: 通过
- `update` 进入检查流程：通过

尚未完整闭环的，是：

- `auth login`
- `setup-token` 完整换 token 成功分支
- `update` 的完整安装成功/失败分支
- `plugin install/update/uninstall`
