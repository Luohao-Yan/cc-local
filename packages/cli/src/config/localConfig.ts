import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { homedir } from 'os'

interface LocalCliConfig {
  apiToken?: string
  remoteControl?: {
    enabled?: boolean
    name?: string
  }
}

function getConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
}

export function getLocalConfigPath(): string {
  return join(getConfigDir(), 'cclocal.json')
}

export function readLocalConfig(): LocalCliConfig {
  const filePath = getLocalConfigPath()
  if (!existsSync(filePath)) {
    return {}
  }

  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as LocalCliConfig
    return {
      apiToken: parsed.apiToken,
      remoteControl: parsed.remoteControl,
    }
  } catch {
    return {}
  }
}

export function writeLocalConfig(config: LocalCliConfig): void {
  const filePath = getLocalConfigPath()
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(config, null, 2))
}

export function clearStoredApiToken(): boolean {
  const filePath = getLocalConfigPath()
  if (!existsSync(filePath)) {
    return false
  }

  const config = readLocalConfig()
  if (!config.apiToken) {
    return false
  }

  const nextConfig = { ...config }
  delete nextConfig.apiToken

  if (Object.keys(nextConfig).length === 0) {
    rmSync(filePath, { force: true })
    return true
  }

  writeLocalConfig(nextConfig)
  return true
}
