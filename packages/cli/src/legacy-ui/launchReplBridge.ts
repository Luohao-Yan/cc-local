import {
  loadLegacyAppShellRuntime,
  type LegacyAppShellRuntime,
} from './appShellAdapter.js'
import type { LegacyLaunchContext } from './launchContextBuilder.js'

export type LegacyRenderAndRun<TRoot = unknown> = (
  root: TRoot,
  element: unknown,
) => Promise<void>

export interface LegacyLaunchReplBridgeOptions<
  TRoot = unknown,
  TContext extends LegacyLaunchContext<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any> = LegacyLaunchContext,
> {
  root: TRoot
  context: TContext
  renderAndRun: LegacyRenderAndRun<TRoot>
  loadRuntime?: () => Promise<LegacyAppShellRuntime>
}

export async function launchLegacyReplFromContext<
  TRoot = unknown,
  TContext extends LegacyLaunchContext<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any> = LegacyLaunchContext,
>({
  root,
  context,
  renderAndRun,
  loadRuntime = loadLegacyAppShellRuntime,
}: LegacyLaunchReplBridgeOptions<TRoot, TContext>): Promise<void> {
  const runtime = await loadRuntime()

  if (typeof runtime.launchRepl !== 'function') {
    throw new TypeError('Legacy UI runtime did not expose a launchRepl function.')
  }

  await runtime.launchRepl(root, context.appProps, context.replProps, renderAndRun)
}
