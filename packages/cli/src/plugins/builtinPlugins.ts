const builtinPluginsPath = '../../../../src/plugins/builtinPlugins.js'

let builtinPluginsPromise: Promise<any> | null = null

function loadBuiltinPlugins(): Promise<any> {
  if (builtinPluginsPromise) {
    return builtinPluginsPromise
  }

  builtinPluginsPromise = import(builtinPluginsPath).catch(() => {
    // When running from a bundled distribution (dist/legacy-cli.js) outside
    // the repository layout, the relative path to src/plugins won't resolve.
    // Provide no-op fallbacks so the CLI can still boot.
    return {
      getBuiltinPluginSkillCommands: () => [],
      registerBuiltinPlugin: () => {},
      isBuiltinPluginId: () => false,
      getBuiltinPluginDefinition: () => undefined,
      getBuiltinPlugins: () => ({ enabled: [], disabled: [] }),
      clearBuiltinPlugins: () => {},
      BUILTIN_MARKETPLACE_NAME: 'builtin',
    }
  })

  return builtinPluginsPromise
}

export async function getBuiltinPluginSkillCommands(...args: any[]) {
  const mod = await loadBuiltinPlugins()
  return mod.getBuiltinPluginSkillCommands(...args)
}

export async function registerBuiltinPlugin(...args: any[]) {
  const mod = await loadBuiltinPlugins()
  return mod.registerBuiltinPlugin(...args)
}

export async function isBuiltinPluginId(...args: any[]) {
  const mod = await loadBuiltinPlugins()
  return mod.isBuiltinPluginId(...args)
}

export async function getBuiltinPluginDefinition(...args: any[]) {
  const mod = await loadBuiltinPlugins()
  return mod.getBuiltinPluginDefinition(...args)
}

export async function getBuiltinPlugins(...args: any[]) {
  const mod = await loadBuiltinPlugins()
  return mod.getBuiltinPlugins(...args)
}

export async function clearBuiltinPlugins(...args: any[]) {
  const mod = await loadBuiltinPlugins()
  return mod.clearBuiltinPlugins(...args)
}

export async function BUILTIN_MARKETPLACE_NAME(...args: any[]) {
  const mod = await loadBuiltinPlugins()
  return mod.BUILTIN_MARKETPLACE_NAME(...args)
}
