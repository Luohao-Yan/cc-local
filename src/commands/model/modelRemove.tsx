/**
 * /model remove <alias or model name>
 *
 * Remove a model from global config.
 * Match by alias, model ID (key), or display name (case-insensitive).
 * Requires user confirmation before removal.
 * If the model is the only one in a Provider, removes the entire Provider.
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

function findModel(input: string): ResolvedModel | null {
  const models = getConfiguredModels()
  const query = input.trim().toLowerCase()
  return (
    models.find(m => m.aliases.some(a => a.toLowerCase() === query)) ||
    models.find(m => m.modelKey.toLowerCase() === query) ||
    models.find(m => m.modelName.toLowerCase() === query) ||
    null
  )
}

function removeModelFromConfig(model: ResolvedModel): void {
  saveGlobalModelConfig((current) => {
    const provider = current.providers[model.providerKey]
    if (!provider) return current

    if (Object.keys(provider.models).length <= 1) {
      const { [model.providerKey]: _, ...restProviders } = current.providers
      return { ...current, providers: restProviders }
    }

    const { [model.modelKey]: _, ...restModels } = provider.models
    return {
      ...current,
      providers: {
        ...current.providers,
        [model.providerKey]: { ...provider, models: restModels },
      },
    }
  })
}

export function ModelRemove({
  onDone,
  modelInput,
}: {
  onDone: (message: string, options?: { display: string }) => void
  modelInput: string
}): React.ReactElement {
  const matched = React.useMemo(() => findModel(modelInput), [modelInput])

  const handleConfirm = React.useCallback(
    (value: string) => {
      if (value === 'yes' && matched) {
        removeModelFromConfig(matched)
        const aliasInfo = matched.aliases.length > 0
          ? ` (alias: ${matched.aliases.join(', ')})`
          : ''
        onDone(
          `Removed model "${matched.modelKey}"${aliasInfo}, provider: ${matched.providerName}`,
          { display: 'system' },
        )
      } else {
        onDone('Remove cancelled.', { display: 'system' })
      }
    },
    [matched, onDone],
  )

  const handleCancel = React.useCallback(() => {
    onDone('Remove cancelled.', { display: 'system' })
  }, [onDone])

  // Not found
  if (!matched) {
    React.useEffect(() => {
      onDone(`Model "${modelInput}" not found. Run /model list to see configured models.`, {
        display: 'system',
      })
    }, [modelInput, onDone])
    return <Text> </Text>
  }

  const aliasDisplay = matched.aliases.length > 0
    ? `  Alias: ${matched.aliases.join(', ')}`
    : ''

  const config = getGlobalModelConfig()
  const provider = config.providers[matched.providerKey]
  const willRemoveProvider = provider
    ? Object.keys(provider.models).length <= 1
    : false

  return (
    <Box flexDirection="column">
      <Text>Remove this model?</Text>
      <Text> </Text>
      <Text>  Model: {matched.modelKey} ({matched.modelName})</Text>
      {aliasDisplay ? <Text>{aliasDisplay}</Text> : null}
      <Text>  Provider: {matched.providerName}</Text>
      {willRemoveProvider && (
        <Text color="yellow">  Warning: only model in this provider, entire provider will be removed</Text>
      )}
      <Text> </Text>
      <Select
        options={[
          { label: 'Yes, remove', value: 'yes' },
          { label: 'No, cancel', value: 'no' },
        ]}
        onChange={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const modelInput = (args || '').trim()
  if (!modelInput) {
    onDone('Usage: /model remove <alias or model name>\n\nRun /model list to see configured models.', {
      display: 'system',
    })
    return
  }
  return <ModelRemove onDone={onDone} modelInput={modelInput} />
}
