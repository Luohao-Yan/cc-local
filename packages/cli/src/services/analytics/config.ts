/**
 * Shared analytics configuration
 *
 * Common logic for determining when analytics should be disabled
 * across all analytics systems (Datadog, 1P)
 */

import { isEnvTruthy } from '../../utils/envUtils.js'
import { isTelemetryDisabled } from '../../utils/privacyLevel.js'

/**
 * 判断当前是否使用第三方模型（非 Anthropic 官方 API）。
 * 满足以下任一条件即视为第三方：
 *   1. ANTHROPIC_BASE_URL 已设置且不指向 anthropic.com
 *   2. 运行时 models.json providers 非空（由 activateModel 设置 ANTHROPIC_BASE_URL）
 *
 * 此函数仅读取 process.env，不引入重型依赖，避免循环依赖。
 */
function isThirdPartyModel(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (baseUrl && !baseUrl.includes('anthropic.com')) {
    return true
  }
  return false
}

/**
 * Check if analytics operations should be disabled
 *
 * Analytics is disabled in the following cases:
 * - Test environment (NODE_ENV === 'test')
 * - Third-party cloud providers (Bedrock/Vertex/Foundry)
 * - Using a custom third-party model API (ANTHROPIC_BASE_URL not pointing to anthropic.com)
 * - Privacy level is no-telemetry or essential-traffic
 */
export function isAnalyticsDisabled(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY) ||
    isThirdPartyModel() ||
    isTelemetryDisabled()
  )
}

/**
 * Check if the feedback survey should be suppressed.
 *
 * Unlike isAnalyticsDisabled(), this does NOT block on 3P providers
 * (Bedrock/Vertex/Foundry). The survey is a local UI prompt with no
 * transcript data — enterprise customers capture responses via OTEL.
 */
export function isFeedbackSurveyDisabled(): boolean {
  return process.env.NODE_ENV === 'test' || isTelemetryDisabled()
}
