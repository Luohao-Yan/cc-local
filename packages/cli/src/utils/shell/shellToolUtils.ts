import { BASH_TOOL_NAME } from '../../tools/BashTool/toolName.js'
import { POWERSHELL_TOOL_NAME } from '../../tools/PowerShellTool/toolName.js'
import { isEnvDefinedFalsy, isEnvTruthy } from '../envUtils.js'
import { getPlatform } from '../platform.js'
import { isUsing3PServices } from '../auth.js'

export const SHELL_TOOL_NAMES: string[] = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME]

/**
 * Runtime gate for PowerShellTool. Windows-only (the permission engine uses
 * Win32-specific path normalizations). Ant/3P defaults on (opt-out via env=0);
 * external defaults off (opt-in via env=1).
 *
 * v2.1.143: Bedrock/Vertex/Foundry users now default to enabled (matching ant),
 * with CLAUDE_CODE_USE_POWERSHELL_TOOL=0 as opt-out.
 *
 * Used by tools.ts (tool-list visibility), processBashCommand (! routing),
 * and promptShellExecution (skill frontmatter routing) so the gate is
 * consistent across all paths that invoke PowerShellTool.call().
 */
export function isPowerShellToolEnabled(): boolean {
  if (getPlatform() !== 'windows') return false
  // Ant and 3P API users default to enabled; opt-out via =0
  if (process.env.USER_TYPE === 'ant' || isUsing3PServices()) {
    return !isEnvDefinedFalsy(process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL)
  }
  // External (Anthropic API) users: opt-in via =1
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL)
}
