/**
 * Setup Wizard — First-run interactive model configuration.
 * Options: Anthropic official / 3rd-party LLM / Local model / Skip
 */

import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Select } from '../../components/CustomSelect/select.js'
import type { OptionWithDescription } from '../../components/CustomSelect/select.js'
import { getGlobalConfig } from '../../utils/config.js'
import { getModelConfig, saveGlobalModelConfig } from '../../utils/model/modelConfig.js'
import { activateModel, type ResolvedModel } from '../../utils/model/multiModel.js'

type WizardStep =
  | 'select-type'
  | 'third-party-url' | 'third-party-key' | 'third-party-model' | 'third-party-alias'
  | 'local-url' | 'local-model'
  | 'done'

type SetupChoice = 'anthropic' | 'third-party' | 'local' | 'skip'

/** Check if setup wizard should run (no API key, no JSON providers, no OAuth) */
export function shouldRunSetupWizard(): boolean {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY
  const hasProviders = Object.keys(getModelConfig().providers).length > 0
  let hasOAuth = false
  try { hasOAuth = !!getGlobalConfig().oauthAccount } catch {}
  return !hasApiKey && !hasProviders && !hasOAuth
}

export function SetupWizard({
  onDone,
}: {
  onDone: (message: string, options?: { display: string }) => void
}): React.ReactElement {
  const [step, setStep] = React.useState<WizardStep>('select-type')
  const [baseUrl, setBaseUrl] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [modelName, setModelName] = React.useState('')

  const handleTypeSelect = React.useCallback((value: string) => {
    switch (value as SetupChoice) {
      case 'anthropic':
        onDone('Use /login to sign in to Anthropic, or set ANTHROPIC_API_KEY env var.', { display: 'system' })
        break
      case 'third-party': setStep('third-party-url'); break
      case 'local': setStep('local-url'); break
      case 'skip':
        onDone('Skipped. Use /model add or edit ~/.claude/models.json later.', { display: 'system' })
        break
    }
  }, [onDone])

  const handleCancel = React.useCallback(() => {
    onDone('Cancelled. Use /model add or edit ~/.claude/models.json later.', { display: 'system' })
  }, [onDone])

  // 3rd-party flow
  const handleThirdPartyUrl = React.useCallback((v: string) => {
    if (v.trim()) { setBaseUrl(v.trim()); setStep('third-party-key') }
  }, [])
  const handleThirdPartyKey = React.useCallback((v: string) => {
    setApiKey(v.trim()); setStep('third-party-model')
  }, [])
  const handleThirdPartyModel = React.useCallback((v: string) => {
    if (v.trim()) { setModelName(v.trim()); setStep('third-party-alias') }
  }, [])
  const handleThirdPartyAlias = React.useCallback((v: string) => {
    const alias = v.trim()
    const providerKey = deriveProviderKey(baseUrl)
    saveGlobalModelConfig((c) => ({ ...c,
      providers: { ...c.providers, [providerKey]: {
        name: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
        baseUrl, ...(apiKey ? { apiKey } : {}),
        models: { [modelName]: { name: modelName, ...(alias ? { alias: [alias] } : {}) } },
      }},
      defaultModel: alias || modelName,
    }))
    activateModel({ providerKey, providerName: 'Custom', modelKey: modelName, modelName, baseUrl, apiKey: apiKey || null, aliases: alias ? [alias] : [] })
    setStep('done')
    onDone([
      'Setup complete!',
      `  Model: ${modelName}`, alias ? `  Alias: ${alias}` : '', `  Endpoint: ${baseUrl}`,
      '', 'Next: /model add · /model list · /model <alias>',
    ].filter(Boolean).join('\n'), { display: 'system' })
  }, [baseUrl, apiKey, modelName, onDone])

  // Local model flow
  const handleLocalUrl = React.useCallback((v: string) => {
    setBaseUrl(v.trim() || 'http://localhost:11434/v1'); setStep('local-model')
  }, [])
  const handleLocalModel = React.useCallback((v: string) => {
    if (!v.trim()) return
    const name = v.trim()
    const finalUrl = baseUrl || 'http://localhost:11434/v1'
    saveGlobalModelConfig((c) => ({ ...c,
      providers: { ...c.providers, local: { name: 'Local', baseUrl: finalUrl, models: { [name]: { name } } } },
      defaultModel: name,
    }))
    activateModel({ providerKey: 'local', providerName: 'Local', modelKey: name, modelName: name, baseUrl: finalUrl, apiKey: null, aliases: [] })
    setStep('done')
    onDone([
      'Setup complete!', `  Model: ${name}`, `  Endpoint: ${finalUrl}`,
      '', 'Next: /model add · /model list · /model <alias>',
    ].join('\n'), { display: 'system' })
  }, [baseUrl, onDone])

  // Render
  if (step === 'select-type') {
    return (
      <Box flexDirection="column">
        <Text>Welcome! Choose how to configure your model:</Text>
        <Text> </Text>
        <Select options={[
          { label: 'Anthropic Official', value: 'anthropic', description: 'Sign in or use API Key' },
          { label: '3rd-party LLM', value: 'third-party', description: 'OpenAI-compatible API' },
          { label: 'Local model', value: 'local', description: 'Ollama, LM Studio, etc.' },
          { label: 'Skip', value: 'skip', description: 'Configure later via /model add' },
        ]} onChange={handleTypeSelect} onCancel={handleCancel} />
      </Box>
    )
  }
  if (step === 'third-party-url') return <InputStep prompt="API endpoint (baseUrl):" placeholder="https://api.openai.com/v1" onSubmit={handleThirdPartyUrl} onCancel={handleCancel} />
  if (step === 'third-party-key') return <InputStep prompt="API Key (Enter to skip):" placeholder="" onSubmit={handleThirdPartyKey} onCancel={handleCancel} />
  if (step === 'third-party-model') return <InputStep prompt="Model name:" placeholder="gpt-4o" onSubmit={handleThirdPartyModel} onCancel={handleCancel} />
  if (step === 'third-party-alias') return <InputStep prompt="Alias (optional, Enter to skip):" placeholder="" onSubmit={handleThirdPartyAlias} onCancel={handleCancel} />
  if (step === 'local-url') return <InputStep prompt="API endpoint (Enter for http://localhost:11434/v1):" placeholder="http://localhost:11434/v1" onSubmit={handleLocalUrl} onCancel={handleCancel} />
  if (step === 'local-model') return <InputStep prompt="Model name:" placeholder="qwen3:32b" onSubmit={handleLocalModel} onCancel={handleCancel} />
  return <Text> </Text>
}

function InputStep({ prompt, placeholder, onSubmit, onCancel }: {
  prompt: string; placeholder: string; onSubmit: (v: string) => void; onCancel: () => void
}): React.ReactElement {
  // 用 useState 替代 useRef，确保 Windows 下 onChange 触发后 state 同步，Enter 时读到最新值
  const [inputValue, setInputValue] = React.useState('')
  const opts: OptionWithDescription[] = React.useMemo(() => [{
    label: prompt, value: 'input', type: 'input' as const, placeholder,
    onChange: (v: string) => { setInputValue(v) }, allowEmptySubmitToCancel: true,
  }], [prompt, placeholder])
  const handleChange = React.useCallback(() => onSubmit(inputValue), [onSubmit, inputValue])
  return <Box flexDirection="column"><Select options={opts} onChange={handleChange} onCancel={onCancel} /></Box>
}

function deriveProviderKey(baseUrl: string): string {
  try {
    const parts = new URL(baseUrl).hostname.split('.')
    return (parts.length >= 2 ? parts.find(p => !['api', 'www', 'v1', 'v2'].includes(p)) : parts[0]) || 'custom'
  } catch { return 'custom' }
}
