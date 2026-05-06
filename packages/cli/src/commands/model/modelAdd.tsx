/**
 * /model add — Interactive provider and model setup.
 *
 * Flow: baseUrl → apiKey (Enter to skip for local) → model name → alias (optional)
 * When baseUrl matches existing provider, offer to append model.
 * After save, sends a lightweight test request to verify connectivity.
 * On failure: save anyway / retry / cancel.
 */

import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Select } from '../../components/CustomSelect/select.js'
import type { OptionWithDescription } from '../../components/CustomSelect/select.js'
import {
  getGlobalModelConfig,
  saveGlobalModelConfig,
} from '../../utils/model/modelConfig.js'
import { activateModel, type ResolvedModel } from '../../utils/model/multiModel.js'
import { detectProviderFromUrl, getDefaultAPIFormat, type APIFormat } from '../../utils/model/providers.js'
import { sideQuery } from '../../utils/sideQuery.js'
import type { CommandResultDisplay, LocalJSXCommandCall, LocalJSXCommandOnDone } from '../../types/command.js'
import { t } from '../../utils/i18n/index.js'

type AddStep =
  | 'input-url'
  | 'input-format'
  | 'input-key'
  | 'input-model'
  | 'input-alias'
  | 'confirm-append'
  | 'verifying'
  | 'verify-failed'
  | 'done'

