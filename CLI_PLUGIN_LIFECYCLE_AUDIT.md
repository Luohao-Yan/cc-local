# CLI Plugin Lifecycle Audit

审计对象：

- 正式 CLI：`bun run start`
- 正式构建物：`/Users/yanluohao/开发/cc-local/dist/cli.js`
- 旧主线插件生命周期命令

审计日期：

- 2026-04-20

## 审计范围

本轮审计以下真实行为：

- `plugin marketplace add`
- `plugin install`
- `plugin update`
- `plugin uninstall`

## 实际结论

通过本地目录 marketplace 做了完整闭环验证：

- `plugin marketplace add`：通过
- `plugin install`：通过
- `plugin update`：通过
- `plugin uninstall`：通过

验证方式：

- 在隔离 `HOME` 和本地 marketplace 目录中构造：
  - `.claude-plugin/marketplace.json`
  - `plugins/smoke-plugin/.claude-plugin/plugin.json`
- 先发布 `1.0.0`
- 安装插件
- 再把 marketplace 和 plugin manifest 升到 `1.1.0`
- 执行 `plugin marketplace update` 和 `plugin update`
- 最后执行 `plugin uninstall`

真实结果：

- 安装时成功输出 `Successfully installed plugin`
- 更新时成功输出 `updated from 1.0.0 to 1.1.0`
- 卸载时成功输出 `Successfully uninstalled plugin`

## 自动化基线

本轮新增：

- `/Users/yanluohao/开发/cc-local/scripts/smoke-plugin-lifecycle.sh`

## 当前结论

旧主线插件 CLI 现在已经至少验证到本地 marketplace 的完整生命周期闭环。
