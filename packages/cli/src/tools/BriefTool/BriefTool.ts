import { feature } from 'bun:bundle'
import { z } from 'zod/v4'
import { getKairosActive, getUserMsgOptIn } from '../../bootstrap/state.js'
import { getFeatureValue_CACHED_WITH_REFRESH } from '../../services/analytics/growthbook.js'
import { logEvent } from '../../services/analytics/index.js'
import type { ValidationResult } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { plural } from '../../utils/stringUtils.js'
import { resolveAttachments, validateAttachmentPaths } from './attachments.js'
import {
  BRIEF_TOOL_NAME,
  BRIEF_TOOL_PROMPT,
  DESCRIPTION,
  LEGACY_BRIEF_TOOL_NAME,
} from './prompt.js'
import { renderToolResultMessage, renderToolUseMessage } from './UI.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    message: z
      .string()
      .describe('The message for the user. Supports markdown formatting.'),
    attachments: z
      .array(z.string())
      .optional()
      .describe(
        'Optional file paths (absolute or relative to cwd) to attach. Use for photos, screenshots, diffs, logs, or any file the user should see alongside your message.',
      ),
    status: z
      .enum(['normal', 'proactive'])
      .describe(
        "Use 'proactive' when you're surfacing something the user hasn't asked for and needs to see now — task completion while they're away, a blocker you hit, an unsolicited status update. Use 'normal' when replying to something the user just said.",
      ),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

// attachments MUST remain optional — resumed sessions replay pre-attachment
// outputs verbatim and a required field would crash the UI renderer on resume.
const outputSchema = lazySchema(() =>
  z.object({
    message: z.string().describe('The message'),
    attachments: z
      .array(
        z.object({
          path: z.string(),
          size: z.number(),
          isImage: z.boolean(),
          file_uuid: z.string().optional(),
        }),
      )
      .optional()
      .describe('Resolved attachment metadata'),
    sentAt: z
      .string()
      .optional()
      .describe(
        'ISO timestamp captured at tool execution on the emitting process. Optional — resumed sessions replay pre-sentAt outputs verbatim.',
      ),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

const KAIROS_BRIEF_REFRESH_MS = 5 * 60 * 1000

/**
 * Entitlement check — is the user ALLOWED to use Brief?
 *
 * Official CLI exposes --brief unconditionally. In cc-local we mirror
 * that by always granting entitlement when the user opts in
 * (--brief flag, defaultView, etc.) or when KAIROS feature flags
 * are active.
 *
 * CLAUDE_CODE_BRIEF env var force-grants entitlement for dev/testing.
 */
export function isBriefEntitled(): boolean {
  // Build-time KAIROS feature flags — if enabled, use the GB gate
  if (feature('KAIROS') || feature('KAIROS_BRIEF')) {
    return getKairosActive() ||
      isEnvTruthy(process.env.CLAUDE_CODE_BRIEF) ||
      getFeatureValue_CACHED_WITH_REFRESH(
        'tengu_kairos_brief',
        false,
        KAIROS_BRIEF_REFRESH_MS,
      )
  }
  // cc-local: always entitled when user opts in (checked in isBriefEnabled)
  return true
}

/**
 * Unified activation gate for the Brief tool.
 *
 * Activation requires explicit opt-in (userMsgOptIn) set by one of:
 *   - `--brief` CLI flag
 *   - `defaultView: 'chat'` in settings
 *   - `/brief` slash command
 *   - `/config` defaultView picker
 *   - SendUserMessage in `--tools` / SDK `tools` option
 *   - CLAUDE_CODE_BRIEF env var (dev/testing bypass)
 * Assistant mode (kairosActive) bypasses opt-in.
 *
 * When KAIROS feature flags are active, the GB gate is re-checked
 * as a kill-switch. When they are not active (cc-local default),
 * entitlement is always granted so opt-in alone controls activation.
 */
export function isBriefEnabled(): boolean {
  if (feature('KAIROS') || feature('KAIROS_BRIEF')) {
    return (getKairosActive() || getUserMsgOptIn()) && isBriefEntitled()
  }
  // cc-local: entitlement always granted, opt-in controls activation
  return getKairosActive() || getUserMsgOptIn()
}

export const BriefTool = buildTool({
  name: BRIEF_TOOL_NAME,
  aliases: [LEGACY_BRIEF_TOOL_NAME],
  searchHint:
    'send a message to the user — your primary visible output channel',
  maxResultSizeChars: 100_000,
  userFacingName() {
    return ''
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isEnabled() {
    return isBriefEnabled()
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return input.message
  },
  async validateInput({ attachments }, _context): Promise<ValidationResult> {
    if (!attachments || attachments.length === 0) {
      return { result: true }
    }
    return validateAttachmentPaths(attachments)
  },
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return BRIEF_TOOL_PROMPT
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const n = output.attachments?.length ?? 0
    const suffix = n === 0 ? '' : ` (${n} ${plural(n, 'attachment')} included)`
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Message delivered to user.${suffix}`,
    }
  },
  renderToolUseMessage,
  renderToolResultMessage,
  async call({ message, attachments, status }, context) {
    const sentAt = new Date().toISOString()
    logEvent('tengu_brief_send', {
      proactive: status === 'proactive',
      attachment_count: attachments?.length ?? 0,
    })
    if (!attachments || attachments.length === 0) {
      return { data: { message, sentAt } }
    }
    const appState = context.getAppState()
    const resolved = await resolveAttachments(attachments, {
      replBridgeEnabled: appState.replBridgeEnabled,
      signal: context.abortController.signal,
    })
    return {
      data: { message, attachments: resolved, sentAt },
    }
  },
} satisfies ToolDef<InputSchema, Output>)
