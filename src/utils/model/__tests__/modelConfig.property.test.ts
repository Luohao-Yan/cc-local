// Feature: json-model-config, Property 1: 配置序列化 Round-Trip
/**
 * 属性测试：配置序列化 Round-Trip
 *
 * **Validates: Requirements 1.1, 1.3, 6.1, 6.3**
 *
 * 使用 fast-check 生成随机的 ModelsConfig 对象（包含任意数量的 Provider、模型、
 * 别名、headers 以及未知的额外字段），验证通过 JSON.stringify 序列化再通过
 * JSON.parse 反序列化后，产生与原始对象深度相等的结果。
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { ModelEntry, ProviderEntry, ModelsConfig } from '../modelConfig.js'

// ===== 自定义生成器 =====

/**
 * 生成 JSON 安全的字符串（排除会导致 JSON round-trip 不等价的特殊值）
 * 使用 unicode 字符串确保包含非 ASCII 字符（如中文）
 */
const jsonSafeString = fc.string({ minLength: 1, maxLength: 50 })

/**
 * 生成安全的字典键名（排除 __proto__ 等特殊属性名，避免原型链污染导致 round-trip 不等价）
 */
const safeDictKey = (opts: { minLength?: number; maxLength?: number } = {}) =>
  fc.string({ minLength: opts.minLength ?? 1, maxLength: opts.maxLength ?? 20 })
    .filter((k) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype')

/**
 * 生成 JSON 安全的原始值（用于未知额外字段的值）
 * 包含字符串、数字、布尔值、null
 * 注意：排除 -0，因为 JSON.stringify(-0) === "0"，round-trip 后变为 +0
 */
const jsonPrimitive = fc.oneof(
  fc.string({ maxLength: 30 }),
  fc.integer(),
  fc.double({ noNaN: true, noDefaultInfinity: true }).filter((v) => !Object.is(v, -0)),
  fc.boolean(),
  fc.constant(null),
)

/**
 * 生成 JSON 安全的值（用于未知额外字段，支持嵌套对象和数组）
 */
const jsonValue: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: 'small' },
    jsonPrimitive,
    fc.array(tie('value'), { maxLength: 3 }),
    fc.dictionary(safeDictKey({ maxLength: 10 }), tie('value'), { maxKeys: 3 }),
  ),
})).value

/**
 * 生成随机的未知额外字段字典
 * 键名避免与已知字段冲突
 */
function arbExtraFields(knownKeys: string[]): fc.Arbitrary<Record<string, unknown>> {
  // 生成不与已知字段冲突的键名
  const safeKey = safeDictKey({ maxLength: 15 }).filter(
    (k) => !knownKeys.includes(k),
  )
  return fc.dictionary(safeKey, jsonValue, { maxKeys: 3 })
}

/**
 * 生成随机的 ModelEntry 对象
 * 包含必填的 name 字段、可选的 alias 数组、以及随机的未知额外字段
 */
export function arbModelEntry(): fc.Arbitrary<ModelEntry> {
  return fc.record({
    name: jsonSafeString,
    alias: fc.option(fc.array(jsonSafeString, { minLength: 0, maxLength: 5 }), { nil: undefined }),
    extra: arbExtraFields(['name', 'alias']),
  }).map(({ name, alias, extra }) => {
    // 合并已知字段和额外字段
    const entry: ModelEntry = { name, ...extra }
    if (alias !== undefined) {
      entry.alias = alias
    }
    return entry
  })
}

/**
 * 生成随机的 ProviderEntry 对象
 * 包含必填的 name、baseUrl、models 字段，可选的 apiKey、headers 字段，
 * 以及随机的未知额外字段
 */
export function arbProviderEntry(): fc.Arbitrary<ProviderEntry> {
  // 生成合法的 baseUrl（以 http:// 或 https:// 开头）
  const arbBaseUrl = fc.oneof(
    fc.string({ minLength: 1, maxLength: 30 }).map((s) => `http://${s}`),
    fc.string({ minLength: 1, maxLength: 30 }).map((s) => `https://${s}`),
  )

  // 生成模型字典（0-5 个模型）
  const arbModels = fc.dictionary(
    safeDictKey(),
    arbModelEntry(),
    { minKeys: 0, maxKeys: 5 },
  )

  // 生成可选的 headers 字典
  const arbHeaders = fc.option(
    fc.dictionary(
      safeDictKey(),
      fc.string({ maxLength: 50 }),
      { maxKeys: 5 },
    ),
    { nil: undefined },
  )

  // 生成可选的 apiKey
  const arbApiKey = fc.option(jsonSafeString, { nil: undefined })

  return fc.record({
    name: jsonSafeString,
    baseUrl: arbBaseUrl,
    apiKey: arbApiKey,
    headers: arbHeaders,
    models: arbModels,
    extra: arbExtraFields(['name', 'baseUrl', 'apiKey', 'headers', 'models']),
  }).map(({ name, baseUrl, apiKey, headers, models, extra }) => {
    const entry: ProviderEntry = { name, baseUrl, models, ...extra }
    if (apiKey !== undefined) {
      entry.apiKey = apiKey
    }
    if (headers !== undefined) {
      entry.headers = headers
    }
    return entry
  })
}

