/**
 * Custom Provider Setup — Reusable component for configuring third-party APIs.
 *
 * Used by:
 * - /login command (option 4: Custom provider)
 * - Can be reused by other flows needing model configuration
 *
 * Flow: baseUrl → format → apiKey → modelName → alias → verify
 * On success: calls onComplete()
 * On cancel: calls onCancel()
 */

import * as React from 'react'
import { Box, Text } from '../ink.js'
import { Select } from './CustomSelect/select.js'
import type { OptionWithDescription } from './CustomSelect/select.js'
import {
  getGlobalModelConfig,
  saveGlobalModelConfig,
} from '../utils/model/modelConfig.js'
import { activateModel, type ResolvedModel } from '../utils/model/multiModel.js'
import { detectProviderFromUrl, getDefaultAPIFormat, type APIFormat } from '../utils/model/providers.js'
import { sideQuery } from '../utils/sideQuery.js'
import { t } from '../utils/i18n/index.js'

type SetupStep =
  | 'input-url'
  | 'input-format'
  | 'input-key'
  | 'input-model'
  | 'input-alias'
  | 'confirm-append'
  | 'verifying'
  | 'verify-failed'
  | 'done'

export interface CustomProviderSetupProps {
  /** Called when setup completes successfully */
  onComplete: (modelName: string, alias: string) => void
  /** Called when user cancels the setup */
  onCancel: () => void
}

