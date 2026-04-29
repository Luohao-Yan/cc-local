import type { CCLocalClient } from '../client/CCLocalClient.js'
import {
  loadLegacyAppShellRuntime,
  type LegacyAppShellRuntime,
} from '../legacy-ui/appShellAdapter.js'
import { launchRepl as launchSimpleRepl } from '../repl/simpleRepl.js'

export type InteractiveReplOptions = Parameters<typeof launchSimpleRepl>[1]
export type InteractiveReplRendererMode = 'packages-simple' | 'legacy-source-shell'

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
  await defaultInteractiveReplRenderer.render(client, options)
}

export async function loadLegacyInteractiveReplRuntime(): Promise<LegacyAppShellRuntime> {
  return await defaultLegacyInteractiveReplRendererBridge.loadRuntime()
}
