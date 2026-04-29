/**
 * /model list
 *
 * Display all configured models in a table.
 * Shows current active model at the top, highlights it in the table with *.
 */

import chalk from 'chalk'
import { readFileSync } from 'fs'
import {
  getGlobalModelConfig,
  getModelConfig,
  getProjectModelsConfigPath,
  type ModelsConfig,
} from '../../utils/model/modelConfig.js'
import { getConfiguredModels } from '../../utils/model/multiModel.js'
import { getMainLoopModel, renderModelName } from '../../utils/model/model.js'
import { stripBOM } from '../../utils/jsonRead.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

/** Extract hostname from URL for display */
function maskBaseUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname
  } catch {
    return baseUrl
  }
}

/** Read project-level config to determine source */
function readProjectConfig(): ModelsConfig {
  const projectPath = getProjectModelsConfigPath()
  if (!projectPath) return { providers: {} }
  try {
    const content = readFileSync(projectPath, { encoding: 'utf-8' })
    return { providers: {}, ...JSON.parse(stripBOM(content)) }
  } catch {
    return { providers: {} }
  }
}

/** Determine if provider comes from global or project config */
function getSource(
  providerKey: string,
  projectConfig: ModelsConfig,
): string {
  return providerKey in projectConfig.providers ? 'project' : 'global'
}

/** Pad string to width */
function pad(str: string, width: number): string {
  return str.length >= width ? str : str + ' '.repeat(width - str.length)
}

function buildModelTable(): string {
  const models = getConfiguredModels()

  if (models.length === 0) {
    return [
      'No models configured.',
      '',
      'Add models with:',
      '  /model add          Interactive setup',
      '  Edit ~/.claude/models.json directly',
    ].join('\n')
  }

  // Current active model
  const currentModel = getMainLoopModel()
  const currentDisplay = renderModelName(currentModel)

  // Config for defaultModel info
  const config = getModelConfig()
  const projectConfig = readProjectConfig()

  // Build rows
  const rows = models.map(m => {
    const isActive = m.modelKey === currentModel ||
      m.aliases.some(a => a.toLowerCase() === currentModel?.toLowerCase())
    return {
      marker: isActive ? '*' : ' ',
      model: m.modelKey,
      alias: m.aliases.length > 0 ? m.aliases.join(', ') : '-',
      provider: m.providerName,
      host: maskBaseUrl(m.baseUrl),
      source: getSource(m.providerKey, projectConfig),
      isActive,
    }
  })

  // Column headers
  const h = { marker: ' ', model: 'Model', alias: 'Alias', provider: 'Provider', host: 'Host', source: 'Source' }

  // Column widths
  const w = {
    marker: 1,
    model: Math.max(h.model.length, ...rows.map(r => r.model.length)),
    alias: Math.max(h.alias.length, ...rows.map(r => r.alias.length)),
    provider: Math.max(h.provider.length, ...rows.map(r => r.provider.length)),
    host: Math.max(h.host.length, ...rows.map(r => r.host.length)),
    source: Math.max(h.source.length, ...rows.map(r => r.source.length)),
  }

  const fmtRow = (marker: string, model: string, alias: string, provider: string, host: string, source: string) =>
    `${pad(marker, w.marker)} ${pad(model, w.model)}  ${pad(alias, w.alias)}  ${pad(provider, w.provider)}  ${pad(host, w.host)}  ${source}`

  const headerRow = fmtRow(h.marker, h.model, h.alias, h.provider, h.host, h.source)
  const separator = '-'.repeat(headerRow.length)

  const dataRows = rows.map(r => {
    const line = fmtRow(r.marker, r.model, r.alias, r.provider, r.host, r.source)
    return r.isActive ? chalk.green(line) : line
  })

  // Build output
  const lines: string[] = []
  lines.push(`Active model: ${chalk.bold.green(currentDisplay)}`)
  if (config.defaultModel) {
    lines.push(`Default model: ${config.defaultModel}`)
  }
  lines.push('')
  lines.push(headerRow)
  lines.push(separator)
  lines.push(...dataRows)
  lines.push('')
  lines.push(chalk.dim('* = active  |  /model edit <name> to modify  |  /model add to add new'))

  return lines.join('\n')
}

export const call: LocalJSXCommandCall = async (onDone, _context, _args) => {
  const table = buildModelTable()
  onDone(table, { display: 'system' })
  return
}