export function ModelAdd({
  onDone,
}: {
  onDone: LocalJSXCommandOnDone
}): React.ReactElement {
  const [step, setStep] = React.useState<AddStep>('input-url')
  const [baseUrl, setBaseUrl] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [modelName, setModelName] = React.useState('')
  const [existingProviderKey, setExistingProviderKey] = React.useState<string | null>(null)
  const [verifyError, setVerifyError] = React.useState('')
  const [alias, setAlias] = React.useState('')
  const [apiFormat, setApiFormat] = React.useState<APIFormat>('openai')

  const handleCancel = React.useCallback(() => {
    onDone(t('modelAdd.cancel'), { display: 'system' })
  }, [onDone])

  // baseUrl input → format selection (or confirm-append)
  const handleUrlSubmit = React.useCallback((value: string) => {
    const url = value.trim()
    if (!url) return
    setBaseUrl(url)
    // Auto-detect API format from URL
    const detectedProvider = detectProviderFromUrl(url)
    const detectedFormat = getDefaultAPIFormat(detectedProvider)
    setApiFormat(detectedFormat)

    const config = getGlobalModelConfig()
    const matchedKey = Object.keys(config.providers).find(
      (key) => config.providers[key]!.baseUrl === url,
    )
    if (matchedKey) {
      setExistingProviderKey(matchedKey)
      setStep('confirm-append')
    } else {
      setStep('input-format')
    }
  }, [])

  // Confirm append to existing provider
  const handleAppendConfirm = React.useCallback(
    (value: string) => {
      if (value === 'yes') {
        const config = getGlobalModelConfig()
        const provider = existingProviderKey ? config.providers[existingProviderKey] : null
        if (provider?.apiKey) setApiKey(provider.apiKey)
        setStep('input-model')
      } else {
        setExistingProviderKey(null)
        setStep('input-key')
      }
    },
    [existingProviderKey],
  )

  const handleKeySubmit = React.useCallback((value: string) => {
    setApiKey(value.trim())
    setStep('input-model')
  }, [])

  const handleModelSubmit = React.useCallback((value: string) => {
    if (value.trim()) {
      setModelName(value.trim())
      setStep('input-alias')
    }
  }, [])

  // Alias input → verify
  const handleAliasSubmit = React.useCallback(
    (value: string) => {
      const resolvedAlias = value.trim()
      setAlias(resolvedAlias)
      setStep('verifying')

      const tempResolved: ResolvedModel = {
        providerKey: 'custom', providerName: 'Custom', modelKey: modelName,
        modelName, baseUrl, apiKey: apiKey || null, aliases: resolvedAlias ? [resolvedAlias] : [],
        apiFormat, providerType: detectProviderFromUrl(baseUrl), headers: undefined,
      }
      activateModel(tempResolved)

      // 检查是否是第一个模型（在保存之前）
      const isFirstModel = Object.keys(getGlobalModelConfig().providers).length === 0

      sideQuery({
        querySource: 'model_validation', model: modelName, max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      })
        .then(() => {
          saveConfig(baseUrl, apiKey, modelName, resolvedAlias, existingProviderKey, apiFormat)
          finishAdd(baseUrl, modelName, resolvedAlias, apiFormat, onDone, isFirstModel)
          setStep('done')
        })
        .catch((err: unknown) => {
          setVerifyError(err instanceof Error ? err.message : String(err))
          setStep('verify-failed')
        })
    },
    [baseUrl, apiKey, modelName, existingProviderKey, onDone],
  )

  // Verify failed options
  const handleVerifyFailChoice = React.useCallback(
    (value: string) => {
      // 检查是否是第一个模型（在保存之前）
      const isFirstModel = Object.keys(getGlobalModelConfig().providers).length === 0

      if (value === 'save') {
        saveConfig(baseUrl, apiKey, modelName, alias, existingProviderKey, apiFormat)
        finishAdd(baseUrl, modelName, alias, apiFormat, onDone, isFirstModel)
        setStep('done')
      } else if (value === 'retry-url') {
        // 从头重试：清空所有状态
        setStep('input-url')
        setBaseUrl(''); setApiKey(''); setModelName('')
        setExistingProviderKey(null); setVerifyError(''); setAlias('')
      } else if (value === 'retry-key') {
        // 只重新输入 apiKey
        setStep('input-key')
        setVerifyError('')
      } else if (value === 'retry-model') {
        // 只重新输入 model name
        setStep('input-model')
        setVerifyError('')
      } else {
        onDone(t('modelAdd.cancel'), { display: 'system' })
      }
    },
    [baseUrl, apiKey, modelName, alias, existingProviderKey, onDone],
  )

  // Format selection → input-key
  const handleFormatSelect = React.useCallback((value: string) => {
    setApiFormat(value as APIFormat)
    setStep('input-key')
  }, [])

  // Render steps
  if (step === 'input-url') {
    return (
      <InputStep
        title={t('modelAdd.step1')}
        hint={[
          t('modelAdd.hintBaseUrl'),
          t('modelAdd.examples'),
          `  ${t('modelAdd.exampleDoubaoUrl')}`,
          `  ${t('modelAdd.exampleDeepSeekUrl')}`,
          `  ${t('modelAdd.exampleOpenAIUrl')}`,
          `  ${t('modelAdd.exampleLocalUrl')}`,
        ]}
        prompt={t('modelAdd.promptBaseUrl')}
        placeholder="e.g. https://api.openai.com/v1"
        onSubmit={handleUrlSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-format') {
    const detectedLabel = apiFormat === 'openai' ? t('modelAdd.formatOpenAI') : t('modelAdd.formatAnthropic')
    return (
      <Box flexDirection="column">
        <Text bold>{t('modelAdd.step2')}</Text>
        <Text> </Text>
        <Text dimColor>{t('modelAdd.detected', { format: detectedLabel })}</Text>
        <Text dimColor>{t('modelAdd.detectedHint')}</Text>
        <Text> </Text>
        <Select
          options={[
            {
              label: t('modelAdd.formatOpenAI') + ' (/v1/chat/completions)',
              value: 'openai',
              description: t('modelAdd.formatOpenAIDesc'),
            },
            {
              label: t('modelAdd.formatAnthropic') + ' (/v1/messages)',
              value: 'anthropic',
              description: t('modelAdd.formatAnthropicDesc'),
            },
          ]}
          onChange={handleFormatSelect} onCancel={handleCancel}
        />
      </Box>
    )
  }
  if (step === 'confirm-append') {
    const config = getGlobalModelConfig()
    const providerName = existingProviderKey ? config.providers[existingProviderKey]?.name || existingProviderKey : ''
    const existingKey = existingProviderKey ? config.providers[existingProviderKey]?.apiKey : null
    return (
      <Box flexDirection="column">
        <Text bold>{t('modelAdd.providerExists')}</Text>
        <Text> </Text>
        <Text bold>{t('modelAdd.providerLabel', { name: providerName })}</Text>
        <Text> </Text>
        <Text dimColor>{t('modelAdd.sameUrlFound')}</Text>
        <Text> </Text>
        <Select
          options={[
            {
              label: t('modelAdd.yesAddToExisting'),
              value: 'yes',
              description: existingKey ? t('modelAdd.reusesApiKey', { keySuffix: existingKey.slice(-4) }) : t('modelAdd.noApiKey'),
            },
            {
              label: t('modelAdd.noCreateNew'),
              value: 'no',
              description: t('modelAdd.differentKeyHint'),
            },
          ]}
          onChange={handleAppendConfirm} onCancel={handleCancel}
        />
      </Box>
    )
  }
  if (step === 'input-key') {
    return (
      <InputStep
        title={t('modelAdd.step3')}
        hint={[
          t('modelAdd.hintApiKey'),
          t('modelAdd.findApiKeyHint'),
          t('modelAdd.hintApiKeySkip'),
        ]}
        prompt={t('modelAdd.promptApiKey')}
        placeholder="e.g. sk-xxxxxxxx"
        onSubmit={handleKeySubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-model') {
    return (
      <InputStep
        title={t('modelAdd.step4')}
        hint={[
          t('modelAdd.hintModelName'),
          t('modelAdd.examples'),
          `  ${t('modelAdd.exampleDoubaoModel')}`,
          `  ${t('modelAdd.exampleDeepSeekModel')}`,
          `  ${t('modelAdd.exampleOpenAIModel')}`,
          `  ${t('modelAdd.exampleLocalModel')}`,
        ]}
        prompt={t('modelAdd.promptModelName')}
        placeholder="gpt-4o"
        onSubmit={handleModelSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-alias') {
    return (
      <InputStep
        title={t('modelAdd.step5')}
        hint={[
          t('modelAdd.hintAlias'),
          t('modelAdd.aliasExample', { alias: 'doubao' }),
          t('modelAdd.pressEnterSkip'),
        ]}
        prompt={t('modelAdd.promptAlias')}
        placeholder=""
        onSubmit={handleAliasSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'verifying') {
    return <Box flexDirection="column"><Text>{t('modelAdd.verifying')}</Text></Box>
  }
  if (step === 'verify-failed') {
    return (
      <Box flexDirection="column">
        <Text color="red">{t('modelAdd.verificationFailed', { error: verifyError })}</Text>
        <Text> </Text>
        <Text dimColor>{t('modelAdd.whatToDo')}</Text>
        <Select
          options={[
            { label: t('modelAdd.saveAnyway'), value: 'save', description: t('modelAdd.saveAnywayDesc') },
            { label: t('modelAdd.fixApiKey'), value: 'retry-key', description: t('modelAdd.fixApiKeyDesc') },
            { label: t('modelAdd.fixModelName'), value: 'retry-model', description: t('modelAdd.fixModelNameDesc') },
            { label: t('modelAdd.startOver'), value: 'retry-url', description: t('modelAdd.startOverDesc') },
            { label: t('common.cancel'), value: 'cancel' },
          ]}
          onChange={handleVerifyFailChoice} onCancel={handleCancel}
        />
      </Box>
    )
  }
  return <Text> </Text>
}

function InputStep({ title, hint, prompt, placeholder, onSubmit, onCancel }: {
  title: string; hint: string[]; prompt: string; placeholder: string
  onSubmit: (value: string) => void; onCancel: () => void
}): React.ReactElement {
  const [inputValue, setInputValue] = React.useState('')
  // option.value 使用 title 作为唯一 key，避免 Select 内部 inputValues Map 跨步复用缓存
  const options: OptionWithDescription[] = React.useMemo(() => [{
    label: prompt, value: title, type: 'input' as const, placeholder,
    onChange: (v: string) => { setInputValue(v) },
    allowEmptySubmitToCancel: true,
  }], [prompt, placeholder, title])
  const handleChange = React.useCallback(() => { onSubmit(inputValue) }, [onSubmit, inputValue])
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Text> </Text>
      {hint.map((line, i) => <Text key={i} dimColor>{line}</Text>)}
      <Text> </Text>
      {/* hideIndexes: select.tsx 将 maxIndexWidth 传 -2，让 padEnd(0) 输出空字符串隐藏序号 */}
      <Select options={options} onChange={handleChange} onCancel={onCancel} hideIndexes />
    </Box>
  )
}

/**
 * 从 baseUrl 推断 provider key。
 * 如果 key 已存在，自动加 -2/-3 后缀，避免覆盖已有 provider。
 */
function deriveProviderKey(baseUrl: string, existingKeys?: string[]): string {
  let base: string
  try {
    const parts = new URL(baseUrl).hostname.split('.')
    base = (parts.length >= 2 ? parts.find(p => !['api', 'www', 'v1', 'v2'].includes(p)) : parts[0]) || 'custom'
  } catch { base = 'custom' }

  if (!existingKeys || !existingKeys.includes(base)) return base

  // 冲突时加数字后缀
  let i = 2
  while (existingKeys.includes(`${base}-${i}`)) i++
  return `${base}-${i}`
}

function saveConfig(baseUrl: string, apiKey: string, modelName: string, alias: string, existingProviderKey: string | null, format: APIFormat): void {
  if (existingProviderKey) {
    saveGlobalModelConfig((current) => {
      const provider = current.providers[existingProviderKey]
      if (!provider) return current
      // When appending to existing provider, update apiFormat at provider level
      const updatedProvider = {
        ...provider,
        apiFormat: format,
        models: { ...provider.models, [modelName]: {
          name: modelName, ...(alias ? { alias: [alias] } : {}),
        }},
      }
      return { ...current, providers: { ...current.providers, [existingProviderKey]: updatedProvider } }
    })
  } else {
    saveGlobalModelConfig((current) => {
      const providerKey = deriveProviderKey(baseUrl, Object.keys(current.providers))
      const isFirstModel = Object.keys(current.providers).length === 0
      const modelRef = alias || modelName
      return {
        ...current,
        // 如果是第一个添加的模型，自动设置为 defaultModel 和 smallFastModel
        ...(isFirstModel ? { defaultModel: modelRef, smallFastModel: modelRef } : {}),
        providers: { ...current.providers, [providerKey]: {
          name: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
          baseUrl, ...(apiKey ? { apiKey } : {}),
          // Always save apiFormat - the user's choice should be persisted
          apiFormat: format,
          models: { [modelName]: { name: modelName, ...(alias ? { alias: [alias] } : {}) } },
        }},
      }
    })
  }
}

function finishAdd(baseUrl: string, modelName: string, alias: string, format: APIFormat, onDone: LocalJSXCommandOnDone, isFirstModel: boolean = false): void {
  const switchCmd = alias ? `/model ${alias}` : `/model ${modelName}`
  const formatLabel = format === 'openai' ? t('modelAdd.formatOpenAI') : t('modelAdd.formatAnthropic')
  const lines = [
    t('modelAdd.modelAddedSuccess'),
    `  ${t('modelAdd.modelLabel')}   : ${modelName}`,
    alias ? `  ${t('modelAdd.aliasLabel')}   : ${alias}` : '',
    `  ${t('modelAdd.endpointLabel')}: ${baseUrl}`,
    `  ${t('modelAdd.formatLabel')}  : ${formatLabel}`,
    '',
    isFirstModel
      ? t('modelAdd.firstModelHint')
      : '',
    t('modelAdd.nextHint', { switchCmd }),
    isFirstModel ? t('modelAdd.addMoreHint') : '',
  ].filter(Boolean).join('\n')
  onDone(lines, { display: 'system' as CommandResultDisplay })
}

export const call: LocalJSXCommandCall = async (onDone, _context, _args) => {
  return <ModelAdd onDone={onDone} />
}
