/**
 * Stub for internal-only ant handler module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export async function handle(): Promise<void> {}
export async function logHandler(_logId?: string | number): Promise<void> {}
export async function errorHandler(_number?: number): Promise<void> {}
export async function exportHandler(_source: string, _outputFile: string): Promise<void> {}
export async function taskCreateHandler(_subject: string, _opts: { description?: string; list?: string }): Promise<void> {}
export async function taskListHandler(_opts: { list?: string; pending?: boolean; json?: boolean }): Promise<void> {}
export async function taskGetHandler(_id: string, _opts: { list?: string }): Promise<void> {}
export async function taskUpdateHandler(_id: string, _opts: { list?: string; status?: string; subject?: string; description?: string; owner?: string; clearOwner?: boolean }): Promise<void> {}
export async function taskDirHandler(_opts: { list?: string }): Promise<void> {}
export async function completionHandler(_shell: string, _opts: { output?: string }, _program: unknown): Promise<void> {}
export function getOverlyBroadBashPermissions(): string[] { return [] }
export function getTasksOptions(): { tasks?: boolean | string } { return {} }
