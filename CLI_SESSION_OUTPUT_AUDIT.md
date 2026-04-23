# CLI Session And Output Audit

审计对象：

- `bun run start`
- `dist/cli.js`
- 旧主线会话恢复与输出模式

审计日期：

- 2026-04-20

## 审计范围

本轮只审计以下能力：

- `--print`
- `--output-format=json`
- `--output-format=stream-json`
- `--no-session-persistence`
- `--resume <session-id>`
- `--continue`

## 真实检查结果

### `--print`

结论：

- 可用

本地执行：

```bash
bun run start -- --print "hello"
```

结果：

- 正常返回单轮文本响应
- 会在当前项目的 `~/.claude/projects/-Users-yanluohao----cc-local/` 下落盘对应 session

### `--output-format=json`

结论：

- 可用

本地执行：

```bash
bun run start -- --print "hello" --output-format json
```

结果：

- 返回单个 JSON `result` 对象
- 包含 `session_id`、`result`、`usage`、`modelUsage`、`stop_reason`

### `--output-format=stream-json`

结论：

- 可用，但有真实前置条件

本地执行：

```bash
printf '{"type":"user","message":{"role":"user","content":"hello stream"}}\n' | \
  bun run start -- --print --verbose --input-format stream-json --output-format stream-json
```

结果：

- 正常返回流式 JSON 事件
- 会先输出 `system/init`
- 会输出 assistant 中间事件和最终 `result`

额外发现：

- 如果不加 `--verbose`，会直接报错
- 真实错误文案是：`When using --print, --output-format=stream-json requires --verbose`

这说明该模式不仅依赖 `--output-format=stream-json`，还依赖 `--verbose`

### `--no-session-persistence`

结论：

- 当前看起来有效

本地执行：

```bash
bun run start -- --print "ephemeral check" --no-session-persistence --output-format json
```

结果：

- 命令正常返回 JSON `result`
- 返回的 `session_id` 为 `d49aff02-9a14-47d5-90ab-f05f9374eddd`
- 在 `~/.claude/projects/-Users-yanluohao----cc-local/` 中没有找到对应 `d49aff02-9a14-47d5-90ab-f05f9374eddd.jsonl`

说明：

- 这说明“返回成功但不落盘”这一核心行为符合预期
- 还没有继续审计更深层的内存态/跨进程状态，因此目前标记为“看起来有效”

### `--resume <session-id>`

结论：

- 可用

本地执行：

```bash
bun run start -- --resume 9c2fd6a6-c449-4dbd-abd0-87cb9df2a23e --print "resume check" --output-format json
```

结果：

- 命令成功返回
- 返回的 `session_id` 仍然是原 session：`9c2fd6a6-c449-4dbd-abd0-87cb9df2a23e`
- 对应 `.jsonl` 文件末尾能看到新追加的 assistant 结果和 `last-prompt`

### `--continue`

结论：

- 可用，但耗时明显更高

本地执行：

```bash
bun run start -- --continue --print "continue check" --output-format json
```

结果：

- 命令成功返回
- 实际继续的是当前目录最近一次会话
- 返回的 `session_id` 为 `616eea9f-7478-4ef5-8ec4-f60e76335034`
- 对应 `.jsonl` 文件能看到继续后的新结果

额外发现：

- `--continue` 比普通 `--print` 明显更慢
- 本次实际检查耗时接近 `77s`
- 这很可能与自动加载历史上下文有关

## 当前结论

这一批会话与输出链路的结论是：

- `--print`: 通过
- `--output-format=json`: 通过
- `--output-format=stream-json`: 通过，但依赖 `--verbose`
- `--no-session-persistence`: 核心行为通过
- `--resume`: 通过
- `--continue`: 通过，但存在性能风险

## 风险与后续建议

### 高风险点

- `--continue` 的耗时偏高，需要后续再做性能审计
- `stream-json` 依赖 `--verbose` 这个真实约束，应该进入文档或 smoke 说明

### 下一步建议

下一批建议继续审计：

1. `--output-format=json|stream-json` 与 `--include-partial-messages`
2. `--input-format=stream-json` + `--replay-user-messages`
3. `--fork-session`
4. `--no-session-persistence` 在 resume/continue 组合下的行为
