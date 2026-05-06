import capitalize from 'lodash-es/capitalize.js'
import type { SettingSource } from '../../utils/settings/constants.js'
import { getSettingSourceName } from '../../utils/settings/constants.js'
import { t } from '../../utils/i18n/index.js'

export function getAgentSourceDisplayName(
  source: SettingSource | 'all' | 'built-in' | 'plugin',
): string {
  if (source === 'all') {
    return 'Agents'
  }
  if (source === 'built-in') {
    return t('agents.builtInAgents')
  }
  if (source === 'plugin') {
    return 'Plugin agents'
  }
  return capitalize(getSettingSourceName(source))
}