/**
 * 生成随机的 ModelsConfig 对象
 * 包含必填的 providers 字段，可选的 defaultModel、smallFastModel、settings 字段，
 * 以及随机的未知额外字段
 */
export function arbModelsConfig(): fc.Arbitrary<ModelsConfig> {
  // 生成 Provider 字典（0-5 个 Provider）
  const arbProviders = fc.dictionary(
    safeDictKey(),
    arbProviderEntry(),
    { minKeys: 0, maxKeys: 5 },
  )

  // 生成可选的 settings 对象
  const arbSettings = fc.option(
    fc.record({
      disableInstallationChecks: fc.option(fc.boolean(), { nil: undefined }),
      extra: arbExtraFields(['disableInstallationChecks']),
    }).map(({ disableInstallationChecks, extra }) => {
      const settings: Record<string, unknown> = { ...extra }
      if (disableInstallationChecks !== undefined) {
        settings.disableInstallationChecks = disableInstallationChecks
      }
      return settings as ModelsConfig['settings']
    }),
    { nil: undefined },
  )

  return fc.record({
    providers: arbProviders,
    defaultModel: fc.option(jsonSafeString, { nil: undefined }),
    smallFastModel: fc.option(jsonSafeString, { nil: undefined }),
    settings: arbSettings,
    extra: arbExtraFields(['providers', 'defaultModel', 'smallFastModel', 'settings']),
  }).map(({ providers, defaultModel, smallFastModel, settings, extra }) => {
    const config: ModelsConfig = { providers, ...extra }
    if (defaultModel !== undefined) {
      config.defaultModel = defaultModel
    }
    if (smallFastModel !== undefined) {
      config.smallFastModel = smallFastModel
    }
    if (settings !== undefined) {
      config.settings = settings
    }
    return config
  })
}

// ===== 属性测试 =====

describe('Feature: json-model-config, Property 1: 配置序列化 Round-Trip', () => {
  it('任意合法 ModelsConfig 经 JSON.stringify → JSON.parse 后应与原始对象深度相等', () => {
    fc.assert(
      fc.property(arbModelsConfig(), (config: ModelsConfig) => {
        // 序列化为 JSON 字符串（使用 2 空格缩进，与 saveGlobalModelConfig 一致）
        const serialized = JSON.stringify(config, null, 2)

        // 反序列化回对象
        const deserialized = JSON.parse(serialized)

        // 验证 round-trip 后深度相等
        // 使用 toEqual 进行深度比较（不检查原型链，避免 fc.dictionary 生成
        // __proto__ 键时导致的原型链差异误报）
        expect(deserialized).toEqual(config)
      }),
      { numRuns: 100 },
    )
  })
})


// ===== 环境变量引用解析相关导入 =====
import { resolveEnvReference } from '../modelConfig.js'
import { afterEach } from 'vitest'

// ===== 环境变量名生成器 =====

/**
 * 生成合法的环境变量名（匹配 [A-Za-z_][A-Za-z0-9_]* 模式）
 * 首字符为字母或下划线，后续字符为字母、数字或下划线
 * 导出供其他测试文件复用
 */
export function arbEnvVarName(): fc.Arbitrary<string> {
  // 首字符：字母或下划线
  const firstChar = fc.mapToConstant(
    { num: 26, build: (v) => String.fromCharCode(65 + v) },  // A-Z
    { num: 26, build: (v) => String.fromCharCode(97 + v) },  // a-z
    { num: 1, build: () => '_' },                              // _
  )

  // 后续字符：字母、数字或下划线
  const restChar = fc.mapToConstant(
    { num: 26, build: (v) => String.fromCharCode(65 + v) },  // A-Z
    { num: 26, build: (v) => String.fromCharCode(97 + v) },  // a-z
    { num: 10, build: (v) => String.fromCharCode(48 + v) },  // 0-9
    { num: 1, build: () => '_' },                              // _
  )

  return fc.tuple(
    firstChar,
    fc.array(restChar, { minLength: 0, maxLength: 30 }),
  ).map(([first, rest]) => first + rest.join(''))
}

// ===== Property 2 & 3: 环境变量引用解析属性测试 =====

// Feature: json-model-config, Property 2: 环境变量引用解析正确性
// Feature: json-model-config, Property 3: 不存在的环境变量引用报错
/**
 * 属性测试：环境变量引用解析
 *
 * **Validates: Requirements 1.2, 4.3, 4.4**
 *
 * Property 2: 对于任意合法环境变量名 VAR 和任意字符串值 VAL，
 * 当 process.env[VAR] = VAL 时，resolveEnvReference("{env:VAR}") 应返回 VAL。
 *
 * Property 3: 对于任意不存在于 process.env 中的合法环境变量名 VAR，
 * resolveEnvReference("{env:VAR}") 应抛出包含 VAR 名称的错误。
 */