export function CustomProviderSetup({
  onComplete,
  onCancel,
}: CustomProviderSetupProps): React.ReactElement {
  const [step, setStep] = React.useState<SetupStep>('input-url')
  const [baseUrl, setBaseUrl] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [modelName, setModelName] = React.useState('')
  const [existingProviderKey, setExistingProviderKey] = React.useState<string | null>(null)
  const [verifyError, setVerifyError] = React.useState('')
  const [alias, setAlias] = React.useState('')
  const [apiFormat, setApiFormat] = React.useState<APIFormat>('openai')

  const handleCancel = React.useCallback(() => {
    onCancel()
  }, [onCancel])

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
          setStep('done')
          onComplete(modelName, resolvedAlias)
        })
        .catch((err: unknown) => {
          setVerifyError(err instanceof Error ? err.message : String(err))
          setStep('verify-failed')
        })
    },
    [baseUrl, apiKey, modelName, existingProviderKey, onComplete, apiFormat],
  )

  // Verify failed options
  const handleVerifyFailChoice = React.useCallback(
    (value: string) => {
      if (value === 'save') {
        saveConfig(baseUrl, apiKey, modelName, alias, existingProviderKey, apiFormat)
        setStep('done')
        onComplete(modelName, alias)
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
        onCancel()
      }
    },
    [baseUrl, apiKey, modelName, alias, existingProviderKey, onComplete, onCancel, apiFormat],
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
        title={t('customProvider.step1Title')}
        hint={[
          t('customProvider.step1Hint1'),
          t('customProvider.step1Hint2'),
          `  ${t('customProvider.step1HintDoubao')}`,
          `  ${t('customProvider.step1HintDeepSeek')}`,
          `  ${t('customProvider.step1HintOpenAI')}`,
          `  ${t('customProvider.step1HintLocal')}`,
        ]}
        prompt={t('customProvider.step1Prompt')}
        placeholder={t('customProvider.step1Placeholder')}
        onSubmit={handleUrlSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-format') {
    const detectedLabel = apiFormat === 'openai' ? t('customProvider.formatOpenAI') : t('customProvider.formatAnthropic')
    return (
      <Box flexDirection="column">
        <Text bold>{t('customProvider.step2Title')}</Text>
        <Text> </Text>
        <Text dimColor>{t('customProvider.step2Detected', { format: detectedLabel })}</Text>
        <Text dimColor>{t('customProvider.step2Override')}</Text>
        <Text> </Text>
        <Select
          options={[
            {
              label: t('customProvider.step2OpenAI'),
              value: 'openai',
              description: t('customProvider.step2OpenAIDesc'),
            },
            {
              label: t('customProvider.step2Anthropic'),
              value: 'anthropic',
              description: t('customProvider.step2AnthropicDesc'),
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
        <Text bold>{t('customProvider.providerExists')}</Text>
        <Text> </Text>
        <Text bold>{t('customProvider.providerLabel', { name: providerName })}</Text>
        <Text> </Text>
        <Text dimColor>{t('customProvider.sameBaseUrl')}</Text>
        <Text> </Text>
        <Select
          options={[
            {
              label: t('customProvider.addToExisting'),
              value: 'yes',
              description: existingKey ? t('customProvider.addToExistingDesc', { keySuffix: existingKey.slice(-4) }) : t('customProvider.noApiKey'),
            },
            {
              label: t('customProvider.createNew'),
              value: 'no',
              description: t('customProvider.createNewDesc'),
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
        title={t('customProvider.step3Title')}
        hint={[
          t('customProvider.step3Hint1'),
          t('customProvider.step3Hint2'),
          t('customProvider.step3Hint3'),
        ]}
        prompt={t('customProvider.step3Prompt')}
        placeholder={t('customProvider.step3Placeholder')}
        onSubmit={handleKeySubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-model') {
    return (
      <InputStep
        title={t('customProvider.step4Title')}
        hint={[
          t('customProvider.step4Hint1'),
          t('customProvider.step4Hint2'),
          `  ${t('customProvider.step4HintDoubao')}`,
          `  ${t('customProvider.step4HintDeepSeek')}`,
          `  ${t('customProvider.step4HintOpenAI')}`,
          `  ${t('customProvider.step4HintLocal')}`,
        ]}
        prompt={t('customProvider.step4Prompt')}
        placeholder={t('customProvider.step4Placeholder')}
        onSubmit={handleModelSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-alias') {
    return (
      <InputStep
        title={t('customProvider.step5Title')}
        hint={[
          t('customProvider.step5Hint1'),
          t('customProvider.step5Hint2'),
          t('customProvider.step5Hint3'),
        ]}
        prompt={t('customProvider.step5Prompt')}
        placeholder={t('customProvider.step5Placeholder')}
        onSubmit={handleAliasSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'verifying') {
    return <Box flexDirection="column"><Text>{t('customProvider.verifying')}</Text></Box>
  }
  if (step === 'verify-failed') {
    return (
      <Box flexDirection="column">
        <Text color="red">{t('customProvider.verifyFailed', { error: verifyError })}</Text>
        <Text> </Text>
        <Text dimColor>{t('customProvider.verifyFailedHint')}</Text>
        <Select
          options={[
            { label: t('customProvider.saveAnyway'), value: 'save', description: t('customProvider.saveAnywayDesc') },
            { label: t('customProvider.fixApiKey'), value: 'retry-key', description: t('customProvider.fixApiKeyDesc') },
            { label: t('customProvider.fixModelName'), value: 'retry-model', description: t('customProvider.fixModelNameDesc') },
            { label: t('customProvider.startOver'), value: 'retry-url', description: t('customProvider.startOverDesc') },
            { label: t('customProvider.cancel'), value: 'cancel' },
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
      const updatedProvider = {
        ...provider,
        ...(provider.apiFormat !== format && format !== 'anthropic' ? { apiFormat: format } : {}),
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
        ...(isFirstModel ? { defaultModel: modelRef, smallFastModel: modelRef } : {}),
        providers: { ...current.providers, [providerKey]: {
          name: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
          baseUrl, ...(apiKey ? { apiKey } : {}),
          ...(format !== 'anthropic' ? { apiFormat: format } : {}),
          models: { [modelName]: { name: modelName, ...(alias ? { alias: [alias] } : {}) } },
        }},
      }
    })
  }
}
