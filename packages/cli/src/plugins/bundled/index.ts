/**
 * Built-in Plugin Initialization
 *
 * Initializes built-in plugins that ship with the CLI and appear in the
 * /plugin UI for users to enable/disable.
 *
 * Not all bundled features should be built-in plugins — use this for
 * features that users should be able to explicitly enable/disable. For
 * features with complex setup or automatic-enabling logic (e.g.
 * claude-in-chrome), use packages/cli/src/skills/bundled/ instead.
 */

// In-memory storage for builtin plugins
let builtinPlugins: { enabled: string[]; disabled: string[] } = { enabled: [], disabled: [] }

/**
 * Initialize built-in plugins. Called during CLI startup.
 */
export function initBuiltinPlugins(): void {
  // No built-in plugins registered yet — this is the scaffolding for
  // migrating bundled skills that should be user-toggleable.
}

export function getBuiltinPluginSkillCommands(): any[] {
  return []
}

export function registerBuiltinPlugin(): void {
  // No-op for now
}

export function isBuiltinPluginId(id: string): boolean {
  return false
}

export function getBuiltinPluginDefinition(): undefined {
  return undefined
}

export function getBuiltinPlugins(): { enabled: string[]; disabled: string[] } {
  return builtinPlugins
}

export function clearBuiltinPlugins(): void {
  builtinPlugins = { enabled: [], disabled: [] }
}

export const BUILTIN_MARKETPLACE_NAME = 'builtin'
