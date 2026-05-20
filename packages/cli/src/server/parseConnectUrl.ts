/**
 * Stub for internal-only connect URL parser module.
 * This module is only imported in server-related code paths.
 */
export interface ParsedConnectUrl {
  serverUrl?: string
  authToken?: string
  [key: string]: unknown
}

export function parseConnectUrl(url: string): ParsedConnectUrl { return { url } }
