/**
 * .env → models.json 迁移脚本
 *
 * 由 install-global.sh / install-global.cmd 调用。
 * 读取项目目录下的 .env 文件，将 ANTHROPIC_* 和 MODEL_* 配置
 * 转换为 ~/.claude/models.json 格式。
 *
 * 用法: bun scripts/migrate-env-to-json.js <项目目录>
 *
 * 退出码:
 *   0 - 迁移成功或无需迁移
 *   1 - 错误
 *
 * stdout: 生成的 JSON 内容（仅迁移成功时）
 * stderr: 状态信息（MIGRATED=1/0, MULTI_COUNT=N）
 */

const fs = require('fs')
const path = require('path')

const projectDir = process.argv[2]
if (!projectDir) {
  process.stderr.write('MIGRATED=0\n')
  process.exit(0)
}

const envPath = path.join(projectDir, '.env')
if (!fs.existsSync(envPath)) {
  process.stderr.write('MIGRATED=0\n')
  process.exit(0)
}

// 解析 .env 文件：跳过注释和空行，处理 \r
const content = fs.readFileSync(envPath, 'utf-8')
const vars = {}
for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx < 0) continue
  const key = trimmed.slice(0, idx).trim()
  const val = trimmed.slice(idx + 1).trim().replace(/\r$/, '')
  vars[key] = val
}

const apiKey = vars.ANTHROPIC_API_KEY
const baseUrl = vars.ANTHROPIC_BASE_URL
const model = vars.ANTHROPIC_MODEL
const smallModel = vars.ANTHROPIC_SMALL_FAST_MODEL
const disableChecks = vars.DISABLE_INSTALLATION_CHECKS

// 无有效 API Key 时跳过
if (!apiKey || apiKey === 'your-api-key-here') {
  process.stderr.write('MIGRATED=0\n')
  process.exit(0)
}

// 根据 baseUrl 推断 Provider 名称
let providerName = 'default'
if (baseUrl) {
  if (baseUrl.includes('volces.com')) providerName = 'doubao'
  else if (baseUrl.includes('openai.com')) providerName = 'openai'
  else if (baseUrl.includes('deepseek.com')) providerName = 'deepseek'
  else if (baseUrl.includes('bigmodel.cn')) providerName = 'glm'
  else if (baseUrl.includes('minimax.chat')) providerName = 'minimax'
  else {
    // 尝试从域名提取
    try {
      const hostname = new URL(baseUrl).hostname
      const parts = hostname.split('.')
      const main = parts.find(p => !['api', 'www', 'v1', 'v2'].includes(p))
      if (main && main.length > 2) providerName = main
    } catch {}
  }
}

// 构建配置对象
const config = { providers: {} }
if (model) config.defaultModel = model
if (smallModel) config.smallFastModel = smallModel
if (disableChecks === '1' || disableChecks === 'true') {
  config.settings = { disableInstallationChecks: true }
}

// 基础 Provider
const baseProvider = {
  name: providerName,
  baseUrl: baseUrl || '',
  apiKey: apiKey,
  models: {},
}
if (model) {
  baseProvider.models[model] = { name: model }
}
config.providers[providerName] = baseProvider

// 扫描 MODEL_*_NAME 多模型配置
const aliasPattern = /^MODEL_([A-Z0-9_]+)_NAME$/
let multiCount = 0

for (const [key, val] of Object.entries(vars)) {
  const m = key.match(aliasPattern)
  if (!m) continue

  const aliasUpper = m[1]
  const aliasLower = aliasUpper.toLowerCase()
  const mName = val
  const mUrl = vars[`MODEL_${aliasUpper}_BASE_URL`] || ''
  const mKey = vars[`MODEL_${aliasUpper}_API_KEY`] || ''

  if (!mName || !mUrl) continue

  // 与基础 Provider 相同 baseUrl+apiKey → 追加模型到基础 Provider
  if (mUrl === baseUrl && mKey === apiKey) {
    baseProvider.models[mName] = { name: mName, alias: [aliasLower] }
  } else {
    // 创建独立 Provider
    const p = { name: aliasLower, baseUrl: mUrl, models: {} }
    if (mKey) p.apiKey = mKey
    p.models[mName] = { name: mName, alias: [aliasLower] }
    config.providers[aliasLower] = p
  }
  multiCount++
}

// 输出 JSON 到 stdout
console.log(JSON.stringify(config, null, 2))

// 输出状态到 stderr
process.stderr.write(`MIGRATED=1\nMULTI_COUNT=${multiCount}\n`)
