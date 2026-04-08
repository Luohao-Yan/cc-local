// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { MODEL_ALIASES } from './aliases.js'
import { isModelAllowed } from './modelAllowlist.js'
import { getAPIProvider } from './providers.js'
import { sideQuery } from '../sideQuery.js'
import { resolveMultiModelConfig, getConfiguredModels } from './multiModel.js'
import {
  NotFoundError,
  APIError,
  APIConnectionError,
  AuthenticationError,
} from '@anthropic-ai/sdk'
import { getModelStrings } from './modelStrings.js'

// Cache valid models to avoid repeated API calls
const validModelCache = new Map<string, boolean>()

/**
 * Validates a model by attempting an actual API call.
 */
export async function validateModel(
  model: string,
): Promise<{ valid: boolean; error?: string }> {
  const normalizedModel = model.trim()

  // Empty model is invalid
  if (!normalizedModel) {
    return { valid: false, error: 'Model name cannot be empty' }
  }

  // Check against availableModels allowlist before any API call
  if (!isModelAllowed(normalizedModel)) {
    return {
      valid: false,
      error: `Model '${normalizedModel}' is not in the list of available models`,
    }
  }

  // Check if it's a known alias (these are always valid)
  const lowerModel = normalizedModel.toLowerCase()
  if ((MODEL_ALIASES as readonly string[]).includes(lowerModel)) {
    return { valid: true }
  }

  // 多模型配置：如果匹配到别名或模型名，切换 API 端点并直接返回有效
  const multiModelName = resolveMultiModelConfig(normalizedModel)
  if (multiModelName) {
    validModelCache.set(multiModelName, true)
    return { valid: true }
  }

  // Check if it matches ANTHROPIC_CUSTOM_MODEL_OPTION (pre-validated by the user)
  if (normalizedModel === process.env.ANTHROPIC_CUSTOM_MODEL_OPTION) {
    return { valid: true }
  }

  // Check cache first
  if (validModelCache.has(normalizedModel)) {
    return { valid: true }
  }


  // Try to make an actual API call with minimal parameters
  try {
    await sideQuery({
      model: normalizedModel,
      max_tokens: 1,
      maxRetries: 0,
      querySource: 'model_validation',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hi',
              cache_control: { type: 'ephemeral' },
            },
          ],
        },
      ],
    })

    // If we got here, the model is valid
    validModelCache.set(normalizedModel, true)
    return { valid: true }
  } catch (error) {
    return handleValidationError(error, normalizedModel)
  }
}

/**
 * 查找模型在 JSON 配置中对应的 Provider 名称。
 * 按模型 key 和别名匹配（不区分大小写），未找到返回 null。
 */
function findProviderNameForModel(modelName: string): string | null {
  try {
    const models = getConfiguredModels()
    const lower = modelName.toLowerCase()
    const matched = models.find(
      m =>
        m.modelKey.toLowerCase() === lower ||
        m.aliases.some(a => a.toLowerCase() === lower) ||
        m.modelName.toLowerCase() === lower,
    )
    return matched ? matched.providerName : null
  } catch {
    return null
  }
}

/**
 * 为来自 JSON 配置的模型追加 Provider 信息和操作提示。
 * 非 JSON 配置模型原样返回错误信息。
 */
function enrichErrorForConfigModel(
  modelName: string,
  baseError: string,
): string {
  const providerName = findProviderNameForModel(modelName)
  if (!providerName) {
    return baseError
  }
  return `模型 "${modelName}" (Provider: ${providerName}) 调用失败: ${baseError}。可通过 /model remove 清理或 /model add 重新配置`
}

function handleValidationError(
  error: unknown,
  modelName: string,
): { valid: boolean; error: string } {
  // NotFoundError (404) 表示模型不存在
  if (error instanceof NotFoundError) {
    const fallback = get3PFallbackSuggestion(modelName)
    const suggestion = fallback ? `. Try '${fallback}' instead` : ''
    const baseMsg = `Model '${modelName}' not found${suggestion}`
    return {
      valid: false,
      error: enrichErrorForConfigModel(modelName, baseMsg),
    }
  }

  // 其他 API 错误，提供上下文相关的错误信息
  if (error instanceof APIError) {
    if (error instanceof AuthenticationError) {
      const baseMsg = 'Authentication failed. Please check your API credentials.'
      return {
        valid: false,
        error: enrichErrorForConfigModel(modelName, baseMsg),
      }
    }

    if (error instanceof APIConnectionError) {
      const baseMsg = 'Network error. Please check your internet connection.'
      return {
        valid: false,
        error: enrichErrorForConfigModel(modelName, baseMsg),
      }
    }

    // 检查错误体中的模型相关错误
    const errorBody = error.error as unknown
    if (
      errorBody &&
      typeof errorBody === 'object' &&
      'type' in errorBody &&
      errorBody.type === 'not_found_error' &&
      'message' in errorBody &&
      typeof errorBody.message === 'string' &&
      errorBody.message.includes('model:')
    ) {
      const baseMsg = `Model '${modelName}' not found`
      return {
        valid: false,
        error: enrichErrorForConfigModel(modelName, baseMsg),
      }
    }

    // 通用 API 错误
    const baseMsg = `API error: ${error.message}`
    return {
      valid: false,
      error: enrichErrorForConfigModel(modelName, baseMsg),
    }
  }

  // 未知错误，安全起见拒绝
  const errorMessage = error instanceof Error ? error.message : String(error)
  const baseMsg = `Unable to validate model: ${errorMessage}`
  return {
    valid: false,
    error: enrichErrorForConfigModel(modelName, baseMsg),
  }
}

// @[MODEL LAUNCH]: Add a fallback suggestion chain for the new model → previous version
/**
 * Suggest a fallback model for 3P users when the selected model is unavailable.
 */
function get3PFallbackSuggestion(model: string): string | undefined {
  if (getAPIProvider() === 'firstParty') {
    return undefined
  }
  const lowerModel = model.toLowerCase()
  if (lowerModel.includes('opus-4-6') || lowerModel.includes('opus_4_6')) {
    return getModelStrings().opus41
  }
  if (lowerModel.includes('sonnet-4-6') || lowerModel.includes('sonnet_4_6')) {
    return getModelStrings().sonnet45
  }
  if (lowerModel.includes('sonnet-4-5') || lowerModel.includes('sonnet_4_5')) {
    return getModelStrings().sonnet40
  }
  return undefined
}
