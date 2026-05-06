import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'
import { hasAnthropicApiKeyAuth } from '../../utils/auth.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

export default () =>
  ({
    type: 'local-jsx',
    name: 'login',
    get description() {
      return hasAnthropicApiKeyAuth()
        ? t('command.description.login-switch')
        : t('command.description.login')
    },
    isEnabled: () => !isEnvTruthy(process.env.DISABLE_LOGIN_COMMAND),
    load: () => import('./login.js'),
  }) satisfies Command
