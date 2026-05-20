/**
 * Stub for internal-only CLI rollback command.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export async function rollback(_target?: string, _options?: { list?: boolean; dryRun?: boolean; safe?: boolean }): Promise<void> {}
