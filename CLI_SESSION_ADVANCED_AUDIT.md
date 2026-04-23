# CLI Session Advanced Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 高级会话恢复与流式输出选项

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下真实行为：

- `--fork-session`
- `--replay-user-messages`
- `--include-partial-messages`

## 实际结论

### `--fork-session`

真实结论：

- 可用
- 会基于原会话创建新的 session id

验证方式：

- 先创建一个基础 `--print --output-format json` 会话
- 再执行：

```bash
claude --resume <session_id> --fork-session --print "say ok again" --output-format json
```

结果：

- 第二次返回成功
- `session_id` 与原始会话不同

### `--replay-user-messages`

真实结论：

- 可用

验证方式：

- 用 `stream-json` 输入输出模式
- 打开 `--replay-user-messages`

结果：

- 输出流中包含：
  - `"type":"user"`
  - `"isReplay":true`

### `--include-partial-messages`

真实结论：

- 可用

验证方式：

- 同样使用 `stream-json` 模式
- 打开 `--include-partial-messages`

结果：

- 输出流中可见：
  - `content_block_delta`
  - `text_delta`
  - `input_json_delta`

这说明部分消息增量没有被吞掉，而是按流式事件实时输出。

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/smoke-session-advanced.sh`

## 当前结论

旧主线高级会话输出这批选项已经有真实基线：

- `--fork-session`: 通过
- `--replay-user-messages`: 通过
- `--include-partial-messages`: 通过
