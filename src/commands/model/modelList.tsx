/**
 * /model list 子命令
 *
 * 以表格形式展示所有已配置的 Provider 和模型。
 * 显示内容：模型名称、别名、baseUrl（脱敏，仅显示主机名）、Provider 名称、来源（全局/项目）。
 * 无模型配置时输出友好提示。
 */

import { readFileSync } from 'fs'
import {
  getGlobalModelConfig,
  getProjectModelsConfigPath,
  type ModelsConfig,
} from '../../utils/model/modelConfig.js'
import { getConfiguredModels } from '../../utils/model/multiModel.js'
import { stripBOM } from '../../utils/jsonRead.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

// ===== 辅助函数 =====

/**
 * 对 baseUrl 进行脱敏处理，仅保留主机名部分。
 * 例如：https://api.openai.com/v1 → api.openai.com
 * 解析失败时返回原始值。
 */
function maskBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl)
    return url.hostname
  } catch {
    return baseUrl
  }
}

/**
 * 读取项目级模型配置文件（仅用于判断来源）。
 * 文件不存在或解析失败时返回空配置。
 */
function readProjectConfig(): ModelsConfig {
  const projectPath = getProjectModelsConfigPath()
  if (!projectPath) {
    return { providers: {} }
  }
  try {
    const content = readFileSync(projectPath, { encoding: 'utf-8' })
    const parsed = JSON.parse(stripBOM(content))
    return { providers: {}, ...parsed }
  } catch {
    return { providers: {} }
  }
}

/**
 * 判断 Provider 的来源：项目级配置优先，否则为全局。
 * 如果 providerKey 存在于项目级配置中，来源为"项目"；否则为"全局"。
 */
function getProviderSource(
  providerKey: string,
  globalConfig: ModelsConfig,
  projectConfig: ModelsConfig,
): string {
  if (providerKey in projectConfig.providers) {
    return '项目'
  }
  if (providerKey in globalConfig.providers) {
    return '全局'
  }
  return '未知'
}

/**
 * 将字符串填充到指定宽度（右侧补空格）。
 * 简单实现，不处理中文宽字符。
 */
function padRight(str: string, width: number): string {
  if (str.length >= width) {
    return str
  }
  return str + ' '.repeat(width - str.length)
}

/**
 * 构建模型列表的文本表格。
 * 返回格式化后的字符串，包含表头和分隔线。
 */
function buildModelTable(): string {
  const models = getConfiguredModels()

  // 无模型时返回提示信息
  if (models.length === 0) {
    return [
      '当前没有配置任何模型。',
      '',
      '你可以通过以下方式添加模型：',
      '  /model add          交互式添加模型',
      '  手动编辑 ~/.claude/models.json',
    ].join('\n')
  }

  // 读取全局和项目级配置，用于判断来源
  const globalConfig = getGlobalModelConfig()
  const projectConfig = readProjectConfig()

  // 构建表格数据行
  const rows = models.map(m => ({
    model: m.modelKey,
    name: m.modelName,
    aliases: m.aliases.length > 0 ? m.aliases.join(', ') : '-',
    provider: m.providerName,
    baseUrl: maskBaseUrl(m.baseUrl),
    source: getProviderSource(m.providerKey, globalConfig, projectConfig),
  }))

  // 计算各列宽度（取表头和数据的最大值）
  const headers = {
    model: '模型 ID',
    name: '名称',
    aliases: '别名',
    provider: 'Provider',
    baseUrl: '主机',
    source: '来源',
  }

  const colWidths = {
    model: Math.max(headers.model.length, ...rows.map(r => r.model.length)),
    name: Math.max(headers.name.length, ...rows.map(r => r.name.length)),
    aliases: Math.max(headers.aliases.length, ...rows.map(r => r.aliases.length)),
    provider: Math.max(headers.provider.length, ...rows.map(r => r.provider.length)),
    baseUrl: Math.max(headers.baseUrl.length, ...rows.map(r => r.baseUrl.length)),
    source: Math.max(headers.source.length, ...rows.map(r => r.source.length)),
  }

  // 格式化一行
  const formatRow = (r: typeof rows[0]) =>
    `${padRight(r.model, colWidths.model)}  ${padRight(r.name, colWidths.name)}  ${padRight(r.aliases, colWidths.aliases)}  ${padRight(r.provider, colWidths.provider)}  ${padRight(r.baseUrl, colWidths.baseUrl)}  ${r.source}`

  // 表头行
  const headerRow = formatRow({
    model: headers.model,
    name: headers.name,
    aliases: headers.aliases,
    provider: headers.provider,
    baseUrl: headers.baseUrl,
    source: headers.source,
  })

  // 分隔线
  const separator = '-'.repeat(headerRow.length)

  // 数据行
  const dataRows = rows.map(formatRow)

  return [headerRow, separator, ...dataRows].join('\n')
}

// ===== 命令入口 =====

/**
 * /model list 命令入口。
 * 构建模型表格并通过 onDone 输出。
 */
export const call: LocalJSXCommandCall = async (onDone, _context, _args) => {
  const table = buildModelTable()
  onDone(table, { display: 'system' })
  return
}
