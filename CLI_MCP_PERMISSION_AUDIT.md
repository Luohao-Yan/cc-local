# CLI MCP Permission Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 旧主线 `mcp serve` 下高风险工具的真实行为

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下行为：

- `mcp serve` 下 `Bash` 是否真实执行
- `mcp serve` 下 `Edit` / `Write` 是否真实改文件
- 这些工具是否在项目工作目录中执行

## 实际结论

### `Bash`

真实结论：

- 可用
- 在项目工作目录中执行

验证方式：

- 在隔离项目目录内通过 MCP 调用：

```json
{
  "name": "Bash",
  "arguments": {
    "command": "pwd"
  }
}
```

结果：

- 调用成功
- 返回的 `stdout` 命中当前项目目录

### `Edit`

真实结论：

- 可用
- 但遵守旧主线原有约束：必须先 `Read` 再 `Edit`
- 会真实改写目标文件

验证方式：

- 先创建 `editable.txt`，初始内容为 `before`
- 先通过 MCP `Read` 读取该文件
- 通过 MCP 调用：

```json
{
  "name": "Edit",
  "arguments": {
    "file_path": ".../editable.txt",
    "old_string": "before\n",
    "new_string": "after\n"
  }
}
```

结果：

- 调用成功
- 返回 payload 中包含 `"newString":"after\\n"`
- 如果跳过前置 `Read`，会返回：
  - `File has not been read yet. Read it first before writing to it.`

### `Write`

真实结论：

- 可用
- 会真实覆盖目标文件内容

验证方式：

- 在 `Edit` 之后继续通过 MCP 调用：

```json
{
  "name": "Write",
  "arguments": {
    "file_path": ".../editable.txt",
    "content": "rewritten\n"
  }
}
```

结果：

- 调用成功
- 返回 payload 中包含 `"content":"rewritten\\n"`
- 文件最终内容真实变成 `rewritten\n`

## 重要观察

在这次真实审计里，`mcp serve` 下的 `Bash` / `Edit` / `Write` 都能直接执行成功。

更准确地说：

- `Bash` 可直接执行
- `Write` 可直接执行
- `Edit` 可执行，但需要先满足旧主线已有的“先读后改”约束

这说明：

- `mcp serve` 不只是暴露了这些高风险工具名
- 它们在当前默认路径下也确实能工作

这项审计确认的是“真实行为”，不是规范判断。  
如果后续目标是让 `mcp serve` 与主 CLI 的交互权限体验完全一致，那么还需要单独再审计权限提示与拒绝分支；但至少从可执行性上，这条链路已经闭环了。

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/check-mcp-permissions.mjs`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-permissions.sh`

其中：

- `check-mcp-permissions.mjs` 直接通过 MCP 调用 `Bash` / `Edit` / `Write`
- `deep-mcp-permissions.sh` 作为一键 smoke 包装，方便后续回归

## 当前结论

旧主线 `mcp serve` 这条线现在已经验证到：

- transport 可连接
- `list_tools` 可用
- 最小 `call_tool` 可用
- 高风险工具 `Bash` / `Edit` / `Write` 真实可执行

## 下一步建议

下一批建议继续审计：

1. 认证型 HTTP/SSE server 的 `needs-auth` / 失败分支
2. `plugin` 注入的 MCP server 与手工配置 server 的去重与覆盖
3. `--permission-mode` 在主 CLI 会话中的真实行为
