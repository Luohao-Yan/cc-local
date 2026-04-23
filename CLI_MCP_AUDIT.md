# CLI MCP Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`dist/cli.js`
- 旧主线 MCP 管理命令

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下命令的真实行为：

- `mcp add`
- `mcp add-json`
- `mcp list`
- `mcp get`
- `mcp remove`
- `mcp reset-project-choices`

重点确认：

- 配置实际写到哪里
- `scope` 的真实语义
- `list/get` 是否真的进行健康检查
- `add-json` 是否真实保留 headers/oauth
- 多 scope 同名 server 的 remove 提示是否明确
- `reset-project-choices` 是否真实清空项目级批准/拒绝状态

## 实际结论

### scope 语义

通过真实隔离环境验证，旧主线 MCP scope 的行为如下：

- `project`
  写入当前工作目录的 `.mcp.json`

- `user`
  写入全局配置文件 `~/.claude.json` 的顶层 `mcpServers`

- `local`
  写入全局配置文件 `~/.claude.json` 的 `projects[<cwd>].mcpServers`

这点非常重要：

- `local` 不是 `.mcp.json`
- `local` 是“只对当前项目生效、但存储在全局配置里的私有配置”
- `project` 才是“随项目共享的 `.mcp.json`”

### `mcp add`

真实结论：

- 可用

验证结果：

- `mcp add --transport http -s user user_http http://127.0.0.1:9/mcp`
  成功写入隔离 `HOME` 下的 `~/.claude.json`

- `mcp add --transport http -s local local_http http://127.0.0.1:9/mcp`
  成功写入隔离 `HOME` 下的 `~/.claude.json -> projects[<cwd>].mcpServers`

- `mcp add --transport http -s project project_http http://127.0.0.1:9/mcp`
  成功写入当前目录 `.mcp.json`

### `mcp list`

真实结论：

- 可用
- 确实会做健康检查

验证结果：

在隔离环境中添加一个不可连接的 HTTP MCP server 后执行：

```bash
mcp list
```

输出包含：

- `Checking MCP server health...`
- `✗ Failed to connect`

这说明 `list` 不只是静态读配置，而是真的走 `connectToServer()` 做连通性检查。

### `mcp get`

真实结论：

- 可用
- 确实会做健康检查

验证结果：

在隔离环境中执行：

```bash
mcp get project_http
```

输出包含：

- `Scope: Project config (shared via .mcp.json)`
- `Status: ✗ Failed to connect`
- `Type: http`
- `URL: http://127.0.0.1:9/mcp`

这说明 `get` 也不是只打印配置，而是带健康状态。

### `mcp remove`

真实结论：

- 可用
- 当同名 server 存在于多个 scope 时，不会盲删
- 会明确报错并给出逐 scope 删除命令

验证结果：

在隔离环境中执行：

```bash
mcp remove -s project project_http
```

结果：

- 正常输出已移除提示
- `.mcp.json` 被成功回写为空的 `mcpServers`

多 scope 同名场景下执行：

```bash
mcp remove dup_server
```

输出会明确列出冲突来源，例如：

- `Project config (shared via .mcp.json)`
- `User config (available in all your projects)`

并给出精确下一步：

```bash
claude mcp remove "dup_server" -s project
claude mcp remove "dup_server" -s user
```

这说明旧主线在多 scope 冲突时是“阻止歧义删除”的，而不是静默删除某一个。

### `mcp add-json`

真实结论：

- 可用
- 会原样保留 `headers`
- 会原样保留 `oauth`

验证结果：

在隔离环境中执行：

```bash
mcp add-json -s user json_http '{"type":"http","url":"http://127.0.0.1:9/mcp","headers":{"Authorization":"Bearer test-token","X-Test":"yes"},"oauth":{"clientId":"client-123","callbackPort":8787}}'
```

结果：

- 正常输出 `Added http MCP server json_http to user config`
- 隔离 `~/.claude.json` 中真实写入了 `headers` 和 `oauth`

### `mcp reset-project-choices`

真实结论：

- 可用
- 会清空当前项目的：
  - `enabledMcpjsonServers`
  - `disabledMcpjsonServers`
  - `enableAllProjectMcpServers`

验证结果：

在隔离环境中预置项目级选择状态后执行：

```bash
mcp reset-project-choices
```

输出包含：

- `All project-scoped (.mcp.json) server approvals and rejections have been reset.`

结果：

- 当前项目对应键下的 `enabledMcpjsonServers` 被清成 `[]`
- `disabledMcpjsonServers` 被清成 `[]`
- `enableAllProjectMcpServers` 被改成 `false`

注意：

- macOS 临时目录路径常会从 `/var/...` 被标准化成 `/private/var/...`
- 项目配置键命中使用的是运行时标准化后的绝对路径
- 如果手工预置配置时用了“未标准化”的项目路径键，`reset-project-choices` 不会回写那个旧键，而会在标准化键下写入新的项目记录
- 这是路径归一化差异，不是命令失效

## 真实样本

### `user` scope 写入样式

写入隔离 `~/.claude.json` 顶层：

```json
{
  "mcpServers": {
    "user_http": {
      "type": "http",
      "url": "http://127.0.0.1:9/mcp"
    }
  }
}
```

### `local` scope 写入样式

写入隔离 `~/.claude.json` 的项目段：

```json
{
  "projects": {
    "/path/to/project": {
      "mcpServers": {
        "local_http": {
          "type": "http",
          "url": "http://127.0.0.1:9/mcp"
        }
      }
    }
  }
}
```

### `project` scope 写入样式

写入当前目录 `.mcp.json`：

```json
{
  "mcpServers": {
    "project_http": {
      "type": "http",
      "url": "http://127.0.0.1:9/mcp"
    }
  }
}
```

## 当前结论

旧主线正式 CLI 的 MCP 基础配置链路是真实可用的，不是壳子：

- `add`: 通过
- `add-json`: 通过
- `list`: 通过，并带健康检查
- `get`: 通过，并带健康检查
- `remove`: 通过
- 多 scope remove 歧义保护：通过
- `reset-project-choices`: 通过

## 自动化基线

当前已形成两层 MCP 审计脚本：

- `/Users/yanluohao/开发/cc-local/scripts/smoke-mcp-config.sh`
  负责基础 `add/list/get/remove`
- `/Users/yanluohao/开发/cc-local/scripts/deep-mcp-config.sh`
  负责 `add-json`、headers/oauth、多 scope remove、`reset-project-choices`

## 下一步建议

下一批建议继续审计：

1. `mcp serve` 的真实启动与最小握手
2. `mcp add --transport sse` 的真实 health check 行为
3. `mcp add --transport stdio` 的最小闭环
4. `.mcp.json` 与 `local/user` 配置合并优先级
