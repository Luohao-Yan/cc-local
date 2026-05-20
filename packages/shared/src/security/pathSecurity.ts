/**
 * Path Security Utilities
 *
 * Shared between @cclocal/core and @cclocal/cli.
 * Pure functions with only stdlib (os, path) dependencies.
 */

import { dirname } from 'path'
import { homedir } from 'os'

/**
 * Checks if a path contains directory traversal patterns (..).
 * Catches both POSIX and Windows variants: `../`, `..\\`, or ending with `..`.
 */
export function containsPathTraversal(path: string): boolean {
  return /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)
}

/**
 * Expands tilde (~) at the start of a path to the user's home directory.
 * ~username expansion is NOT supported for security reasons.
 */
export function expandTilde(path: string): string {
  if (
    path === '~' ||
    path.startsWith('~/') ||
    (process.platform === 'win32' && path.startsWith('~\\'))
  ) {
    return homedir() + path.slice(1)
  }
  return path
}

/**
 * Rejects paths containing shell expansion syntax ($, %, or = prefix).
 * These are preserved as literal strings during validation but expanded
 * by the shell during execution, creating a TOCTOU vulnerability.
 */
export function containsShellExpansion(path: string): boolean {
  return path.includes('$') || path.includes('%') || path.startsWith('=')
}

const WINDOWS_DRIVE_ROOT_REGEX = /^[A-Za-z]:\/?$/
const WINDOWS_DRIVE_CHILD_REGEX = /^[A-Za-z]:\/[^/]+$/

/**
 * Checks if a resolved path is dangerous for removal operations (rm/rmdir).
 * Dangerous: wildcard, root, home, root children, Windows drive root/children.
 */
export function isDangerousRemovalPath(resolvedPath: string): boolean {
  const forwardSlashed = resolvedPath.replace(/[\\/]+/g, '/')
  if (forwardSlashed === '*' || forwardSlashed.endsWith('/*')) return true
  const normalizedPath = forwardSlashed === '/' ? forwardSlashed : forwardSlashed.replace(/\/$/, '')
  if (normalizedPath === '/') return true
  if (WINDOWS_DRIVE_ROOT_REGEX.test(normalizedPath)) return true
  const normalizedHome = homedir().replace(/[\\/]+/g, '/')
  if (normalizedPath === normalizedHome) return true
  const parentDir = dirname(normalizedPath)
  if (parentDir === '/') return true
  if (WINDOWS_DRIVE_CHILD_REGEX.test(normalizedPath)) return true
  return false
}
