/**
 * /model edit <alias or model name>
 *
 * Interactive editing of an existing model's config.
 * Editable fields: baseUrl, apiKey, model name, alias, provider name.
 */

import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Select } from '../../components/CustomSelect/select.js'
import type { OptionWithDescription } from '../../components/CustomSelect/select.js'
import {
  getGlobalModelConfig,
  saveGlobalModelConfig,
} from '../../utils/model/modelConfig.js'
import { getConfiguredModels, type ResolvedModel } from '../../utils/model/multiModel.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

type EditStep = 'select-field' | 'input-value' | 'done'

/** All editable fields */
const EDITABLE_FIELDS = ['baseUrl', 'apiKey', 'modelName', 'alias', 'providerName'] as const
type EditField = typeof EDITABLE_FIELDS[number]

function findModel(input: string): ResolvedModel | null {
  const models = getConfiguredModels()
  const q = input.trim().toLowerCase()
  return (
    models.find(m => m.aliases.some(a => a.toLowerCase() === q)) ||
    models.find(m => m.modelKey.toLowerCase() === q) ||
    models.find(m => m.modelName.toLowerCase() === q) ||
    null
  )
}

function mask(value: string | null | undefined): string {
  if (!value) return '(not set)'
  if (value.length <= 12) return '****'
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

/** Separate component for text input to keep hooks at top level */
function InputStep({
  label,
  onSubmit,
  onCancel,
}: {
  label: string
  onSubmit: (value: string) => void
  onCancel: () => void
}): React.ReactElement {
  const inputRef = React.useRef('')

  const options: OptionWithDescription[] = React.useMemo(
    () => [
      {
        label,
        value: 'input',
        type: 'input' as const,
        placeholder: '',
        onChange: (v: string) => { inputRef.current = v },
        allowEmptySubmitToCancel: true,
      },
    ],
    [label],
  )

  const handleChange = React.useCallback(() => {
    onSubmit(inputRef.current)
  }, [onSubmit])

  return (
    <Box flexDirection="column">
      <Select options={options} onChange={handleChange} onCancel={onCancel} />
    </Box>
  )
}

export function ModelEdit({
  onDone,
  modelInput,
}: {
  onDone: (message: string, options?: { display: string }) => void
  modelInput: string
}): React.ReactElement {
  const matched = React.useMemo(() => findModel(modelInput), [modelInput])
  const [step, setStep] = React.useState<EditStep>('select-field')
  const [editField, setEditField] = React.useState<EditField>('baseUrl')

  const handleCancel = React.useCallback(() => {
    onDone('Edit cancelled.', { display: 'system' })
  }, [onDone])

  // Not found
  React.useEffect(() => {
    if (!matched) {
      onDone(`Model "${modelInput}" not found. Run /model list to see configured models.`, {
        display: 'system',
      })
    }
  }, [matched, modelInput, onDone])

  const handleFieldSelect = React.useCallback((value: string) => {
    if (value === 'done') {
      onDone('Edit complete.', { display: 'system' })
      return
    }
    setEditField(value as EditField)
    setStep('input-value')
  }, [onDone])

  const handleValueSubmit = React.useCallback((value: string) => {
    const newValue = value.trim()
    if (!newValue || !matched) {
      // Empty = keep current, go back to field selection
      setStep('select-field')
      return
    }

    saveGlobalModelConfig((current) => {
      const provider = current.providers[matched.providerKey]
      if (!provider) return current

      const updatedProvider = { ...provider }
      const model = updatedProvider.models[matched.modelKey]

      switch (editField) {
        case 'baseUrl':
          updatedProvider.baseUrl = newValue
          break
        case 'apiKey':
          updatedProvider.apiKey = newValue
          break
        case 'providerName':
          updatedProvider.name = newValue
          break
        case 'modelName':
          if (model) {
            updatedProvider.models = {
              ...updatedProvider.models,
              [matched.modelKey]: { ...model, name: newValue },
            }
          }
          break
        case 'alias':
          if (model) {
            // Parse comma-separated aliases
            const aliases = newValue.split(',').map(a => a.trim()).filter(Boolean)
            updatedProvider.models = {
              ...updatedProvider.models,
              [matched.modelKey]: { ...model, alias: aliases },
            }
          }
          break
      }

      return {
        ...current,
        providers: {
          ...current.providers,
          [matched.providerKey]: updatedProvider,
        },
      }
    })

    // Return to field selection so user can edit more fields
    setStep('select-field')
  }, [matched, editField])

  if (!matched) {
    return <Text> </Text>
  }

  if (step === 'select-field') {
    const config = getGlobalModelConfig()
    const provider = config.providers[matched.providerKey]
    const model = provider?.models[matched.modelKey]
    const aliasStr = model?.alias?.join(', ') || '(none)'

    return (
      <Box flexDirection="column">
        <Text>Editing: {matched.modelKey} ({matched.providerName})</Text>
        <Text> </Text>
        <Text>Select field to edit:</Text>
        <Select
          options={[
            { label: `Provider name (${provider?.name || '?'})`, value: 'providerName' },
            { label: `baseUrl (${provider?.baseUrl || '?'})`, value: 'baseUrl' },
            { label: `apiKey (${mask(provider?.apiKey)})`, value: 'apiKey' },
            { label: `Model name (${model?.name || '?'})`, value: 'modelName' },
            { label: `Alias (${aliasStr})`, value: 'alias' },
            { label: 'Done', value: 'done' },
          ]}
          onChange={handleFieldSelect}
          onCancel={handleCancel}
        />
      </Box>
    )
  }

  if (step === 'input-value') {
    const config = getGlobalModelConfig()
    const provider = config.providers[matched.providerKey]
    const model = provider?.models[matched.modelKey]
    let currentValue = ''
    switch (editField) {
      case 'baseUrl': currentValue = provider?.baseUrl || ''; break
      case 'apiKey': currentValue = provider?.apiKey || ''; break
      case 'providerName': currentValue = provider?.name || ''; break
      case 'modelName': currentValue = model?.name || ''; break
      case 'alias': currentValue = model?.alias?.join(', ') || ''; break
    }
    const hint = editField === 'alias' ? ' (comma-separated)' : ''
    return (
      <Box flexDirection="column">
        <Text>Current {editField}: {editField === 'apiKey' ? mask(currentValue) : currentValue}</Text>
        <InputStep
          label={`New value${hint} (Enter to keep current):`}
          onSubmit={handleValueSubmit}
          onCancel={handleCancel}
        />
      </Box>
    )
  }

  return <Text> </Text>
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const modelInput = (args || '').trim()
  if (!modelInput) {
    // No argument — show a model picker so user can select which to edit
    return <ModelPicker onDone={onDone} />
  }
  return <ModelEdit onDone={onDone} modelInput={modelInput} />
}

/** When no model name given, show a list to pick from */
function ModelPicker({
  onDone,
}: {
  onDone: (message: string, options?: { display: string }) => void
}): React.ReactElement {
  const models = React.useMemo(() => getConfiguredModels(), [])

  const handleCancel = React.useCallback(() => {
    onDone('Edit cancelled.', { display: 'system' })
  }, [onDone])

  if (models.length === 0) {
    React.useEffect(() => {
      onDone('No models configured. Run /model add first.', { display: 'system' })
    }, [onDone])
    return <Text> </Text>
  }

  const options = models.map(m => ({
    label: `${m.modelKey} (${m.providerName})`,
    value: m.modelKey,
    description: m.aliases.length > 0 ? `alias: ${m.aliases.join(', ')}` : undefined,
  }))

  const [selected, setSelected] = React.useState<string | null>(null)

  const handleSelect = React.useCallback((value: string) => {
    setSelected(value)
  }, [])

  if (selected) {
    return <ModelEdit onDone={onDone} modelInput={selected} />
  }

  return (
    <Box flexDirection="column">
      <Text>Select model to edit:</Text>
      <Select options={options} onChange={handleSelect} onCancel={handleCancel} />
    </Box>
  )
}
