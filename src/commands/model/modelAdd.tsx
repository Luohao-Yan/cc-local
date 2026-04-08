/**
 * /model add 交互式添加 Provider 和模型
 *
 * 交互流程：baseUrl → apiKey（回车跳过，适用于本地模型） → 模型名称 → 别名（可选）
 * 当 baseUrl 匹配已有 Provider 时，提示追加模型到该 Provider。
 * 配置保存后发送轻量级测试请求验证可用性。
 * 验证失败时提供"仍然保存 / 重新输入 / 取消"选项。
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

// ===== 步骤枚举 =====

/** 添加模型的交互步骤 */
type AddStep =
  | 'input-url'        // 输入 baseUrl
  | 'input-key'        // 输入 apiKey
  | 'input-model'      // 输入模型名称
  | 'input-alias'      // 输入别名（可选）
  | 'confirm-append'   // 确认追加到已有 Provider
  | 'verifying'        // 验证中
  | 'verify-failed'    // 验证失败，选择操作
  | 'done'             // 完成

// ===== 组件 =====

/**
 * /model add 交互式组件。
 * 引导用户输入 Provider 和模型信息，验证后保存配置。
 */
export function ModelAdd({
  onDone,
}: {
  onDone: (message: string, options?: { display: string }) => void
}): React.ReactElement {
  // 当前步骤
  const [step, setStep] = React.useState<AddStep>('input-url')

  // 收集的配置数据
  const [baseUrl, setBaseUrl] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [modelName, setModelName] = React.useState('')

  // 匹配到的已有 Provider key（当 baseUrl 匹配时）
  const [existingProviderKey, setExistingProviderKey] = React.useState<string | null>(null)

  // 验证失败的错误信息
  const [verifyError, setVerifyError] = React.useState('')

  // 暂存别名（用于验证失败后仍然保存的场景）
  const aliasRef = React.useRef('')

  // ===== 取消处理 =====

  /** 处理取消（Ctrl+C / Escape） */
  const handleCancel = React.useCallback(() => {
    onDone('已取消添加模型。', { display: 'system' })
  }, [onDone])

  // ===== baseUrl 输入 =====

  /** 保存 baseUrl，检查是否匹配已有 Provider */
  const handleUrlSubmit = React.useCallback((value: string) => {
    const url = value.trim()
    if (!url) return

    setBaseUrl(url)

    // 检查是否匹配已有 Provider
    const config = getGlobalModelConfig()
    const matchedKey = Object.keys(config.providers).find(
      (key) => config.providers[key]!.baseUrl === url,
    )

    if (matchedKey) {
      // baseUrl 匹配已有 Provider，提示追加
      setExistingProviderKey(matchedKey)
      setStep('confirm-append')
    } else {
      setStep('input-key')
    }
  }, [])

  // ===== 确认追加到已有 Provider =====

  /** 处理追加确认选择 */
  const handleAppendConfirm = React.useCallback(
    (value: string) => {
      if (value === 'yes') {
        // 追加到已有 Provider，跳过 apiKey 输入
        const config = getGlobalModelConfig()
        const provider = existingProviderKey ? config.providers[existingProviderKey] : null
        if (provider?.apiKey) {
          setApiKey(provider.apiKey)
        }
        setStep('input-model')
      } else {
        // 用户选择创建新 Provider
        setExistingProviderKey(null)
        setStep('input-key')
      }
    },
    [existingProviderKey],
  )

  // ===== apiKey 输入 =====

  /** 保存 apiKey（回车跳过表示本地模型） */
  const handleKeySubmit = React.useCallback((value: string) => {
    setApiKey(value.trim())
    setStep('input-model')
  }, [])

  // ===== 模型名称输入 =====

  /** 保存模型名称，进入别名步骤 */
  const handleModelSubmit = React.useCallback((value: string) => {
    if (value.trim()) {
      setModelName(value.trim())
      setStep('input-alias')
    }
  }, [])

  // ===== 别名输入并验证 =====

  /** 保存别名，开始验证 */
  const handleAliasSubmit = React.useCallback(
    (value: string) => {
      const alias = value.trim()
      aliasRef.current = alias
      setStep('verifying')

      // 临时激活模型环境变量以便 sideQuery 使用正确的端点
      const tempResolved: ResolvedModel = {
        providerKey: 'custom',
        providerName: 'Custom Provider',
        modelKey: modelName,
        modelName: modelName,
        baseUrl: baseUrl,
        apiKey: apiKey || null,
        aliases: alias ? [alias] : [],
      }
      activateModel(tempResolved)

      // 发送轻量级测试请求验证配置
      sideQuery({
        querySource: 'model_validation',
        model: modelName,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      })
        .then(() => {
          // 验证通过，保存配置
          saveConfig(baseUrl, apiKey, modelName, alias, existingProviderKey)
          finishAdd(baseUrl, apiKey, modelName, alias, onDone)
          setStep('done')
        })
        .catch((err: unknown) => {
          // 验证失败，显示错误并提供选项
          const errMsg = err instanceof Error ? err.message : String(err)
          setVerifyError(errMsg)
          setStep('verify-failed')
        })
    },
    [baseUrl, apiKey, modelName, existingProviderKey, onDone],
  )

  // ===== 验证失败选项处理 =====

  /** 处理验证失败后的用户选择 */
  const handleVerifyFailChoice = React.useCallback(
    (value: string) => {
      const alias = aliasRef.current
      if (value === 'save') {
        // 仍然保存
        saveConfig(baseUrl, apiKey, modelName, alias, existingProviderKey)
        finishAdd(baseUrl, apiKey, modelName, alias, onDone)
        setStep('done')
      } else if (value === 'retry') {
        // 重新输入
        setStep('input-url')
        setBaseUrl('')
        setApiKey('')
        setModelName('')
        setExistingProviderKey(null)
        setVerifyError('')
        aliasRef.current = ''
      } else {
        // 取消
        onDone('已取消添加模型。', { display: 'system' })
      }
    },
    [baseUrl, apiKey, modelName, existingProviderKey, onDone],
  )

  // ===== 渲染各步骤 =====

  if (step === 'input-url') {
    return (
      <InputStep
        prompt="请输入 API 端点 (baseUrl):"
        placeholder="https://api.openai.com/v1"
        onSubmit={handleUrlSubmit}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'confirm-append') {
    const config = getGlobalModelConfig()
    const providerName = existingProviderKey
      ? config.providers[existingProviderKey]?.name || existingProviderKey
      : ''
    return (
      <Box flexDirection="column">
        <Text>该 baseUrl 已属于 Provider "{providerName}"，是否将新模型追加到该 Provider？</Text>
        <Text> </Text>
        <Select
          options={[
            { label: '是，追加到已有 Provider', value: 'yes' },
            { label: '否，创建新 Provider', value: 'no' },
          ]}
          onChange={handleAppendConfirm}
          onCancel={handleCancel}
        />
      </Box>
    )
  }

  if (step === 'input-key') {
    return (
      <InputStep
        prompt="请输入 API Key (回车跳过，适用于本地模型):"
        placeholder=""
        onSubmit={handleKeySubmit}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'input-model') {
    return (
      <InputStep
        prompt="请输入模型名称:"
        placeholder="gpt-4o"
        onSubmit={handleModelSubmit}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'input-alias') {
    return (
      <InputStep
        prompt="请输入别名 (可选，回车跳过):"
        placeholder=""
        onSubmit={handleAliasSubmit}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'verifying') {
    return (
      <Box flexDirection="column">
        <Text>正在验证模型配置...</Text>
      </Box>
    )
  }

  if (step === 'verify-failed') {
    return (
      <Box flexDirection="column">
        <Text color="red">验证失败: {verifyError}</Text>
        <Text> </Text>
        <Select
          options={[
            { label: '仍然保存', value: 'save', description: '可能是网络临时问题' },
            { label: '重新输入', value: 'retry', description: '重新配置 Provider 和模型' },
            { label: '取消', value: 'cancel', description: '放弃本次添加' },
          ]}
          onChange={handleVerifyFailChoice}
          onCancel={handleCancel}
        />
      </Box>
    )
  }

  // done 步骤：返回空节点
  return <Text> </Text>
}

// ===== 输入步骤组件 =====

/** 渲染文本输入步骤（与 setupWizard 中的 InputStep 相同模式） */
function InputStep({
  prompt,
  placeholder,
  onSubmit,
  onCancel,
}: {
  prompt: string
  placeholder: string
  onSubmit: (value: string) => void
  onCancel: () => void
}): React.ReactElement {
  // 用 ref 存储最新输入值，避免闭包陈旧问题
  const inputValueRef = React.useRef('')

  const options: OptionWithDescription[] = React.useMemo(
    () => [
      {
        label: prompt,
        value: 'input',
        type: 'input' as const,
        placeholder,
        onChange: (value: string) => {
          inputValueRef.current = value
        },
        allowEmptySubmitToCancel: true,
      },
    ],
    [prompt, placeholder],
  )

  const handleChange = React.useCallback(() => {
    onSubmit(inputValueRef.current)
  }, [onSubmit])

  return (
    <Box flexDirection="column">
      <Select
        options={options}
        onChange={handleChange}
        onCancel={onCancel}
      />
    </Box>
  )
}

// ===== 配置持久化辅助函数 =====

/**
 * 从 baseUrl 中提取域名作为 Provider key。
 * 例如 https://api.openai.com/v1 → openai
 */
function deriveProviderKey(baseUrl: string): string {
  try {
    const url = new URL(baseUrl)
    const hostname = url.hostname
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      const mainPart = parts.find(
        (p) => !['api', 'www', 'v1', 'v2'].includes(p),
      )
      return mainPart || parts[0] || 'custom'
    }
    return parts[0] || 'custom'
  } catch {
    return 'custom'
  }
}

/**
 * 保存模型配置到全局 models.json。
 * 如果 existingProviderKey 非空，追加模型到已有 Provider；
 * 否则创建新 Provider。
 */
function saveConfig(
  baseUrl: string,
  apiKey: string,
  modelName: string,
  alias: string,
  existingProviderKey: string | null,
): void {
  if (existingProviderKey) {
    // 追加模型到已有 Provider
    saveGlobalModelConfig((current) => {
      const provider = current.providers[existingProviderKey]
      if (!provider) return current
      return {
        ...current,
        providers: {
          ...current.providers,
          [existingProviderKey]: {
            ...provider,
            models: {
              ...provider.models,
              [modelName]: {
                name: modelName,
                ...(alias ? { alias: [alias] } : {}),
              },
            },
          },
        },
      }
    })
  } else {
    // 创建新 Provider
    const providerKey = deriveProviderKey(baseUrl)
    saveGlobalModelConfig((current) => ({
      ...current,
      providers: {
        ...current.providers,
        [providerKey]: {
          name: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
          baseUrl,
          ...(apiKey ? { apiKey } : {}),
          models: {
            [modelName]: {
              name: modelName,
              ...(alias ? { alias: [alias] } : {}),
            },
          },
        },
      },
    }))
  }
}

/**
 * 完成添加：激活模型并输出摘要。
 */
function finishAdd(
  baseUrl: string,
  apiKey: string,
  modelName: string,
  alias: string,
  onDone: (message: string, options?: { display: string }) => void,
): void {
  // 设置运行时环境变量
  const resolved: ResolvedModel = {
    providerKey: 'custom',
    providerName: 'Custom Provider',
    modelKey: modelName,
    modelName: modelName,
    baseUrl: baseUrl,
    apiKey: apiKey || null,
    aliases: alias ? [alias] : [],
  }
  activateModel(resolved)

  const summary = [
    '模型添加成功！',
    `  模型: ${modelName}`,
    alias ? `  别名: ${alias}` : '',
    `  端点: ${baseUrl}`,
    '',
    '后续操作:',
    '  /model list   - 查看所有模型',
    '  /model <别名>  - 切换模型',
  ]
    .filter(Boolean)
    .join('\n')

  onDone(summary, { display: 'system' })
}

// ===== 命令入口 =====

/** /model add 命令入口（与 model.tsx 的 call 模式一致） */
export const call: LocalJSXCommandCall = async (onDone, _context, _args) => {
  return <ModelAdd onDone={onDone} />
}
