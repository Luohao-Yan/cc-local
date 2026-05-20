/**
 * Webhook Content Sanitizer for GitHub Webhooks
 *
 * This module is gated by the KAIROS_GITHUB_WEBHOOKS feature flag.
 * It sanitizes inbound webhook content from GitHub to prevent
 * potential security issues and normalize the content format.
 */

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Sanitize inbound webhook content from GitHub.
 *
 * This function processes webhook payloads to:
 * - Remove potentially dangerous content
 * - Normalize the format for processing
 * - Extract relevant information for the REPL
 *
 * @param content - The raw webhook content (string or content blocks)
 * @returns Sanitized content ready for processing
 */
export function sanitizeInboundWebhookContent(
  content: string | unknown[],
): string | unknown[] {
  if (typeof content === 'string') {
    // Remove null bytes and control characters
    return content.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '')
  }

  if (Array.isArray(content)) {
    // Sanitize string elements in arrays; pass objects through
    return content.map(item =>
      typeof item === 'string' ? item.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '') : item,
    )
  }

  return content
}

/**
 * Validate a GitHub webhook signature using HMAC-SHA256.
 *
 * @param payload - The raw payload string (exact bytes received, before JSON parse)
 * @param signature - The X-Hub-Signature-256 header value, expected format: "sha256=<hex>"
 * @param secret - The webhook secret configured in GitHub
 * @returns True if the signature is valid
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false
  }

  const expectedPrefix = 'sha256='
  if (!signature.startsWith(expectedPrefix)) {
    return false
  }

  const receivedHex = signature.slice(expectedPrefix.length)
  if (!receivedHex) {
    return false
  }

  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const computedHex = hmac.digest('hex')

  // Length mismatch means they can't be equal — reject early
  if (receivedHex.length !== computedHex.length) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(receivedHex, 'hex'),
    Buffer.from(computedHex, 'hex'),
  )
}
