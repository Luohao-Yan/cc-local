# CLI REPL Deep Audit

审计对象：

- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 交互式 REPL 深层行为

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下真实行为：

- REPL 启动 banner
- REPL 内 slash command 执行
- REPL 内模型触发工具调用
- REPL 会话持久化

## 实际结论

### REPL 启动

真实结论：

- 可用

验证结果：

- 启动后可见：
  - `Claude Code`
  - `? for shortcuts`

### slash commands

真实结论：

- 可用

验证结果：

- 在 REPL 中输入 `/help`
- 界面会立即显示命令项：
  - `/help`
  - `Show help and available commands`

这说明本地 slash command 分发链路是活的，不是只停留在帮助注册。

### tool calling

真实结论：

- 可用

验证结果：

- 在 REPL 中提交：

```text
run bash command pwd and answer only done
```

- 会话 transcript 中可见真实 `Bash` 工具调用
- 同一份 transcript 中也可见最终助手文本 `done`

### session persistence

真实结论：

- 可用

验证结果：

- 本轮在隔离临时工作目录下启动 REPL
- 运行 `/help` 后继续提交需要模型执行的 prompt
- 最终在 `~/.claude/projects/<sanitized-cwd>/` 下发现新的 session `.jsonl`
- 该 session 文件同时包含：
  - 用户输入
  - `Bash` 工具调用
  - 最终助手输出 `done`

这说明 REPL 不只是“UI 能启动”，而是真正把交互内容落进了旧主线 session 存储链路。

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/deep-repl-regression.sh`

它覆盖：

- REPL banner
- `/help`
- 工具调用落盘
- session 持久化落盘

## 当前结论

REPL 这条深链路里，已经拿到的真实基线是：

- 启动：通过
- slash commands：通过
- tool calling：通过
- session persistence：通过

还没完全覆盖到的是：

- 更多本地 JSX slash commands 的交互细节
- 多轮 REPL 会话的恢复与 fork
- REPL 中权限提示 UI 的人工选择分支

补充观察：

- 默认权限模式下，针对 `Write` 的真实 REPL 审批面板已经出现，界面里可见：
  - `Yes`
  - `Yes, allow all edits during this session`
  - `No`
  - `Esc to cancel · Tab to amend`

这说明 REPL 权限 UI 不是“理论存在”，而是已经验证到真实渲染层。当前剩下的是把人工选择 `No` / `Yes` 的分支进一步稳定自动化。

进一步结论：

- 在同一台机器上，`claude --ide` 进入 REPL 后执行 `/status`
- 状态面板会真实显示：
  - `IDE: Connected to Cursor extension`

这说明 REPL 不只是独立工作，和 IDE 自动连接链路在 Cursor 环境下也已经真实打通。
