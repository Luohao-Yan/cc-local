/**
 * Stub for internal-only server banner module.
 * This module is only imported when IS_INTERNAL_BUILD is true (it never is in external builds).
 */
export function printBanner(_config: unknown, _authToken: string, _port: number): void {}
