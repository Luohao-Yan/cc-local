/**
 * /model check 子命令
 *
 * 对所有已配置模型发送轻量级测试请求，以表格形式展示每个模型的状态。
 * 状态：可用 / 不可用 / 超时
 * 单个模型超时 10 秒。
 * 不可用时提示用户可通过 /model remove 清理失效配置。
 */

import {
  getConfiguredModels,
  activateModel,
  type ResolvedModel,
} from '../../utils/model/multiModel.js'
import { sideQuery } from '../../utils/sideQuery.js'
import type { LocalJSXCommandCall } from '../../types/command.js'

// ===== 常量 =====

/** 单个模型测试超时时间（毫秒） */
const CHECK_TIMEOUT_MS = 10_000

// ===== 类型定义 =====

/** 单个模型的检查结果 */
interface CheckResult {
  /** 模型显示名称 */
  modelName: string
  /** 模型 ID（key） */
  modelKey: string
  /** Provider 显示名称 */
  providerName: string
  /** 状态：可用 / 不可用 / 超时 */
  status: '可用' | '不可用' | '超时'
  /** 错误详情（仅不可用时） */
  error?: string
}

// ===== 辅助函数 =====

/**
 * 对单个模型发送测试请求，带 10 秒超时。
 * 激活模型环境变量后通过 sideQuery 发送最小请求。
 */
async function checkSingleModel(model: ResolvedModel): Promise<CheckResult> {
  const base: Omit<CheckResult, 'status' | 'error'> = {
    modelName: model.modelName,
    modelKey: model.modelKey,
    providerName: model.providerName,
  }

  // 激活模型（设置 ANTHROPIC_BASE_URL / ANTHROPIC_API_KEY）
  activateModel(model)

  // 使用 AbortController 实现超时控制
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)

  try {
    await sideQuery({
      querySource: 'model_validation',
      model: model.modelKey,
      max_tokens: 1,
      maxRetries: 0,
      signal: controller.signal,
      messages: [{ role: 'user', content: 'Hi' }],
    })
    return { ...base, status: '可用' }
  } catch (err: unknown) {
    // 判断是否为超时（AbortError）
    if (
      err instanceof Error &&
      (err.name === 'AbortError' || controller.signal.aborted)
    ) {
      return { ...base, status: '超时' }
    }
    const errMsg = err instanceof Error ? err.message : String(err)
    return { ...base, status: '不可用', error: errMsg }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 将字符串填充到指定宽度（右侧补空格）。
 */
function padRight(str: string, width: number): string {
  return str.length >= width ? str : str + ' '.repeat(width - str.length)
}

/**
 * 根据检查结果构建文本表格。
 */
function buildCheckTable(results: CheckResult[]): string {
  const headers = {
    model: '模型',
    provider: 'Provider',
    status: '状态',
  }

  // 计算各列宽度
  const colWidths = {
    model: Math.max(
      headers.model.length,
      ...results.map((r) => r.modelKey.length),
    ),
    provider: Math.max(
      headers.provider.length,
      ...results.map((r) => r.providerName.length),
    ),
    status: Math.max(
      headers.status.length,
      ...results.map((r) => r.status.length),
    ),
  }

  // 格式化一行
  const formatRow = (model: string, provider: string, status: string) =>
    `${padRight(model, colWidths.model)}  ${padRight(provider, colWidths.provider)}  ${status}`

  // 表头
  const headerRow = formatRow(headers.model, headers.provider, headers.status)
  const separator = '-'.repeat(headerRow.length)

  // 数据行
  const dataRows = results.map((r) =>
    formatRow(r.modelKey, r.providerName, r.status),
  )

  return [headerRow, separator, ...dataRows].join('\n')
}

// ===== 命令入口 =====

/**
 * /model check 命令入口。
 * 依次对所有已配置模型发送测试请求，构建结果表格并输出。
 */
export const call: LocalJSXCommandCall = async (onDone, _context, _args) => {
  const models = getConfiguredModels()

  // 无模型配置时提示
  if (models.length === 0) {
    onDone('当前没有配置任何模型。请先通过 /model add 添加模型。', {
      display: 'system',
    })
    return
  }

  // 保存当前环境变量，检查完成后恢复
  const savedBaseUrl = process.env.ANTHROPIC_BASE_URL
  const savedApiKey = process.env.ANTHROPIC_API_KEY

  // 依次检查每个模型
  const results: CheckResult[] = []
  for (const model of models) {
    const result = await checkSingleModel(model)
    results.push(result)
  }

  // 恢复环境变量
  if (savedBaseUrl !== undefined) {
    process.env.ANTHROPIC_BASE_URL = savedBaseUrl
  } else {
    delete process.env.ANTHROPIC_BASE_URL
  }
  if (savedApiKey !== undefined) {
    process.env.ANTHROPIC_API_KEY = savedApiKey
  } else {
    delete process.env.ANTHROPIC_API_KEY
  }

  // 构建输出
  const table = buildCheckTable(results)
  const hasUnavailable = results.some(
    (r) => r.status === '不可用' || r.status === '超时',
  )

  const output = hasUnavailable
    ? `${table}\n\n提示: 不可用的模型可通过 /model remove <别名> 清理。`
    : table

  onDone(output, { display: 'system' })
  return
}
