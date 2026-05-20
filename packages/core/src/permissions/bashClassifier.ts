/**
 * Bash Command Classifier - LLM-based command safety classification
 *
 * Replaces the ANT-ONLY stub bashClassifier.ts with a real implementation.
 * Uses a lightweight LLM query (sideQuery pattern) to classify bash commands
 * into safety categories for auto mode permissions.
 *
 * Classification categories:
 * - **allow**: Safe read-only or low-risk commands (ls, cat, git status, etc.)
 * - **ask**: Commands that modify state or have side effects (npm install, rm, etc.)
 * - **deny**: Dangerous commands that should never run automatically
 *
 * The classifier uses a small, fast model for latency-sensitive decisions.
 * Results are cached to avoid redundant API calls for repeated commands.
 */

import type { ToolContext } from '@cclocal/shared'

export type ClassifierBehavior = 'allow' | 'ask' | 'deny'

export interface ClassifierResult {
  behavior: ClassifierBehavior
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

// ---- Safe Command Heuristics (zero-cost, no API call) ----

/** Commands that are always safe to auto-approve */
const SAFE_COMMAND_PREFIXES = [
  'ls', 'dir', 'cat', 'head', 'tail', 'less', 'more',
  'pwd', 'echo', 'which', 'where', 'whereis',
  'git status', 'git log', 'git diff', 'git branch', 'git remote', 'git tag', 'git stash list',
  'git show', 'git rev-parse',
  'grep', 'rg', 'ag', 'ack',
  'find', 'fd', 'locate',
  'wc', 'sort', 'uniq', 'cut', 'tr', 'tee',
  'file', 'stat', 'md5sum', 'sha256sum',
  'curl --head', 'curl -I', 'curl -s', 'wget --spider',
  'node --version', 'npm --version', 'python --version', 'python3 --version',
  'bun --version', 'rustc --version', 'cargo --version', 'go version',
  'docker ps', 'docker images', 'docker version',
  'ps aux', 'ps -ef', 'top -b -n 1', 'htop',
  'df -h', 'du -sh', 'free -h',
  'uname', 'hostname', 'uptime',
  'date', 'cal', 'whoami', 'id',
  'env | grep', 'printenv',
  'test ', '[ ', '[[ ',
  'true', 'false',
  'echo $?',
  'type ', 'command -v', 'hash -r',
]

/** Commands that always require user approval */
const ASK_COMMAND_PREFIXES = [
  'rm', 'rmdir', 'mv', 'cp', 'install -m',
  'npm install', 'npm i ', 'npm add', 'npm ci',
  'yarn add', 'yarn install',
  'pnpm add', 'pnpm install',
  'pip install', 'pip3 install',
  'bun add', 'bun install',
  'cargo install',
  'go install',
  'apt install', 'apt-get install', 'yum install', 'dnf install', 'brew install',
  'git push', 'git merge', 'git rebase', 'git reset', 'git checkout',
  'git cherry-pick', 'git commit', 'git add', 'git stash pop', 'git stash drop',
  'git clean', 'git rm', 'git mv',
  'docker run', 'docker exec', 'docker rm', 'docker rmi', 'docker build',
  'docker compose up', 'docker-compose up',
  'systemctl start', 'systemctl stop', 'systemctl restart', 'systemctl enable',
  'service ',
  'chmod', 'chown', 'chgrp',
  'mkdir', 'touch', 'ln -s', 'ln ',
  'kill', 'killall', 'pkill',
  'curl -X POST', 'curl -X PUT', 'curl -X DELETE', 'curl -X PATCH',
  'wget ',
  'tar -x', 'tar -c', 'unzip', 'gzip', 'gunzip', 'bzip2', 'bunzip2',
  'make install', 'cmake --install',
  'ssh', 'scp', 'rsync',
  'sudo ', 'su ',
]

/** Commands that should always be denied in auto mode */
const DENY_COMMAND_PATTERNS = [
  /\brm\s+(-[a-z]*f[a-z]*\s+)?(-[a-z]*r[a-z]*\s+)?\//,  // Recursive force delete of root
  /\brm\s+-[a-z]*rf\s+~/,                                 // Recursive force delete of home
  /\bdd\s/,                                               // Disk overwrite
  /\bmkfs/,                                               // Filesystem format
  /\bformat\s+[A-Z]:/i,                                   // Windows format
  /:\(\)\{[^}]*:[|&][^}]*\}/,                             // Fork bomb
  /\bmodprobe\b/,                                          // Kernel module loading
  /\binsmod\b/,                                           // Kernel module insertion
  /\biptables\b/,                                         // Firewall manipulation
  /\buseradd\b/,                                          // User creation
  /\buserdel\b/,                                          // User deletion
  /\bpasswd\b/,                                           // Password change
  /(?:curl|wget).*\|\s*(?:bash|sh|zsh|dash)/,            // Piped remote script execution
]

