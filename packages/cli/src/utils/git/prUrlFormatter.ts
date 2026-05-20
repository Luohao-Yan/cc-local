/**
 * Format a PR URL using the optional prUrlTemplate setting.
 * If no template is configured, returns the original URL unchanged.
 *
 * Template placeholders:
 *   {owner}   - repository owner/org
 *   {repo}    - repository name
 *   {number}  - PR number
 *
 * Example template: "https://gitlab.internal/{owner}/{repo}/-/merge_requests/{number}"
 */

export function formatPrUrl(
  originalUrl: string,
  prNumber: number,
  template?: string,
): string {
  if (!template) return originalUrl

  // Extract owner/repo from original GitHub URL pattern
  const match = originalUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match) return originalUrl

  const [, owner, repo, numberStr] = match
  return template
    .replace(/\{owner\}/g, owner!)
    .replace(/\{repo\}/g, repo!)
    .replace(/\{number\}/g, numberStr ?? String(prNumber))
}
