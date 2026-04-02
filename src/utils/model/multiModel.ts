/**
 * 多模型配置支持
 *
 * 允许用户在 .env 中配置多个第三方 LLM 模型，通过 --model 或 /model 命令切换时
 * 自动切换对应的 API 端点和 API Key。
 *
 * 配置格式（在 .env 中）：
 *   MODEL_<别名>_NAME=模型名称
 *   MODEL_<别名>_BASE_URL=API 端点
 *   MODEL_<别名>_API_KEY=API Key
 *
 * 示例：
 *   MODEL_DOUBAO_NAME=doubao-seed-2.0-code
 *   MODEL_DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/coding
 *   MODEL_DOUBAO_API_KEY=your-doubao-key
 *
 *   MODEL_GLM_NAME=glm-5
 *   MODEL_GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
 *   MODEL_GLM_API_KEY=your-glm-key
 */

export interface ModelConfig {
  alias: string
  name: string
  baseUrl: string
  apiKey: string
}

let modelConfigs: ModelConfig[] | null = null

/**
 * 从环境变量中解析所有 MODEL_<别名>_* 配置
 */
export function getModelConfigs(): ModelConfig[] {
  if (modelConfigs !== null) return modelConfigs

  const configs: ModelConfig[] = []
  const aliasSet = new Set<string>()

  // 扫描所有 MODEL_*_NAME 环境变量
  for (const key of Object.keys(process.env)) {
    const match = key.match(/^MODEL_([A-Z0-9_]+)_NAME$/)
    if (match) {
      aliasSet.add(match[1])
    }
  }

  for (const alias of aliasSet) {
    const name = process.env[`MODEL_${alias}_NAME`]
    const baseUrl = process.env[`MODEL_${alias}_BASE_URL`]
    const apiKey = process.env[`MODEL_${alias}_API_KEY`]

    if (name && baseUrl && apiKey) {
      configs.push({ alias, name, baseUrl, apiKey })
    }
  }

  modelConfigs = configs
  return configs
}

/**
 * 根据模型名称或别名查找对应的配置，找到后自动切换环境变量
 * 返回实际的模型名称
 */
export function resolveMultiModelConfig(modelInput: string): string | null {
  const configs = getModelConfigs()
  if (configs.length === 0) return null

  const input = modelInput.trim().toLowerCase()

  // 先按别名匹配（不区分大小写）
  let matched = configs.find(c => c.alias.toLowerCase() === input)

  // 再按模型名匹配
  if (!matched) {
    matched = configs.find(c => c.name.toLowerCase() === input)
  }

  if (matched) {
    // 切换环境变量，Anthropic SDK 会自动读取
    process.env.ANTHROPIC_API_KEY = matched.apiKey
    process.env.ANTHROPIC_BASE_URL = matched.baseUrl
    return matched.name
  }

  return null
}
