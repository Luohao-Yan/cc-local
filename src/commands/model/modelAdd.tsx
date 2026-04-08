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
import type { LocalJSXCommandCall } from '../../types/command.js'

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
  onDone: (message: string, options?: { display: string }) => void
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
    return <InputStep prompt="API endpoint (baseUrl):" placeholder="https://api.openai.com/v1" onSubmit={handleUrlSubmit} onCancel={handleCancel} />
  }
  if (step === 'confirm-append') {
    const config = getGlobalModelConfig()
    const providerName = existingProviderKey ? config.providers[existingProviderKey]?.name || existingProviderKey : ''
    return (
      <Box flexDirection="column">
        <Text>This baseUrl belongs to provider "{providerName}". Append new model to it?</Text>
        <Text> </Text>
        <Select
          options={[
            { label: 'Yes, append to existing provider', value: 'yes' },
            { label: 'No, create new provider', value: 'no' },
          ]}
          onChange={handleAppendConfirm} onCancel={handleCancel}
        />
      </Box>
    )
  }
  if (step === 'input-key') {
    return <InputStep prompt="API Key (Enter to skip for local models):" placeholder="" onSubmit={handleKeySubmit} onCancel={handleCancel} />
  }
  if (step === 'input-model') {
    return <InputStep prompt="Model name:" placeholder="gpt-4o" onSubmit={handleModelSubmit} onCancel={handleCancel} />
  }
  if (step === 'input-alias') {
    return <InputStep prompt="Alias (optional, Enter to skip):" placeholder="" onSubmit={handleAliasSubmit} onCancel={handleCancel} />
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

function InputStep({ prompt, placeholder, onSubmit, onCancel }: {
  prompt: string; placeholder: string
  onSubmit: (value: string) => void; onCancel: () => void
}): React.ReactElement {
  const inputRef = React.useRef('')
  const options: OptionWithDescription[] = React.useMemo(() => [{
    label: prompt, value: 'input', type: 'input' as const, placeholder,
    onChange: (v: string) => { inputRef.current = v },
    allowEmptySubmitToCancel: true,
  }], [prompt, placeholder])
  const handleChange = React.useCallback(() => { onSubmit(inputRef.current) }, [onSubmit])
  return <Box flexDirection="column"><Select options={options} onChange={handleChange} onCancel={onCancel} /></Box>
}

function deriveProviderKey(baseUrl: string): string {
  try {
    const parts = new URL(baseUrl).hostname.split('.')
    return (parts.length >= 2 ? parts.find(p => !['api', 'www', 'v1', 'v2'].includes(p)) : parts[0]) || 'custom'
  } catch { return 'custom' }
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
    const providerKey = deriveProviderKey(baseUrl)
    saveGlobalModelConfig((current) => ({ ...current, providers: { ...current.providers, [providerKey]: {
      name: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
      baseUrl, ...(apiKey ? { apiKey } : {}),
      models: { [modelName]: { name: modelName, ...(alias ? { alias: [alias] } : {}) } },
    }}}))
  }
}

function finishAdd(baseUrl: string, modelName: string, alias: string, onDone: (msg: string, opts?: { display: string }) => void): void {
  const lines = [
    'Model added successfully!',
    `  Model: ${modelName}`,
    alias ? `  Alias: ${alias}` : '',
    `  Endpoint: ${baseUrl}`,
    '',
    'Next: /model list · /model <alias> to switch',
  ].filter(Boolean).join('\n')
  onDone(lines, { display: 'system' })
}

export const call: LocalJSXCommandCall = async (onDone, _context, _args) => {
  return <ModelAdd onDone={onDone} />
}