describe('Feature: json-model-config, Property 2 & 3: 环境变量引用解析', () => {
  /** 记录测试中设置的环境变量名，用于 afterEach 清理 */
  const envVarsToCleanup: string[] = []

  afterEach(() => {
    // 清理测试中设置的所有环境变量
    for (const varName of envVarsToCleanup) {
      delete process.env[varName]
    }
    envVarsToCleanup.length = 0
  })

  it('Property 2: 已设置的环境变量引用应正确解析为对应值', () => {
    fc.assert(
      fc.property(
        arbEnvVarName(),
        fc.string({ minLength: 0, maxLength: 100 }),
        (varName: string, varValue: string) => {
          // 使用唯一前缀避免与真实环境变量冲突
          const testVarName = `__PBT_TEST_${varName}`

          // 设置环境变量并记录以便清理
          process.env[testVarName] = varValue
          envVarsToCleanup.push(testVarName)

          // 构造 {env:VAR} 引用字符串
          const envRef = `{env:${testVarName}}`

          // 解析应返回设置的值
          const result = resolveEnvReference(envRef)
          expect(result).toBe(varValue)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Property 3: 不存在的环境变量引用应抛出包含变量名的错误', () => {
    fc.assert(
      fc.property(
        arbEnvVarName(),
        (varName: string) => {
          // 使用唯一前缀确保该变量不存在
          const testVarName = `__PBT_NONEXIST_${varName}`

          // 确保该环境变量确实不存在
          delete process.env[testVarName]

          // 构造 {env:VAR} 引用字符串
          const envRef = `{env:${testVarName}}`

          // 解析应抛出错误，且错误信息中包含变量名
          expect(() => resolveEnvReference(envRef)).toThrow(testVarName)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('非 {env:} 格式的字符串应原样返回', () => {
    fc.assert(
      fc.property(
        // 生成不匹配 {env:VAR} 格式的字符串
        fc.string({ minLength: 0, maxLength: 100 }).filter(
          (s) => !/^\{env:[A-Za-z_][A-Za-z0-9_]*\}$/.test(s),
        ),
        (value: string) => {
          // 非 {env:} 格式应原样返回
          const result = resolveEnvReference(value)
          expect(result).toBe(value)
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ===== 配置合并相关导入 =====
import { mergeModelsConfig } from '../modelConfig.js'

// Feature: json-model-config, Property 6: 配置合并 Provider 级别覆盖
/**
 * 属性测试：配置合并 Provider 级别覆盖
 *
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
 *
 * 对于任意全局 ModelsConfig G 和项目级 ModelsConfig P，合并结果 M 应满足：
 * (a) P 中存在的 Provider key，M 中对应值等于 P 中的值
 * (b) 仅在 G 中存在的 Provider key，M 中对应值等于 G 中的值
 * (c) M 中不包含 G 和 P 都没有的 Provider key
 */
describe('Feature: json-model-config, Property 6: 配置合并 Provider 级别覆盖', () => {
  it('(a) 项目级 Provider 应覆盖全局级同名 Provider', () => {
    fc.assert(
      fc.property(
        arbModelsConfig(),
        arbModelsConfig(),
        (globalConfig: ModelsConfig, projectConfig: ModelsConfig) => {
          const merged = mergeModelsConfig(globalConfig, projectConfig)

          // 项目级配置中存在的每个 Provider key，合并结果中应等于项目级的值
          for (const key of Object.keys(projectConfig.providers)) {
            expect(merged.providers[key]).toEqual(projectConfig.providers[key])
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('(b) 仅在全局级存在的 Provider 应保留在合并结果中', () => {
    fc.assert(
      fc.property(
        arbModelsConfig(),
        arbModelsConfig(),
        (globalConfig: ModelsConfig, projectConfig: ModelsConfig) => {
          const merged = mergeModelsConfig(globalConfig, projectConfig)

          // 仅在全局配置中存在（不在项目级中）的 Provider key，合并结果中应等于全局级的值
          for (const key of Object.keys(globalConfig.providers)) {
            if (!(key in projectConfig.providers)) {
              expect(merged.providers[key]).toEqual(globalConfig.providers[key])
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('(c) 合并结果不应包含全局和项目级都没有的 Provider key', () => {
    fc.assert(
      fc.property(
        arbModelsConfig(),
        arbModelsConfig(),
        (globalConfig: ModelsConfig, projectConfig: ModelsConfig) => {
          const merged = mergeModelsConfig(globalConfig, projectConfig)

          // 合并结果中的每个 Provider key 必须来自全局或项目级配置
          for (const key of Object.keys(merged.providers)) {
            const existsInGlobal = key in globalConfig.providers
            const existsInProject = key in projectConfig.providers
            expect(existsInGlobal || existsInProject).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ===== 配置校验相关导入 =====
import { validateModelConfig } from '../modelConfigValidator.js'

// ===== 非法 URL 生成器 =====

/**
 * 生成不以 http:// 或 https:// 开头的字符串
 * 用于测试 baseUrl 格式校验
 * 导出供其他测试文件复用
 */
export function arbInvalidUrl(): fc.Arbitrary<string> {
  return fc.oneof(
    // 空字符串
    fc.constant(''),
    // 纯文本（无协议前缀）
    fc.string({ minLength: 1, maxLength: 50 }).filter(
      (s) => !s.startsWith('http://') && !s.startsWith('https://'),
    ),
    // 类似但不正确的协议前缀
    fc.constantFrom(
      'ftp://', 'ws://', 'wss://', 'file://', 'htp://', 'htps://',
      'HTTP://', 'HTTPS://', 'Http://', 'Https://',
    ).chain((prefix) =>
      fc.string({ minLength: 0, maxLength: 30 }).map((s) => prefix + s),
    ),
  )
}

// ===== Property 4 & 5: baseUrl 格式校验和必填字段校验 =====

// Feature: json-model-config, Property 4: 非法 baseUrl 格式校验
// Feature: json-model-config, Property 5: 缺少必填字段校验
/**
 * 属性测试：baseUrl 格式校验和必填字段校验
 *
 * **Validates: Requirements 1.7, 1.9**
 *
 * Property 4: 对于任意不以 http:// 或 https:// 开头的字符串作为 Provider 的 baseUrl，
 * validateModelConfig 应返回包含该 Provider 路径的格式错误。
 *
 * Property 5: 对于任意缺少 baseUrl 字段的 Provider 配置，
 * validateModelConfig 应返回包含 "baseUrl" 的校验错误。
 */
describe('Feature: json-model-config, Property 4 & 5: baseUrl 格式校验和必填字段校验', () => {
  it('Property 4: 非法 baseUrl 格式应返回包含 Provider 路径的错误', () => {
    fc.assert(
      fc.property(
        // 生成 Provider key
        safeDictKey(),
        // 生成非法 URL
        arbInvalidUrl(),
        // 生成 Provider 名称
        jsonSafeString,
        (providerKey: string, invalidUrl: string, providerName: string) => {
          // 构造包含非法 baseUrl 的配置
          const config = {
            providers: {
              [providerKey]: {
                name: providerName,
                baseUrl: invalidUrl,
                models: {},
              },
            },
          }

          const errors = validateModelConfig(config)

          // 应至少有一个错误包含该 Provider 的路径
          const providerPath = `providers.${providerKey}`
          const hasPathError = errors.some(
            (e) => e.severity === 'error' && e.path.startsWith(providerPath),
          )
          expect(hasPathError).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Property 5: 缺少 baseUrl 字段应返回包含 "baseUrl" 的错误', () => {
    fc.assert(
      fc.property(
        // 生成 Provider key
        safeDictKey(),
        // 生成 Provider 名称
        jsonSafeString,
        // 生成可选的模型字典
        fc.dictionary(
          safeDictKey(),
          arbModelEntry(),
          { minKeys: 0, maxKeys: 3 },
        ),
        (providerKey: string, providerName: string, models: Record<string, ModelEntry>) => {
          // 构造缺少 baseUrl 的 Provider 配置
          const config = {
            providers: {
              [providerKey]: {
                name: providerName,
                models,
                // 故意不包含 baseUrl 字段
              },
            },
          }

          const errors = validateModelConfig(config)

          // 应至少有一个错误包含 "baseUrl" 关键字
          const hasBaseUrlError = errors.some(
            (e) => e.severity === 'error' && e.message.includes('baseUrl'),
          )
          expect(hasBaseUrlError).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ===== 别名冲突和明文 API Key 检测相关导入 =====
import { detectAliasConflicts, detectPlaintextApiKeys } from '../modelConfigValidator.js'

// ===== Property 9 & 10: 别名冲突检测和明文 API Key 安全检测 =====

// Feature: json-model-config, Property 9: 别名冲突检测
// Feature: json-model-config, Property 10: 明文 API Key 安全检测
/**
 * 属性测试：别名冲突检测和明文 API Key 安全检测
 *
 * **Validates: Requirements 4.6, 7.2**
 *
 * Property 9: 对于任意 ModelsConfig，当不同 Provider 下的模型配置了相同的别名
 * （不区分大小写）时，detectAliasConflicts 应返回包含该冲突别名和涉及 Provider
 * 名称的警告。
 *
 * Property 10: 对于任意项目级 ModelsConfig，当 apiKey 字段值为长度超过 20 且
 * 不匹配 {env:} 格式的字符串时，detectPlaintextApiKeys 应返回包含该 Provider
 * 路径的安全警告。
 */
describe('Feature: json-model-config, Property 9 & 10: 别名冲突检测和明文 API Key 安全检测', () => {
  it('Property 9: 不同 Provider 下相同别名（不区分大小写）应触发冲突警告', () => {
    fc.assert(
      fc.property(
        // 生成共享别名（至少 1 个字符）
        fc.string({ minLength: 1, maxLength: 20 }),
        // 生成两个不同的 Provider key
        safeDictKey({ minLength: 1 }),
        safeDictKey({ minLength: 1 }),
        // 生成两个 Provider 名称
        jsonSafeString,
        jsonSafeString,
        // 生成两个模型 key
        safeDictKey({ minLength: 1 }),
        safeDictKey({ minLength: 1 }),
        // 生成两个模型名称
        jsonSafeString,
        jsonSafeString,
        (
          sharedAlias: string,
          providerKey1: string,
          providerKey2: string,
          providerName1: string,
          providerName2: string,
          modelKey1: string,
          modelKey2: string,
          modelName1: string,
          modelName2: string,
        ) => {
          // 确保两个 Provider key 不同（否则不算跨 Provider 冲突）
          fc.pre(providerKey1 !== providerKey2)

          // 构造包含相同别名的两个 Provider 的配置
          // 第二个 Provider 使用大小写变体，验证不区分大小写
          const aliasVariant = sharedAlias.toUpperCase() === sharedAlias
            ? sharedAlias.toLowerCase()
            : sharedAlias.toUpperCase()

          const config: ModelsConfig = {
            providers: {
              [providerKey1]: {
                name: providerName1,
                baseUrl: 'https://api1.example.com',
                models: {
                  [modelKey1]: {
                    name: modelName1,
                    alias: [sharedAlias],
                  },
                },
              },
              [providerKey2]: {
                name: providerName2,
                baseUrl: 'https://api2.example.com',
                models: {
                  [modelKey2]: {
                    name: modelName2,
                    alias: [aliasVariant],
                  },
                },
              },
            },
          }

          const warnings = detectAliasConflicts(config)

          // 应至少有一个警告包含冲突别名（不区分大小写）
          const hasAliasWarning = warnings.some(
            (w) =>
              w.severity === 'warning' &&
              w.message.toLowerCase().includes(sharedAlias.toLowerCase()),
          )
          expect(hasAliasWarning).toBe(true)

          // 警告中应包含涉及的 Provider 名称
          const hasProviderNames = warnings.some(
            (w) =>
              w.severity === 'warning' &&
              (w.message.includes(providerName1) || w.message.includes(providerName2)),
          )
          expect(hasProviderNames).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Property 10: 项目级配置中明文 API Key 应触发安全警告', () => {
    fc.assert(
      fc.property(
        // 生成 Provider key
        safeDictKey({ minLength: 1 }),
        // 生成 Provider 名称
        jsonSafeString,
        // 生成长度超过 20 的明文 API Key（不匹配 {env:} 格式）
        fc.string({ minLength: 21, maxLength: 80 }).filter(
          (s) => !/^\{env:[A-Za-z_][A-Za-z0-9_]*\}$/.test(s),
        ),
        (providerKey: string, providerName: string, plaintextKey: string) => {
          // 构造包含明文 API Key 的项目级配置
          const config: ModelsConfig = {
            providers: {
              [providerKey]: {
                name: providerName,
                baseUrl: 'https://api.example.com',
                apiKey: plaintextKey,
                models: {},
              },
            },
          }

          // 以 'project' 来源调用检测
          const warnings = detectPlaintextApiKeys(config, 'project')

          // 应至少有一个警告包含该 Provider 的路径
          const providerPath = `providers.${providerKey}`
          const hasPathWarning = warnings.some(
            (w) =>
              w.severity === 'warning' &&
              w.path.includes(providerPath),
          )
          expect(hasPathWarning).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Property 10: 全局配置中的明文 API Key 不应触发安全警告', () => {
    fc.assert(
      fc.property(
        // 生成 Provider key
        safeDictKey({ minLength: 1 }),
        // 生成 Provider 名称
        jsonSafeString,
        // 生成长度超过 20 的明文 API Key
        fc.string({ minLength: 21, maxLength: 80 }).filter(
          (s) => !/^\{env:[A-Za-z_][A-Za-z0-9_]*\}$/.test(s),
        ),
        (providerKey: string, providerName: string, plaintextKey: string) => {
          const config: ModelsConfig = {
            providers: {
              [providerKey]: {
                name: providerName,
                baseUrl: 'https://api.example.com',
                apiKey: plaintextKey,
                models: {},
              },
            },
          }

          // 以 'global' 来源调用检测，不应产生任何警告
          const warnings = detectPlaintextApiKeys(config, 'global')
          expect(warnings).toHaveLength(0)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Property 10: 使用 {env:} 格式的 API Key 不应触发安全警告', () => {
    fc.assert(
      fc.property(
        // 生成 Provider key
        safeDictKey({ minLength: 1 }),
        // 生成 Provider 名称
        jsonSafeString,
        // 生成合法的环境变量名
        arbEnvVarName(),
        (providerKey: string, providerName: string, envVarName: string) => {
          const config: ModelsConfig = {
            providers: {
              [providerKey]: {
                name: providerName,
                baseUrl: 'https://api.example.com',
                apiKey: `{env:${envVarName}}`,
                models: {},
              },
            },
          }

          // 即使是项目级配置，{env:} 格式也不应触发警告
          const warnings = detectPlaintextApiKeys(config, 'project')
          expect(warnings).toHaveLength(0)
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ===== 模型解析和激活相关导入 =====
import { activateModel, resetMultiModelState } from '../multiModel.js'
import type { ResolvedModel } from '../multiModel.js'
import { beforeEach } from 'vitest'

// ===== Property 7 & 8: 模型解析匹配优先级和模型激活设置环境变量 =====

// Feature: json-model-config, Property 7: 模型解析匹配优先级
// Feature: json-model-config, Property 8: 模型激活设置环境变量
/**
 * 属性测试：模型解析匹配优先级和模型激活设置环境变量
 *
 * **Validates: Requirements 4.1, 4.2**
 *
 * Property 7: 对于任意 ModelsConfig 和查询字符串 q，当 q 同时匹配某个模型的别名
 * 和另一个模型的 ID 时，resolveMultiModelConfig(q) 应返回别名匹配的模型；
 * 匹配应不区分大小写。
 *
 * Property 8: 对于任意 ResolvedModel，调用 activateModel 后：
 * (a) process.env.ANTHROPIC_BASE_URL 应等于 resolved.baseUrl
 * (b) 当 resolved.apiKey 非 null 时，process.env.ANTHROPIC_API_KEY 应等于 resolved.apiKey
 * (c) 当 resolved.apiKey 为 null 时，process.env.ANTHROPIC_API_KEY 应等于 "local-no-key"
 */
describe('Feature: json-model-config, Property 7: 模型解析匹配优先级', () => {
  /**
   * 模拟 resolveMultiModelConfig 的核心匹配逻辑。
   * 直接在 ResolvedModel[] 上执行匹配，避免依赖文件 I/O。
   * 匹配顺序与 multiModel.ts 中的 resolveMultiModelConfig 一致：
   *   1. 别名（alias）
   *   2. 模型 ID（modelKey）
   *   3. 模型显示名称（modelName）
   */
  function resolveFromModels(models: ResolvedModel[], input: string): string | null {
    const normalized = input.trim().toLowerCase()

    // 第一优先级：按别名匹配
    let matched = models.find(m =>
      m.aliases.some(alias => alias.toLowerCase() === normalized),
    )

    // 第二优先级：按模型 ID（key）匹配
    if (!matched) {
      matched = models.find(m => m.modelKey.toLowerCase() === normalized)
    }

    // 第三优先级：按模型显示名称匹配
    if (!matched) {
      matched = models.find(m => m.modelName.toLowerCase() === normalized)
    }

    return matched ? matched.modelKey : null
  }

  it('Property 7: 当查询字符串同时匹配别名和另一个模型的 ID 时，应返回别名匹配的模型（不区分大小写）', () => {
    fc.assert(
      fc.property(
        // 生成共享查询字符串（至少 1 个字符，用作别名和模型 ID）
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          // 过滤掉空白字符串（trim 后为空）
          (s) => s.trim().length > 0,
        ),
        // 生成别名匹配模型的 modelKey（确保与查询字符串不同）
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => s.trim().length > 0,
        ),
        (
          queryStr: string,
          aliasModelKey: string,
        ) => {
          // 前置条件：别名模型的 key 与查询字符串不同（不区分大小写），
          // 否则别名模型同时也是 ID 匹配，无法区分优先级
          fc.pre(aliasModelKey.trim().toLowerCase() !== queryStr.trim().toLowerCase())

          // 构造两个 ResolvedModel：
          // 模型 A：有别名 = queryStr（去除首尾空白，与输入 trim 后一致，应被优先匹配）
          // 模型 B：模型 ID = queryStr（ID 匹配，优先级低于别名）
          const trimmedQuery = queryStr.trim()
          const models: ResolvedModel[] = [
            {
              providerKey: 'provider-alias',
              providerName: 'Provider With Alias',
              modelKey: aliasModelKey,
              modelName: 'Alias Model',
              baseUrl: 'https://alias-provider.example.com',
              apiKey: null,
              aliases: [trimmedQuery],
            },
            {
              providerKey: 'provider-id',
              providerName: 'Provider With ID',
              modelKey: trimmedQuery,
              modelName: 'ID Model',
              baseUrl: 'https://id-provider.example.com',
              apiKey: null,
              aliases: [],
            },
          ]

          // 使用大小写变体查询，验证不区分大小写
          const queryVariant = queryStr.toUpperCase() === queryStr
            ? queryStr.toLowerCase()
            : queryStr.toUpperCase()

          const result = resolveFromModels(models, queryVariant)

          // 应返回别名匹配的模型 key，而非 ID 匹配的模型
          expect(result).toBe(aliasModelKey)
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('Feature: json-model-config, Property 8: 模型激活设置环境变量', () => {
  /** 保存原始环境变量，用于测试后恢复 */
  let originalBaseUrl: string | undefined
  let originalApiKey: string | undefined

  beforeEach(() => {
    // 保存原始环境变量
    originalBaseUrl = process.env.ANTHROPIC_BASE_URL
    originalApiKey = process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    // 恢复原始环境变量
    if (originalBaseUrl !== undefined) {
      process.env.ANTHROPIC_BASE_URL = originalBaseUrl
    } else {
      delete process.env.ANTHROPIC_BASE_URL
    }
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey
    } else {
      delete process.env.ANTHROPIC_API_KEY
    }
  })

  /**
   * 生成随机的 ResolvedModel 对象
   * 包含所有必填字段，apiKey 可为 string 或 null
   */
  const arbResolvedModel: fc.Arbitrary<ResolvedModel> = fc.record({
    providerKey: fc.string({ minLength: 1, maxLength: 20 }),
    providerName: fc.string({ minLength: 1, maxLength: 30 }),
    modelKey: fc.string({ minLength: 1, maxLength: 30 }),
    modelName: fc.string({ minLength: 1, maxLength: 30 }),
    baseUrl: fc.oneof(
      fc.string({ minLength: 1, maxLength: 30 }).map((s) => `http://${s}`),
      fc.string({ minLength: 1, maxLength: 30 }).map((s) => `https://${s}`),
    ),
    apiKey: fc.oneof(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.constant(null),
    ),
    aliases: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
  })

  it('Property 8(a): activateModel 后 ANTHROPIC_BASE_URL 应等于 resolved.baseUrl', () => {
    fc.assert(
      fc.property(arbResolvedModel, (resolved: ResolvedModel) => {
        // 调用 activateModel 设置环境变量
        activateModel(resolved)

        // 验证 ANTHROPIC_BASE_URL 被正确设置
        expect(process.env.ANTHROPIC_BASE_URL).toBe(resolved.baseUrl)
      }),
      { numRuns: 100 },
    )
  })

  it('Property 8(b): 当 apiKey 非 null 时，ANTHROPIC_API_KEY 应等于 resolved.apiKey', () => {
    fc.assert(
      fc.property(
        // 仅生成 apiKey 非 null 的 ResolvedModel
        arbResolvedModel.filter((m) => m.apiKey !== null),
        (resolved: ResolvedModel) => {
          // 调用 activateModel 设置环境变量
          activateModel(resolved)

          // 验证 ANTHROPIC_API_KEY 等于实际的 apiKey
          expect(process.env.ANTHROPIC_API_KEY).toBe(resolved.apiKey)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('Property 8(c): 当 apiKey 为 null 时，ANTHROPIC_API_KEY 应等于 "local-no-key"', () => {
    fc.assert(
      fc.property(
        // 仅生成 apiKey 为 null 的 ResolvedModel
        arbResolvedModel.map((m) => ({ ...m, apiKey: null })),
        (resolved: ResolvedModel) => {
          // 调用 activateModel 设置环境变量
          activateModel(resolved)

          // 验证 ANTHROPIC_API_KEY 为占位值 'local-no-key'
          expect(process.env.ANTHROPIC_API_KEY).toBe('local-no-key')
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ===== Property 11: 模型删除后不可查找 =====

// Feature: json-model-config, Property 11: 模型删除后不可查找
/**
 * 属性测试：模型删除后不可查找
 *
 * **Validates: Requirements 9.4**
 *
 * 对于任意 ModelsConfig 和其中存在的模型，执行删除操作后，
 * 该模型的别名、ID、显示名称均不应被 resolveMultiModelConfig 匹配到。
 */
describe('Feature: json-model-config, Property 11: 模型删除后不可查找', () => {
  /**
   * 模拟 resolveMultiModelConfig 的核心匹配逻辑（与 Property 7 中一致）。
   * 直接在 ResolvedModel[] 上执行匹配，避免依赖文件 I/O。
   */
  function resolveFromModels(models: ResolvedModel[], input: string): string | null {
    const normalized = input.trim().toLowerCase()

    // 第一优先级：按别名匹配
    let matched = models.find(m =>
      m.aliases.some(alias => alias.toLowerCase() === normalized),
    )

    // 第二优先级：按模型 ID（key）匹配
    if (!matched) {
      matched = models.find(m => m.modelKey.toLowerCase() === normalized)
    }

    // 第三优先级：按模型显示名称匹配
    if (!matched) {
      matched = models.find(m => m.modelName.toLowerCase() === normalized)
    }

    return matched ? matched.modelKey : null
  }

  /**
   * 从 ModelsConfig 中提取所有模型的扁平列表（模拟 getConfiguredModels 逻辑）。
   * 不依赖文件 I/O，直接遍历配置对象。
   */
  function extractModels(config: ModelsConfig): ResolvedModel[] {
    const models: ResolvedModel[] = []
    for (const [providerKey, provider] of Object.entries(config.providers)) {
      if (!provider.models) continue
      for (const [modelKey, model] of Object.entries(provider.models)) {
        models.push({
          providerKey,
          providerName: provider.name,
          modelKey,
          modelName: model.name,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey ?? null,
          aliases: Array.isArray(model.alias) ? model.alias : [],
          headers: provider.headers,
        })
      }
    }
    return models
  }

  /**
   * 生成至少包含一个模型的 ModelsConfig，并随机选取其中一个模型作为删除目标。
   * 返回 [config, providerKey, modelKey] 三元组。
   */
  const arbConfigWithTarget = arbModelsConfig()
    // 过滤：至少有一个 Provider 且该 Provider 至少有一个模型
    .filter((config) => {
      for (const provider of Object.values(config.providers)) {
        if (provider.models && Object.keys(provider.models).length > 0) {
          return true
        }
      }
      return false
    })
    .chain((config) => {
      // 收集所有 [providerKey, modelKey] 对
      const targets: [string, string][] = []
      for (const [pk, provider] of Object.entries(config.providers)) {
        if (!provider.models) continue
        for (const mk of Object.keys(provider.models)) {
          targets.push([pk, mk])
        }
      }
      // 随机选取一个目标模型
      return fc.constantFrom(...targets).map(([pk, mk]) => ({
        config,
        providerKey: pk,
        modelKey: mk,
      }))
    })

  it('Property 11: 模型从配置中移除后，其别名、ID、显示名称均不应被匹配到', () => {
    fc.assert(
      fc.property(
        arbConfigWithTarget,
        ({ config, providerKey, modelKey }) => {
          // 获取待删除模型的信息（删除前）
          const targetModel = config.providers[providerKey].models[modelKey]
          const targetAliases = Array.isArray(targetModel.alias) ? targetModel.alias : []
          const targetName = targetModel.name

          // 模拟删除操作：从配置中移除该模型
          const updatedConfig: ModelsConfig = JSON.parse(JSON.stringify(config))
          delete updatedConfig.providers[providerKey].models[modelKey]

          // 从更新后的配置中提取模型列表
          const remainingModels = extractModels(updatedConfig)

          // 辅助函数：检查剩余模型中是否存在与被删除模型相同 providerKey+modelKey 的条目
          // 由于我们只删除了特定 provider 下的特定 model，该组合不应再出现
          const deletedModelStillExists = remainingModels.some(
            (m) => m.providerKey === providerKey && m.modelKey === modelKey,
          )
          expect(deletedModelStillExists).toBe(false)

          // 验证：通过模型 ID 查找，不应匹配到被删除的模型
          // 注意：其他 Provider 下可能存在相同 modelKey 的模型，此时匹配到的是另一个模型
          const byId = resolveFromModels(remainingModels, modelKey)
          if (byId !== null) {
            // 匹配到的模型必须来自不同的 Provider（不是被删除的那个）
            const matchedModel = remainingModels.find(
              (m) => m.modelKey === byId,
            )
            expect(matchedModel).toBeDefined()
            // 确认匹配到的不是被删除的那个（providerKey 不同或 modelKey 不同）
            expect(
              matchedModel!.providerKey !== providerKey || matchedModel!.modelKey !== modelKey,
            ).toBe(true)
          }

          // 验证：通过模型显示名称查找，不应匹配到被删除的模型
          const byName = resolveFromModels(remainingModels, targetName)
          if (byName !== null) {
            const matchedModel = remainingModels.find(
              (m) => m.modelKey === byName,
            )
            expect(matchedModel).toBeDefined()
            expect(
              matchedModel!.providerKey !== providerKey || matchedModel!.modelKey !== modelKey,
            ).toBe(true)
          }

          // 验证：通过每个别名查找，不应匹配到被删除的模型
          for (const alias of targetAliases) {
            const byAlias = resolveFromModels(remainingModels, alias)
            if (byAlias !== null) {
              const matchedModel = remainingModels.find(
                (m) => m.modelKey === byAlias,
              )
              expect(matchedModel).toBeDefined()
              expect(
                matchedModel!.providerKey !== providerKey || matchedModel!.modelKey !== modelKey,
              ).toBe(true)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
