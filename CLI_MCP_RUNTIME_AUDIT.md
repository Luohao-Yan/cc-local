# CLI MCP Runtime Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 旧主线 MCP 运行态与 transport 闭环

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下运行态行为：

- `mcp serve` 是否能作为正式 stdio MCP server 被旧主线 CLI 自己连上
- `--transport http` 的最小连接闭环
- `--transport sse` 的最小连接闭环
- 多 scope 同名 server 的配置优先级是否符合源码声明

## 实际结论

### `mcp serve`

真实结论：

- 可用
- 可以直接作为 stdio MCP server 被旧主线 `mcp get` / `mcp list` 连通

验证方式：

- 在隔离项目中执行：

```bash
claude mcp add -s project official_stdio -- bun /Users/yanluohao/开发/cc-local/dist/cli.js mcp serve
claude mcp get official_stdio
```

结果：

- `Status: ✓ Connected`
- `Type: stdio`
- `Command: bun`

这说明官方 `mcp serve` 不是只存在于帮助输出中，而是能作为真实 stdio MCP server 工作。

### `--transport http`

真实结论：

- 可用
- 旧主线可以通过 Streamable HTTP transport 连上本地最小 MCP server

验证方式：

- 用本仓库新增脚本 `/Users/yanluohao/开发/cc-local/scripts/test-mcp-http-server.mjs` 启动本地测试 server
- 在隔离项目中执行：

```bash
claude mcp add --transport http -s project runtime_http http://127.0.0.1:<port>/mcp
claude mcp get runtime_http
```

结果：

- `Status: ✓ Connected`
- `Type: http`

### `--transport sse`

真实结论：

- 可用
- 旧主线可以通过 SSE transport 连上本地最小 MCP server

验证方式：

- 用本仓库新增脚本 `/Users/yanluohao/开发/cc-local/scripts/test-mcp-sse-server.mjs` 启动本地测试 server
- 在隔离项目中执行：

```bash
claude mcp add --transport sse -s project runtime_sse http://127.0.0.1:<port>/mcp
claude mcp get runtime_sse
```

结果：

- `Status: ✓ Connected`
- `Type: sse`

### 配置优先级

真实结论：

- 旧主线真实行为与源码声明一致：
  - `plugin < user < project < local`

验证方式：

- 同名 `shadowed` server 分别写入：
  - `user` scope：HTTP
  - `project` scope：SSE
  - `local` scope：stdio
- 在项目目录执行：

```bash
claude mcp get shadowed
```

结果：

- 输出命中的 scope 为：
  - `Local config (private to you in this project)`
- 同时输出命中的 transport 为：
  - `Type: stdio`

这说明同名 server 确实按 `local` 覆盖 `project`，再覆盖 `user`。

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/test-mcp-http-server.mjs`
- `/Users/yanluohao/开发/cc-local/scripts/test-mcp-sse-server.mjs`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-runtime.sh`

其中：

- `deep-mcp-runtime.sh` 会在隔离 `HOME` 和隔离项目目录中验证：
  - 官方 `mcp serve` stdio 闭环
  - HTTP transport 最小闭环
  - SSE transport 最小闭环
  - 同名 server 的配置优先级

## 当前结论

旧主线正式 CLI 的 MCP 已经不仅是“配置链路可用”，而且“运行态 transport 闭环可用”：

- `mcp serve`: 通过
- `stdio`: 通过
- `http`: 通过
- `sse`: 通过
- 配置优先级：通过

## 下一步建议

下一批建议继续审计：

1. `mcp serve` 的真实工具暴露面，例如至少验证 `list_tools`
2. `mcp get` / `mcp list` 对需要认证的 HTTP/SSE server 的行为
3. `.mcp.json` 项目级批准状态与真实运行态加载的联动
4. `plugin` 注入的 MCP server 与手工配置 server 的去重与覆盖
