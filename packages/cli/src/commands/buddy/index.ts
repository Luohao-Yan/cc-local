import type { Command } from '../../commands.js'

// buddy 命令注册：终端宠物伴侣系统的入口命令
// 类型为 local-jsx，通过懒加载方式导入实现文件
const buddy = {
  type: 'local-jsx',
  name: 'buddy',
  description: 'Hatch a coding companion · pet, off',
  isEnabled: () => true,
  argumentHint: '[pet|off]',
  load: () => import('./buddy.js'),
} satisfies Command

export default buddy
