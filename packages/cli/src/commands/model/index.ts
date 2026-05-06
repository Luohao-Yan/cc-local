import type { Command } from '../../commands.js'
import { t } from '../../utils/i18n/index.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'
import { getMainLoopModel, renderModelName } from '../../utils/model/model.js'

export default {
  type: 'local-jsx',
  name: 'model',
  get description() {
    const modelName = renderModelName(getMainLoopModel())
    return t('command.description.model-with-current', { model: modelName })
  },
  argumentHint: '[add | list | edit | remove | check | model]',
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./model.js'),
} satisfies Command
