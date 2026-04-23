# CLI Integrations And REPL Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- REPL 与部分环境集成选项

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下真实行为：

- 默认 REPL 启动
- `--worktree`
- `--ide`
- `--chrome`
- `--tmux`

## 实际结论

### REPL

真实结论：

- 可用

验证结果：

- 启动后可见：
  - `Claude Code`
  - 快捷提示 `? for shortcuts`
  - 交互输入提示

### `--worktree`

真实结论：

- 可用
- 会真实创建 git worktree

验证方式：

- 在临时 git 仓库内执行：

```bash
claude --worktree smoke --print "say ok"
```

结果：

- 命令成功返回 `ok`
- `git worktree list --porcelain` 中出现：
  - `.claude/worktrees/smoke`

### `--ide`

真实结论：

- 真实成功分支已通过
- 当前环境下已经可以确认 CLI 真实连上 Cursor 扩展

验证结果：

- `claude --ide --print "say ok"` 成功返回 `ok`
- 直接调用 `findAvailableIDE()`，返回：
  - `ws://127.0.0.1:37500`
  - `Cursor`
- 在 `claude --ide` REPL 内执行 `/status`
- 状态面板真实显示：
  - `IDE: Connected to Cursor extension`

进一步排查结果：

- 本机最初 `code` 命令实际上指向的是 Cursor CLI shim，不是真正的 VS Code CLI
- 改用真正的 VS Code CLI 后，可以确认：
  - VS Code 进程能够真实启动
  - `~/.claude/ide/` 没有持续存在的 `.lock`
- 同时，真正的 VS Code 扩展列表里没有 `anthropic.claude-code`
- Cursor 侧则相反：
  - `~/.claude/ide/*.lock` 会真实出现
  - lockfile 内包含工作区路径、`transport: "ws"` 和 `authToken`
  - CLI 进入 REPL 后，`/status` 能看到明确的已连接状态

这说明当前更准确的状态是：

- `--ide` 对 Cursor 的真实自动连接已经闭环
- 真正的 VS Code 成功分支仍未闭环，因为当前 VS Code 本体没有 `anthropic.claude-code` 扩展

### `--chrome`

真实结论：

- 最小启动可用
- 真实成功连接分支当前未闭环，直接原因是浏览器里没有安装 Claude in Chrome 扩展

验证结果：

- `claude --chrome --print "say ok"` 成功返回 `ok`
- 通过 `detectExtensionInstallationPortable()` 扫描本机浏览器 profile：
  - 找到了 Chrome `Default`
  - 找到了 Edge `Profile 1`、`Profile 2`、`Profile 3`
  - 但没有在任何受支持浏览器里发现扩展 ID：
    - `fcoeoabgfenejglbffodgkkbkcdhcgfn`

### `--tmux`

真实结论：

- 依赖检查可用

验证结果：

- 在未安装 tmux 的环境中执行：

```bash
claude --worktree smoke --tmux --print "say ok"
```

- 返回非零退出码
- stderr 明确提示：
  - `tmux is not installed`

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/smoke-integrations-repl.sh`
- `/Users/yanluohao/开发/cc-local/scripts/deep-repl-regression.sh`

以及深度补充文档：

- `/Users/yanluohao/开发/cc-local/CLI_REPL_DEEP_AUDIT.md`

## 当前结论

这批集成项里，已经拿到的真实基线是：

- REPL 启动：通过
- `--worktree`：通过
- `--ide`：Cursor 成功连接通过
- `--chrome`：最小启动通过
- `--tmux`：缺依赖错误分支通过

还没有完全验证到的是：

- `--ide` 在真正 VS Code 中的成功连接分支
- `--chrome` 的真实浏览器集成成功分支
  - 当前阻塞点是浏览器扩展未安装，而不是 CLI 启动失败
- `--tmux` 在已安装 tmux 环境中的成功分支
