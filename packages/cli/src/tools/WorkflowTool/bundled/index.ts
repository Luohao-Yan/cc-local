import { logForDebugging } from '../../../utils/debug.js'

/**
 * Initialize bundled workflow templates.
 *
 * This is a no-op for now — built-in workflow templates will be registered
 * here in a future iteration. The function is called eagerly during tool
 * registration (tools.ts:131) so that the import is always valid.
 */
export function initBundledWorkflows(): void {
  logForDebugging('initBundledWorkflows: no bundled workflows registered yet')
}
