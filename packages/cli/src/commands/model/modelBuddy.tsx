/**
 * /model buddy — 设置 buddy (宠物) 使用的模型
 *
 * Buddy 使用 smallFastModel 进行快速推理。
 * 此命令让用户可以单独设置这个模型。
 */

import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { t } from '../../utils/i18n/index.js'
import { getGlobalModelConfig, saveGlobalModelConfig } from '../../utils/model/modelConfig.js'
import { resolveMultiModelConfig, getConfiguredModels } from '../../utils/model/multiModel.js'
import type { LocalJSXCommandCall, LocalJSXCommandOnDone } from '../types.js'

interface ModelBuddyProps {
  onDone: LocalJSXCommandOnDone
  modelArg?: string
}

function ModelBuddy({ onDone, modelArg }: ModelBuddyProps) {
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (modelArg) {
      handleSet(modelArg)
    } else {
      // 没有参数时，显示当前设置
      const currentBuddy = getGlobalModelConfig().smallFastModel
      const models = getConfiguredModels()
      const lines = [
        t('modelBuddy.title'),
        `${t('modelBuddy.current')}: ${currentBuddy || t('modelBuddy.notSet')}`,
        '',
        t('modelBuddy.availableModels') + ':',
        ...models.slice(0, 10).map((m) => `  • ${m.aliases[0] || m.modelKey}`),
        models.length > 10 ? `  ... ${t('modelBuddy.andMore', { count: models.length - 10 })}` : '',
        '',
        t('modelBuddy.usage'),
      ].filter(Boolean)
      onDone(lines.join('\n'), { display: 'system' })
    }
  }, [modelArg, onDone])

  const handleSet = (modelInput: string) => {
    const trimmed = modelInput.trim()
    if (!trimmed) {
      setError(t('modelBuddy.errorEmpty'))
      onDone(t('modelBuddy.errorEmpty'), { display: 'system' })
      return
    }

    // 解析模型引用
    const resolved = resolveMultiModelConfig(trimmed)
    if (!resolved) {
      onDone(t('modelBuddy.errorNotFound', { model: trimmed }), { display: 'system' })
      return
    }

    // 保存配置
    saveGlobalModelConfig((current) => ({
      ...current,
      smallFastModel: trimmed,
    }))

    const lines = [
      t('modelBuddy.success'),
      `  ${t('modelBuddy.modelLabel')}: ${trimmed}`,
      '',
      t('modelBuddy.hint'),
    ]
    onDone(lines.join('\n'), { display: 'system' })
  }

  if (error) {
    return (
      <Box>
        <Text color="red">{error}</Text>
      </Box>
    )
  }

  return null
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const modelArg = args[0]
  return <ModelBuddy onDone={onDone} modelArg={modelArg} />
}
