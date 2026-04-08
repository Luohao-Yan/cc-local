/**
 * 首次启动引导向导（Setup_Wizard）
 *
 * 检测用户是否需要进入引导流程，并提供交互式配置界面。
 * 支持四种选择：Anthropic 官方、第三方 LLM、本地模型、跳过。
 */

import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { Select } from '../../components/CustomSelect/select.js'
import type { OptionWithDescription } from '../../components/CustomSelect/select.js'
import { getGlobalConfig } from '../../utils/config.js'
import { getModelConfig, saveGlobalModelConfig } from '../../utils/model/modelConfig.js'
import { activateModel, type ResolvedModel } from '../../utils/model/multiModel.js'

// ===== 引导步骤枚举 =====

/** 向导当前步骤 */
type WizardStep =
  | 'select-type'       // 选择使用方式
  | 'third-party-url'   // 第三方：输入 baseUrl
  | 'third-party-key'   // 第三方：输入 apiKey
  | 'third-party-model' // 第三方：输入模型名称
  | 'third-party-alias' // 第三方：输入别名
  | 'local-url'         // 本地：输入 baseUrl
  | 'local-model'       // 本地：输入模型名称
  | 'done'              // 完成

/** 用户选择的使用方式 */
type SetupChoice = 'anthropic' | 'third-party' | 'local' | 'skip'

// ===== 公开 API =====

/**
 * 检测是否需要进入引导流程。
 * 条件：无 ANTHROPIC_API_KEY 环境变量、无 JSON Provider 配置、无 OAuth 认证。
 * 三个条件全部满足时返回 true。
 */
export function shouldRunSetupWizard(): boolean {
  // 条件 1：无 ANTHROPIC_API_KEY 环境变量
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY

  // 条件 2：无 JSON Provider 配置
  const config = getModelConfig()
  const hasProviders = Object.keys(config.providers).length > 0

  // 条件 3：无 OAuth 认证（检查 oauthAccount 是否存在）
  let hasOAuth = false
  try {
    const globalConfig = getGlobalConfig()
    hasOAuth = !!globalConfig.oauthAccount
  } catch {
    // getGlobalConfig() 在启动早期可能抛出异常，视为无 OAuth
  }

  // 三个条件全部满足（都没有）时才需要引导
  return !hasApiKey && !hasProviders && !hasOAuth
}

// ===== 引导向导组件 =====

/**
 * 引导向导 React 组件。
 * 通过多步骤交互引导用户完成初始模型配置。
 */
