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
import { sideQuery } from '../../utils/sideQuery.js'
import type { CommandResultDisplay, LocalJSXCommandCall, LocalJSXCommandOnDone } from '../../types/command.js'

type AddStep =
  | 'input-url'
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
  const aliasRef = React.useRef('')

  const handleCancel = React.useCallback(() => {
    onDone('Add model cancelled.', { display: 'system' })
  }, [onDone])

  // baseUrl input
  const handleUrlSubmit = React.useCallback((value: string) => {
    const url = value.trim()
    if (!url) return
    setBaseUrl(url)
    const config = getGlobalModelConfig()
    const matchedKey = Object.keys(config.providers).find(
      (key) => config.providers[key]!.baseUrl === url,
    )
    if (matchedKey) {
      setExistingProviderKey(matchedKey)
      setStep('confirm-append')
    } else {
      setStep('input-key')
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
      const alias = value.trim()
      aliasRef.current = alias
      setStep('verifying')

      const tempResolved: ResolvedModel = {
        providerKey: 'custom', providerName: 'Custom', modelKey: modelName,
        modelName, baseUrl, apiKey: apiKey || null, aliases: alias ? [alias] : [],
      }
      activateModel(tempResolved)

      sideQuery({
        querySource: 'model_validation', model: modelName, max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      })
        .then(() => {
          saveConfig(baseUrl, apiKey, modelName, alias, existingProviderKey)
          finishAdd(baseUrl, modelName, alias, onDone)
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
      const alias = aliasRef.current
      if (value === 'save') {
        saveConfig(baseUrl, apiKey, modelName, alias, existingProviderKey)
        finishAdd(baseUrl, modelName, alias, onDone)
        setStep('done')
      } else if (value === 'retry') {
        setStep('input-url')
        setBaseUrl(''); setApiKey(''); setModelName('')
        setExistingProviderKey(null); setVerifyError(''); aliasRef.current = ''
      } else {
        onDone('Add model cancelled.', { display: 'system' })
      }
    },
    [baseUrl, apiKey, modelName, existingProviderKey, onDone],
  )

  // Render steps
  if (step === 'input-url') {
    return (
      <InputStep
        title="Step 1/4 · API Endpoint"
        hint={[
          'The base URL of the OpenAI-compatible API.',
          'Examples:',
          '  Doubao  : https://ark.cn-beijing.volces.com/api/v3',
          '  DeepSeek: https://api.deepseek.com/v1',
          '  OpenAI  : https://api.openai.com/v1',
          '  Local   : http://localhost:11434/v1',
        ]}
        prompt="Enter baseUrl:"
        placeholder="https://api.openai.com/v1"
        onSubmit={handleUrlSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'confirm-append') {
    const config = getGlobalModelConfig()
    const providerName = existingProviderKey ? config.providers[existingProviderKey]?.name || existingProviderKey : ''
    const existingKey = existingProviderKey ? config.providers[existingProviderKey]?.apiKey : null
    return (
      <Box flexDirection="column">
        <Text bold>Provider already exists: "{providerName}"</Text>
        <Text> </Text>
        <Text dimColor>Same baseUrl found. Choose an option:</Text>
        <Text> </Text>
        <Select
          options={[
            {
              label: 'Yes — add model to existing provider',
              value: 'yes',
              description: existingKey ? `Reuses existing API key (...${existingKey.slice(-4)})` : 'No API key set',
            },
            {
              label: 'No — create new provider with different API key',
              value: 'no',
              description: 'Use this if you have a different key for the same endpoint',
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
        title="Step 2/4 · API Key"
        hint={[
          'The secret key used to authenticate with the provider.',
          'Find it in your provider\'s console / dashboard.',
          'Press Enter to skip for local models (e.g. Ollama).',
        ]}
        prompt="Enter API Key:"
        placeholder="sk-..."
        onSubmit={handleKeySubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-model') {
    return (
      <InputStep
        title="Step 3/4 · Model Name"
        hint={[
          'The exact model ID as required by the API.',
          'Examples:',
          '  Doubao  : doubao-seed-2.0-code',
          '  DeepSeek: deepseek-chat',
          '  OpenAI  : gpt-4o',
          '  Local   : qwen3:32b',
        ]}
        prompt="Enter model name:"
        placeholder="gpt-4o"
        onSubmit={handleModelSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'input-alias') {
    return (
      <InputStep
        title="Step 4/4 · Alias (optional)"
        hint={[
          'A short name to quickly switch to this model.',
          'Example: type "doubao" to use instead of the full model ID.',
          'Press Enter to skip.',
        ]}
        prompt="Enter alias:"
        placeholder=""
        onSubmit={handleAliasSubmit}
        onCancel={handleCancel}
      />
    )
  }
  if (step === 'verifying') {
    return <Box flexDirection="column"><Text>Verifying model config...</Text></Box>
  }
  if (step === 'verify-failed') {
    return (
      <Box flexDirection="column">
        <Text color="red">Verification failed: {verifyError}</Text>
        <Text> </Text>
        <Select
          options={[
            { label: 'Save anyway', value: 'save', description: 'May be a temporary network issue' },
            { label: 'Re-enter', value: 'retry', description: 'Start over with new values' },
            { label: 'Cancel', value: 'cancel' },
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
  // 用 useState 替代 useRef，确保 Windows 下 onChange 触发后 state 同步，Enter 时读到最新值
  const [inputValue, setInputValue] = React.useState('')
  const options: OptionWithDescription[] = React.useMemo(() => [{
    label: prompt, value: 'input', type: 'input' as const, placeholder,
    onChange: (v: string) => { setInputValue(v) },
    allowEmptySubmitToCancel: true,
  }], [prompt, placeholder])
  const handleChange = React.useCallback(() => { onSubmit(inputValue) }, [onSubmit, inputValue])
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Text> </Text>
      {hint.map((line, i) => <Text key={i} dimColor>{line}</Text>)}
      <Text> </Text>
      <Select options={options} onChange={handleChange} onCancel={onCancel} />
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

function saveConfig(baseUrl: string, apiKey: string, modelName: string, alias: string, existingProviderKey: string | null): void {
  if (existingProviderKey) {
    saveGlobalModelConfig((current) => {
      const provider = current.providers[existingProviderKey]
      if (!provider) return current
      return { ...current, providers: { ...current.providers, [existingProviderKey]: {
        ...provider, models: { ...provider.models, [modelName]: {
          name: modelName, ...(alias ? { alias: [alias] } : {}),
        }},
      }}}
    })
  } else {
    saveGlobalModelConfig((current) => {
      const providerKey = deriveProviderKey(baseUrl, Object.keys(current.providers))
      return { ...current, providers: { ...current.providers, [providerKey]: {
        name: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
        baseUrl, ...(apiKey ? { apiKey } : {}),
        models: { [modelName]: { name: modelName, ...(alias ? { alias: [alias] } : {}) } },
      }}}
    })
  }
}

function finishAdd(baseUrl: string, modelName: string, alias: string, onDone: LocalJSXCommandOnDone): void {
  const lines = [
    'Model added successfully!',
    `  Model: ${modelName}`,
    alias ? `  Alias: ${alias}` : '',
    `  Endpoint: ${baseUrl}`,
    '',
    'Next: /model list · /model <alias> to switch',
  ].filter(Boolean).join('\n')
  onDone(lines, { display: 'system' as CommandResultDisplay })
}

export const call: LocalJSXCommandCall = async (onDone, _context, _args) => {
  return <ModelAdd onDone={onDone} />
}
