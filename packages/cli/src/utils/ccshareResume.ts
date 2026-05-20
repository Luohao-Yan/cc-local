/**
 * Stub for internal-only ccshare resume module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
import type { LogOption } from '../types/logs.js'

export function parseCcshareId(_id: string): unknown { return null }
export async function loadCcshare(_id: unknown): Promise<LogOption | undefined> { return undefined }
