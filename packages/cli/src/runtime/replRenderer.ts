import type { CCLocalClient } from '../client/CCLocalClient.js'
import {
  loadLegacyAppShellRuntime,
  type LegacyAppShellRuntime,
} from '../legacy-ui/appShellAdapter.js'
import { launchRepl as launchSimpleRepl } from '../repl/simpleRepl.js'
import { launchNativeRepl } from '../repl/nativeRepl.js'

export type InteractiveReplOptions = Parameters<typeof launchSimpleRepl>[1] & {
  legacyBridgeMode?: boolean
  nativeMode?: boolean
}
export type InteractiveReplRendererMode = 'packages-simple' | 'packages-native' | 'legacy-source-shell'

export interface InteractiveReplRenderer {
  mode: InteractiveReplRendererMode
  render: (client: CCLocalClient, options?: InteractiveReplOptions) => Promise<void>
}

export interface LegacyInteractiveReplRendererBridge {
  mode: 'legacy-source-shell'
  loadRuntime: () => Promise<LegacyAppShellRuntime>
}

export function createInteractiveReplRenderer(
  renderImpl: (client: CCLocalClient, options?: InteractiveReplOptions) => Promise<void> = launchSimpleRepl,
  mode: InteractiveReplRendererMode = 'packages-simple'
): InteractiveReplRenderer {
  return {
    mode,
    async render(client, options = {}) {
      await renderImpl(client, options)
    },
  }
}

export function createLegacyInteractiveReplRendererBridge(
  loader: () => Promise<LegacyAppShellRuntime> = loadLegacyAppShellRuntime
): LegacyInteractiveReplRendererBridge {
  return {
    mode: 'legacy-source-shell',
    async loadRuntime() {
      return await loader()
    },
  }
}

const defaultInteractiveReplRenderer = createInteractiveReplRenderer()
const defaultLegacyInteractiveReplRendererBridge = createLegacyInteractiveReplRendererBridge()

export async function renderInteractiveRepl(
  client: CCLocalClient,
  options: InteractiveReplOptions = {}
): Promise<void> {
  if (options.legacyBridgeMode) {
    const { renderLegacyBridgeRepl } = await import('./legacyBridgeRenderer.js')
    return await renderLegacyBridgeRepl(options)
  }

  if (options.nativeMode) {
    const nativeOptions = {
      model: options.model ?? process.env.CCLOCAL_MODEL ?? 'claude-sonnet-4-6',
      cwd: options.cwd,
      prefill: options.prefill,
      systemPrompt: options.messageOptions?.systemPrompt,
      permissionMode: options.messageOptions?.permissionPolicy?.mode,
      sessionId: options.createSessionOnStart?.id,
      sessionName: options.createSessionOnStart?.name,
    }
    return await launchNativeRepl(nativeOptions)
  }

  await defaultInteractiveReplRenderer.render(client, options)
}

export async function loadLegacyInteractiveReplRuntime(): Promise<LegacyAppShellRuntime> {
  return await defaultLegacyInteractiveReplRendererBridge.loadRuntime()
}