// ---- LLM Classifier Prompt ----

const CLASSIFIER_SYSTEM_PROMPT = `You are a bash command safety classifier. Given a shell command, classify it as one of:
- "allow": Safe, read-only, or low-risk commands (viewing files, checking status, listing)
- "ask": Commands that modify files, install packages, or have side effects
- "deny": Dangerous, destructive, or irreversible commands

Respond with ONLY a JSON object: {"behavior": "allow"|"ask"|"deny", "reason": "brief explanation"}
No other text.`

// ---- Cache ----

const classificationCache = new Map<string, ClassifierResult>()
const MAX_CACHE_SIZE = 200

// ---- Main Classifier ----

/**
 * Classify a bash command for auto mode permissions.
 *
 * Uses a three-tier approach:
 * 1. **Heuristic check** (zero cost) — match against known safe/ask/deny lists
 * 2. **LLM classification** (API cost) — for ambiguous commands
 * 3. **Default to "ask"** — if classifier fails or times out
 */
export async function classifyBashCommand(
  command: string,
  _cwd: string,
  context: ToolContext,
): Promise<ClassifierResult> {
  // 1. Check deny patterns first (always block dangerous commands)
  for (const pattern of DENY_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      return { behavior: 'deny', confidence: 'high', reason: 'Matches dangerous command pattern' }
    }
  }

  // 2. Check cache
  const cached = classificationCache.get(command)
  if (cached) return cached

  // 3. Check safe commands (heuristic)
  const commandStart = command.trim().toLowerCase()
  for (const prefix of SAFE_COMMAND_PREFIXES) {
    if (commandStart.startsWith(prefix.toLowerCase()) || commandStart === prefix.toLowerCase()) {
      const result: ClassifierResult = {
        behavior: 'allow',
        confidence: 'high',
        reason: `Safe command: ${prefix}`,
      }
      cacheResult(command, result)
      return result
    }
  }

  // 4. Check ask commands (heuristic)
  for (const prefix of ASK_COMMAND_PREFIXES) {
    if (commandStart.startsWith(prefix.toLowerCase())) {
      const result: ClassifierResult = {
        behavior: 'ask',
        confidence: 'high',
        reason: `Requires approval: ${prefix}`,
      }
      cacheResult(command, result)
      return result
    }
  }

  // 5. LLM classification for ambiguous commands
  try {
    const result = await llmClassify(command, context)
    cacheResult(command, result)
    return result
  } catch {
    // LLM classifier failed — default to ask
    const result: ClassifierResult = {
      behavior: 'ask',
      confidence: 'low',
      reason: 'Unable to classify — defaulting to ask',
    }
    cacheResult(command, result)
    return result
  }
}

/** Check if classifier permissions are enabled */
export function isClassifierPermissionsEnabled(): boolean {
  return true // Always enabled in cc-local
}

/** Extract prompt description from classifier rule content */
export function extractPromptDescription(ruleContent: string | undefined): string | null {
  if (!ruleContent) return null
  const prefix = 'prompt: '
  if (ruleContent.startsWith(prefix)) return ruleContent.slice(prefix.length)
  return null
}

/** Create prompt rule content */
export function createPromptRuleContent(description: string): string {
  return `prompt: ${description.trim()}`
}

// ---- LLM Classification ----

async function llmClassify(command: string, context: ToolContext): Promise<ClassifierResult> {
  // Build a side-query to the API
  const messages = [
    {
      role: 'user' as const,
      content: `Classify this bash command:\n\`\`\`bash\n${command}\n\`\`\``,
    },
  ]

  // Try to use the engine's client for the side query
  const { Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({
    apiKey: context.apiKey,
    ...(context.baseUrl ? { baseURL: context.baseUrl } : {}),
    ...(context.headers ? { defaultHeaders: context.headers } : {}),
    ...(context.fetch ? { fetch: context.fetch } : {}),
  })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // Use fast model for classification
    max_tokens: 256,
    system: CLASSIFIER_SYSTEM_PROMPT,
    messages,
    signal: context.abortSignal,
  })

  // Parse the response
  const text = response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('')

  try {
    const parsed = JSON.parse(text.trim())
    if (['allow', 'ask', 'deny'].includes(parsed.behavior)) {
      return {
        behavior: parsed.behavior,
        confidence: 'medium',
        reason: parsed.reason || 'LLM classified',
      }
    }
  } catch {
    // Parse failed
  }

  return { behavior: 'ask', confidence: 'low', reason: 'LLM classification parse error' }
}

// ---- Cache Helpers ----

function cacheResult(command: string, result: ClassifierResult): void {
  if (classificationCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entries
    const keys = Array.from(classificationCache.keys())
    for (let i = 0; i < 50; i++) {
      classificationCache.delete(keys[i])
    }
  }
  classificationCache.set(command, result)
}

/** Clear the classification cache */
export function clearClassificationCache(): void {
  classificationCache.clear()
}
