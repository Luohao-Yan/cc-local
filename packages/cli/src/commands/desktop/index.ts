import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'

function isSupportedPlatform(): boolean {
  if (process.platform === 'darwin') {
    return true
  }
  if (process.platform === 'win32' && process.arch === 'x64') {
    return true
  }
  return false
}

const desktop = {
  type: 'local-jsx',
  name: 'desktop',
  aliases: ['app'],
  get description() { return t('command.description.desktop') },
  availability: ['claude-ai'],
  isEnabled: isSupportedPlatform,
  get isHidden() {
    return !isSupportedPlatform()
  },
  load: () => import('./desktop.js'),
} satisfies Command

export default desktop
