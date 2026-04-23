# CLI Permission Mode Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 主 CLI 的 `--permission-mode`

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下真实行为：

- `dontAsk` 的真实拒绝分支
- `acceptEdits` 的真实自动放行分支
- `bypassPermissions` 的真实启动分支

## 实际结论

### `dontAsk`

真实结论：

- 可用
- 对需要审批的写操作会真实拒绝

验证结果：

- `--print --permission-mode dontAsk` 下，模型尝试：
  - `Bash(touch /tmp/cc-local-permission-smoke.txt)`
  - `Write(/tmp/cc-local-permission-smoke.txt)`
- 两次都返回了明确拒绝：
  - `Permission to use Bash has been denied because Claude Code is running in don't ask mode`
  - `Permission to use Write has been denied because Claude Code is running in don't ask mode`
- 目标文件最终没有被创建

额外观察：

- `dontAsk` 并不是“所有工具一律拒绝”
- 对 `Bash(pwd)` 这种已被工具权限逻辑直接判定为 `allow` 的调用，仍然会执行成功

这和源码里的 `ask -> deny` 变换是一致的：它只会把原本需要交互审批的操作压成拒绝，不会反转那些本来就会被自动允许的调用。

### `acceptEdits`

真实结论：

- 可用
- 在当前工作目录内，文件写入会真实自动放行

验证结果：

- 在临时目录下执行：

```bash
bun /Users/yanluohao/开发/cc-local/dist/cli.js \
  --print "create a file named note.txt in the current directory with exact content hi" \
  --permission-mode acceptEdits \
  --output-format stream-json \
  --verbose
```

- 输出初始化事件里 `permissionMode` 为 `acceptEdits`
- 模型真实调用了 `Write`
- `note.txt` 被成功创建，内容为 `hi`

### `bypassPermissions`

真实结论：

- 在当前环境中，`--permission-mode bypassPermissions` 启动分支可用

验证结果：

- `--print --permission-mode bypassPermissions` 的初始化事件里，`permissionMode` 会真实显示为 `bypassPermissions`
- 模型可直接执行 `Bash(pwd)`
- 最终结果返回 `done`

注意：

- 这里验证的是“CLI 启动时指定 bypass 模式”的真实行为
- 这和运行中通过控制消息切换到 `bypassPermissions` 的限制不是同一条路径
- 源码里 `set_permission_mode` 仍然保留了更严格的错误分支，例如：
  - `Cannot set permission mode to bypassPermissions because it is disabled by settings or configuration`
  - `Cannot set permission mode to bypassPermissions because the session was not launched with --dangerously-skip-permissions`

也就是说：

- “启动即进入 bypass 模式”在当前环境下是可用的
- “运行中切换到 bypass 模式”仍有额外限制，需要区分看待，不能混成一个结论

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/smoke-permission-mode.sh`

它覆盖：

- `dontAsk` 拒绝分支
- `acceptEdits` 写入自动放行
- `bypassPermissions` 启动分支

## 当前结论

这批模式里，已经拿到的真实基线是：

- `dontAsk`：拒绝分支通过
- `acceptEdits`：自动写入通过
- `bypassPermissions`：启动分支通过

还没完全验证到的是：

- 运行中切换 `permission mode` 的控制通路
- 交互式权限提示 UI 的完整手动批准分支
- 交互式权限提示 UI 的完整手动拒绝分支