export function SetupWizard({
  onDone,
}: {
  onDone: (message: string, options?: { display: string }) => void
}): React.ReactElement {
  // 当前步骤
  const [step, setStep] = React.useState<WizardStep>('select-type')

  // 收集的配置数据
  const [baseUrl, setBaseUrl] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [modelName, setModelName] = React.useState('')

  // ===== 选择使用方式 =====

  /** 处理使用方式选择 */
  const handleTypeSelect = React.useCallback(
    (value: string) => {
      const choice = value as SetupChoice
      switch (choice) {
        case 'anthropic':
          // Anthropic 官方：交给已有 OAuth 流程
          onDone('请使用 /login 命令登录 Anthropic 账号，或设置 ANTHROPIC_API_KEY 环境变量。', {
            display: 'system',
          })
          break
        case 'third-party':
          setStep('third-party-url')
          break
        case 'local':
          setStep('local-url')
          break
        case 'skip':
          // 跳过：提示后续操作
          onDone(
            '已跳过配置。后续可通过 /model add 命令或手动编辑 ~/.claude/models.json 完成配置。',
            { display: 'system' },
          )
          break
      }
    },
    [onDone],
  )

  /** 处理取消（Ctrl+C / Escape） */
  const handleCancel = React.useCallback(() => {
    onDone(
      '已取消配置。后续可通过 /model add 命令或手动编辑 ~/.claude/models.json 完成配置。',
      { display: 'system' },
    )
  }, [onDone])

  // ===== 第三方 LLM 输入处理 =====

  /** 第三方：保存 baseUrl，进入 apiKey 步骤 */
  const handleThirdPartyUrl = React.useCallback((value: string) => {
    if (value.trim()) {
      setBaseUrl(value.trim())
      setStep('third-party-key')
    }
  }, [])

  /** 第三方：保存 apiKey，进入模型名称步骤 */
  const handleThirdPartyKey = React.useCallback((value: string) => {
    setApiKey(value.trim())
    setStep('third-party-model')
  }, [])

  /** 第三方：保存模型名称，进入别名步骤 */
  const handleThirdPartyModel = React.useCallback((value: string) => {
    if (value.trim()) {
      setModelName(value.trim())
      setStep('third-party-alias')
    }
  }, [])

  /** 第三方：保存别名并写入配置 */
  const handleThirdPartyAlias = React.useCallback(
    (value: string) => {
      const alias = value.trim()
      saveThirdPartyConfig(baseUrl, apiKey, modelName, alias)
      setStep('done')

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
        '配置完成！',
        `  Provider: Custom Provider`,
        `  模型: ${modelName}`,
        alias ? `  别名: ${alias}` : '',
        `  端点: ${baseUrl}`,
        '',
        '后续操作:',
        '  /model add    - 添加更多模型',
        '  /model list   - 查看所有模型',
        '  /model <别名>  - 切换模型',
      ]
        .filter(Boolean)
        .join('\n')

      onDone(summary, { display: 'system' })
    },
    [baseUrl, apiKey, modelName, onDone],
  )

  // ===== 本地模型输入处理 =====

  /** 本地模型：保存 baseUrl，进入模型名称步骤 */
  const handleLocalUrl = React.useCallback((value: string) => {
    const url = value.trim() || 'http://localhost:11434/v1'
    setBaseUrl(url)
    setStep('local-model')
  }, [])

  /** 本地模型：保存模型名称并写入配置 */
  const handleLocalModel = React.useCallback(
    (value: string) => {
      if (value.trim()) {
        const name = value.trim()
        setModelName(name)
        setStep('done')

        const finalBaseUrl = baseUrl || 'http://localhost:11434/v1'
        saveLocalModelConfig(finalBaseUrl, name)

        // 设置运行时环境变量
        const resolved: ResolvedModel = {
          providerKey: 'local',
          providerName: '本地模型',
          modelKey: name,
          modelName: name,
          baseUrl: finalBaseUrl,
          apiKey: null,
          aliases: [],
        }
        activateModel(resolved)

        const summary = [
          '配置完成！',
          `  Provider: 本地模型`,
          `  模型: ${name}`,
          `  端点: ${finalBaseUrl}`,
          '',
          '后续操作:',
          '  /model add    - 添加更多模型',
          '  /model list   - 查看所有模型',
          '  /model <别名>  - 切换模型',
        ].join('\n')

        onDone(summary, { display: 'system' })
      }
    },
    [baseUrl, onDone],
  )

  // ===== 渲染各步骤 =====

  if (step === 'select-type') {
    return renderTypeSelection(handleTypeSelect, handleCancel)
  }

  if (step === 'third-party-url') {
    return (
      <InputStep
        prompt="请输入 API 端点 (baseUrl):"
        placeholder="https://api.openai.com/v1"
        onSubmit={handleThirdPartyUrl}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'third-party-key') {
    return (
      <InputStep
        prompt="请输入 API Key (回车跳过):"
        placeholder=""
        onSubmit={handleThirdPartyKey}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'third-party-model') {
    return (
      <InputStep
        prompt="请输入模型名称:"
        placeholder="gpt-4o"
        onSubmit={handleThirdPartyModel}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'third-party-alias') {
    return (
      <InputStep
        prompt="请输入别名 (可选，回车跳过):"
        placeholder=""
        onSubmit={handleThirdPartyAlias}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'local-url') {
    return (
      <InputStep
        prompt="请输入 API 端点 (回车使用默认值 http://localhost:11434/v1):"
        placeholder="http://localhost:11434/v1"
        onSubmit={handleLocalUrl}
        onCancel={handleCancel}
      />
    )
  }

  if (step === 'local-model') {
    return (
      <InputStep
        prompt="请输入模型名称:"
        placeholder="qwen3:32b"
        onSubmit={handleLocalModel}
        onCancel={handleCancel}
      />
    )
  }

  // done 步骤：返回空节点（onDone 已在回调中调用）
  return <Text> </Text>
}


// ===== 渲染辅助函数 =====

/** 渲染使用方式选择菜单 */
function renderTypeSelection(
  onSelect: (value: string) => void,
  onCancel: () => void,
): React.ReactElement {
  const options: OptionWithDescription[] = [
    {
      label: 'Anthropic 官方',
      value: 'anthropic',
      description: '登录 Claude 账号或使用 API Key',
    },
    {
      label: '第三方 LLM',
      value: 'third-party',
      description: 'OpenAI、豆包等兼容 API',
    },
    {
      label: '本地模型',
      value: 'local',
      description: 'Ollama、LM Studio 等本地服务',
    },
    {
      label: '跳过',
      value: 'skip',
      description: '稍后通过 /model add 配置',
    },
  ]

  return (
    <Box flexDirection="column">
      <Text>欢迎使用！请选择模型配置方式:</Text>
      <Text> </Text>
      <Select
        options={options}
        onChange={onSelect}
        onCancel={onCancel}
      />
    </Box>
  )
}

/** 渲染文本输入步骤（包装组件，用于捕获输入值） */
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
    // Select 的 onChange 在用户按回车时触发，此时从 ref 中读取实际输入值
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
 * 保存第三方 LLM 配置到全局 models.json。
 * 生成 Provider key 基于 baseUrl 的域名部分。
 */
function saveThirdPartyConfig(
  baseUrl: string,
  apiKey: string,
  modelName: string,
  alias: string,
): void {
  const providerKey = deriveProviderKey(baseUrl)

  saveGlobalModelConfig((current) => ({
    ...current,
    providers: {
      ...current.providers,
      [providerKey]: {
        name: 'Custom Provider',
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
    // 设置为默认模型
    defaultModel: alias || modelName,
  }))
}

/**
 * 保存本地模型配置到全局 models.json。
 */
function saveLocalModelConfig(baseUrl: string, modelName: string): void {
  saveGlobalModelConfig((current) => ({
    ...current,
    providers: {
      ...current.providers,
      local: {
        name: '本地模型',
        baseUrl,
        models: {
          [modelName]: {
            name: modelName,
          },
        },
      },
    },
    // 设置为默认模型
    defaultModel: modelName,
  }))
}

/**
 * 从 baseUrl 中提取域名作为 Provider key。
 * 例如 https://api.openai.com/v1 → openai
 */
function deriveProviderKey(baseUrl: string): string {
  try {
    const url = new URL(baseUrl)
    const hostname = url.hostname
    // 提取主域名部分（去掉 api. 前缀和 .com 等后缀）
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      // 跳过 api/www 等常见前缀
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
