# CLI MCP Serve Tools Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 旧主线 `mcp serve` 的工具暴露面

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下行为：

- `mcp serve` 是否真实响应 `list_tools`
- `mcp serve` 暴露的工具是否包含关键内置工具
- `mcp serve` 是否真实响应最小 `call_tool`

## 实际结论

### `list_tools`

真实结论：

- 可用
- `mcp serve` 暴露的不是空工具集

验证方式：

- 用 SDK 客户端脚本 `/Users/yanluohao/开发/cc-local/scripts/check-mcp-serve-tools.mjs`
- 通过 stdio 直接连接：

```bash
bun /Users/yanluohao/开发/cc-local/dist/cli.js mcp serve
```

结果：

- `listTools()` 成功返回
- 返回的工具数量大于最小阈值
- 结果中确认包含：
  - `Read`
  - `Bash`
- 一次真实运行中返回了 `19` 个工具，包含：
  - `Edit`
  - `Glob`
  - `Grep`
  - `WebFetch`
  - `WebSearch`

这说明 `mcp serve` 不只是“端口/进程可连”，而是真的暴露了内置工具面。

### 最小 `call_tool`

真实结论：

- 可用
- `Read` 工具可通过 MCP 调用成功

验证方式：

- 在临时项目目录创建一个测试文件
- 通过 MCP `callTool` 调用：

```json
{
  "name": "Read",
  "arguments": {
    "file_path": "/tmp/.../sample.txt"
  }
}
```

结果：

- 调用成功，没有 `isError`
- 返回内容中包含结构化文件 payload，例如：
  - `"filePath":".../sample.txt"`
  - `"content":"alpha\\nbeta\\ngamma\\n"`

这说明 `mcp serve` 已经满足“可列工具”加“可真实调用工具”的最小闭环。

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/check-mcp-serve-tools.mjs`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-serve-tools.sh`

其中：

- `check-mcp-serve-tools.mjs` 直接以 SDK 客户端方式验证 `list_tools` 与 `call_tool`
- `deep-mcp-serve-tools.sh` 作为一键 smoke 包装，方便后续回归

## 当前结论

旧主线 `mcp serve` 当前已经通过三层验证：

- 进程/transport 可连接
- `list_tools` 可用
- 最小 `call_tool` 可用

这意味着它不是“只启动成功”的壳，而是一个真实可工作的 MCP server。

## 下一步建议

下一批建议继续审计：

1. `mcp serve` 下更高风险工具的权限行为，例如 `Bash` / `Edit`
2. 远程 HTTP/SSE server 需要认证时的 `needs-auth` / 失败分支
3. MCP tools 与 CLI 主会话权限模型是否保持一致
