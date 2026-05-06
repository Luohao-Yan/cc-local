import { BROWSER_TOOLS } from '@ant/claude-for-chrome-mcp'
import { BASE_CHROME_PROMPT } from '../../utils/claudeInChrome/prompt.js'
import { shouldAutoEnableClaudeInChrome } from '../../utils/claudeInChrome/setup.js'
import { registerBundledSkill } from '../bundledSkills.js'
import { t } from '../../utils/i18n/index.js'

const CLAUDE_IN_CHROME_MCP_TOOLS = BROWSER_TOOLS.map(
  tool => `mcp__claude-in-chrome__${tool.name}`,
)

const SKILL_ACTIVATION_MESSAGE = `
Now that this skill is invoked, you have access to Chrome browser automation tools. You can now use the mcp__claude-in-chrome__* tools to interact with web pages.

IMPORTANT: Start by calling mcp__claude-in-chrome__tabs_context_mcp to get information about the user's current browser tabs.
`

export function registerClaudeInChromeSkill(): void {
  registerBundledSkill({
    name: 'claude-in-chrome',
    description: () => t('command.description.claude-in-chrome'),
    whenToUse: () => t('command.whenToUse.claude-in-chrome'),
    allowedTools: CLAUDE_IN_CHROME_MCP_TOOLS,
    userInvocable: true,
    isEnabled: () => shouldAutoEnableClaudeInChrome(),
    async getPromptForCommand(args) {
      let prompt = `${BASE_CHROME_PROMPT}\n${SKILL_ACTIVATION_MESSAGE}`
      if (args) {
        prompt += `\n## Task\n\n${args}`
      }
      return [{ type: 'text', text: prompt }]
    },
  })
}
