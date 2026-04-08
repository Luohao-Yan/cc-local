/**
 * /model remove <别名或模型名> 子命令
 *
 * 从全局配置中移除指定模型。
 * 支持通过别名、模型 ID（key）、模型显示名称匹配（不区分大小写）。
 * 移除前需用户确认。
 * 如果该模型是 Provider 下唯一的模型，则移除整个 Provider。
 */

import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Select } from '../../components/CustomSelect/select.js'
import {
  getGlobalModelConfig,
  saveGlobalModelConfig,
} from '../../utils/model/modelConfig.js'
import { getConfiguredModels, type ResolvedModel } from '../../utils/model/multiModel.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

// ===== 辅助函数 =====

/**
 * 根据用户输入查找匹配的模型（不区分大小写）。
 * 匹配顺序：别名 → 模型 ID（key） → 模型显示名称。
 */
function findModel(input: string): ResolvedModel | null {
  const models = getConfiguredModels()
  const query = input.trim().toLowerCase()

  // 按别名匹配
  let matched = models.find(m =>
    m.aliases.some(a => a.toLowerCase() === query),
  )

  // 按模型 ID 匹配
  if (!matched) {
    matched = models.find(m => m.modelKey.toLowerCase() === query)
  }

  // 按模型显示名称匹配
  if (!matched) {
    matched = models.find(m => m.modelName.toLowerCase() === query)
  }

  return matched ?? null
}

/**
 * 从全局配置中移除指定模型。
 * 如果该 Provider 下只有这一个模型，则移除整个 Provider。
 */
function removeModelFromConfig(model: ResolvedModel): void {
  saveGlobalModelConfig((current) => {
    const provider = current.providers[model.providerKey]
    if (!provider) return current

    const modelCount = Object.keys(provider.models).length

    if (modelCount <= 1) {
      // Provider 下只有一个模型，移除整个 Provider
      const { [model.providerKey]: _, ...restProviders } = current.providers
      return {
        ...current,
        providers: restProviders,
      }
    }

    // Provider 下有多个模型，仅移除指定模型
    const { [model.modelKey]: _, ...restModels } = provider.models
    return {
      ...current,
      providers: {
        ...current.providers,
        [model.providerKey]: {
          ...provider,
          models: restModels,
        },
      },
    }
  })
}

// ===== 组件 =====

/**
 * /model remove 交互式组件。
 * 查找模型 → 确认 → 移除。
 */
export function ModelRemove({
  onDone,
  modelInput,
}: {
  onDone: (message: string, options?: { display: string }) => void
  modelInput: string
}): React.ReactElement {
  // 查找匹配的模型
  const matched = React.useMemo(() => findModel(modelInput), [modelInput])

  // 确认选择处理
  const handleConfirm = React.useCallback(
    (value: string) => {
      if (value === 'yes' && matched) {
        removeModelFromConfig(matched)
        const aliasInfo = matched.aliases.length > 0
          ? ` (别名: ${matched.aliases.join(', ')})`
          : ''
        onDone(
          `已移除模型 "${matched.modelKey}"${aliasInfo}，Provider: ${matched.providerName}`,
          { display: 'system' },
        )
      } else {
        onDone('已取消移除。', { display: 'system' })
      }
    },
    [matched, onDone],
  )

  // 取消处理
  const handleCancel = React.useCallback(() => {
    onDone('已取消移除。', { display: 'system' })
  }, [onDone])

  // 未找到匹配模型
  if (!matched) {
    // 直接通知并退出
    React.useEffect(() => {
      onDone(`未找到匹配 "${modelInput}" 的模型。请使用 /model list 查看已配置的模型。`, {
        display: 'system',
      })
    }, [modelInput, onDone])
    return <Text> </Text>
  }

  // 构建确认信息
  const aliasDisplay = matched.aliases.length > 0
    ? `  别名: ${matched.aliases.join(', ')}`
    : ''

  // 检查是否会移除整个 Provider
  const config = getGlobalModelConfig()
  const provider = config.providers[matched.providerKey]
  const willRemoveProvider = provider
    ? Object.keys(provider.models).length <= 1
    : false

  return (
    <Box flexDirection="column">
      <Text>确认移除以下模型？</Text>
      <Text> </Text>
      <Text>  模型: {matched.modelKey} ({matched.modelName})</Text>
      {aliasDisplay ? <Text>{aliasDisplay}</Text> : null}
      <Text>  Provider: {matched.providerName}</Text>
      {willRemoveProvider && (
        <Text color="yellow">  ⚠ 该 Provider 下仅有此模型，将同时移除整个 Provider</Text>
      )}
      <Text> </Text>
      <Select
        options={[
          { label: '是，确认移除', value: 'yes' },
          { label: '否，取消', value: 'no' },
        ]}
        onChange={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  )
}

// ===== 命令入口 =====

/** /model remove 命令入口（匹配 LocalJSXCommandCall 模式） */
export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const modelInput = (args || '').trim()

  // 未提供参数时提示用法
  if (!modelInput) {
    onDone('用法: /model remove <别名或模型名>\n\n使用 /model list 查看已配置的模型。', {
      display: 'system',
    })
    return
  }

  return <ModelRemove onDone={onDone} modelInput={modelInput} />
}
