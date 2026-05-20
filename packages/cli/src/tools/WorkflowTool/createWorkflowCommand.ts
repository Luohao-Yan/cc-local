import { resolve } from 'path'
import { t } from '../../utils/i18n/index.js'

export async function getWorkflowCommands(
  cwd: string,
): Promise<Array<import('../../commands.js').Command>> {
  return []
}
