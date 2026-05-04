import type { Command } from '../../commands.js'

/**
 * /proactive 命令入口
 *
 * 子命令：
 *   (无参数) — 显示当前状态并切换开关
 *   on       — 激活自主模式
 *   off      — 停止自主模式
 *   pause    — 暂停（保持激活但停止 tick）
 *   resume   — 恢复运行
 *   status   — 显示详细状态
 */
const proactive: Command = {
  type: 'local-jsx',
  name: 'proactive',
  description: 'Toggle proactive autonomous mode · on, off, pause, status',
  isEnabled: () => true,
  argumentHint: '[on|off|pause|resume|status]',
  load: () => import('./proactive/proactive.js'),
}

export default proactive
