/**
 * Tests for Rate Limiter
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from './rateLimiter.js'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({
      requestsPerMinute: 10,
      requestsPerSecond: 3,
      cleanupInterval: 10000,
    })
  })

  afterEach(() => {
    limiter.close()
  })

  describe('basic rate limiting', () => {
    it('allows requests under the limit', () => {
      const result = limiter.check('client1')
      expect(result.allowed).toBe(true)
    })

    it('tracks multiple clients separately', () => {
      const result1 = limiter.check('client1')
      const result2 = limiter.check('client2')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    it('blocks requests over the per-second limit', () => {
      // Use up all per-second tokens
      limiter.check('client1')
      limiter.check('client1')
      limiter.check('client1')

      // Fourth request should be blocked
      const result = limiter.check('client1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('rate_limited_per_second')
    })

    it('provides retryAfter hint', () => {
      // Use up tokens
      limiter.check('client1')
      limiter.check('client1')
      limiter.check('client1')

      const result = limiter.check('client1')
      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('token refill', () => {
    it('refills tokens over time', async () => {
      // Use up tokens
      limiter.check('client1')
      limiter.check('client1')
      limiter.check('client1')

      // Should be blocked
      expect(limiter.check('client1').allowed).toBe(false)

      // Wait for some tokens to refill
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Should be allowed again
      const result = limiter.check('client1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('client state', () => {
    it('returns client state', () => {
      limiter.check('client1')

      const state = limiter.getClientState('client1')
      expect(state).toBeDefined()
      expect(state?.secondTokensRemaining).toBe(2)
      expect(state?.minuteTokensRemaining).toBe(9)
    })

    it('returns undefined for unknown client', () => {
      const state = limiter.getClientState('unknown')
      expect(state).toBeUndefined()
    })
  })

  describe('statistics', () => {
    it('returns stats', () => {
      limiter.check('client1')
      limiter.check('client2')

      const stats = limiter.getStats()
      expect(stats.totalClients).toBe(2)
      expect(stats.requestsPerMinute).toBe(10)
      expect(stats.requestsPerSecond).toBe(3)
    })
  })

  describe('cleanup', () => {
    it('closes cleanly', () => {
      limiter.check('client1')
      limiter.close()

      // Should not throw
      expect(true).toBe(true)
    })

    it('resets client limits', () => {
      limiter.check('client1')
      limiter.reset('client1')

      const state = limiter.getClientState('client1')
      expect(state).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('handles empty client ID', () => {
      const result = limiter.check('')
      expect(result.allowed).toBe(true)
    })

    it('handles very long client ID', () => {
      const longId = 'a'.repeat(1000)
      const result = limiter.check(longId)
      expect(result.allowed).toBe(true)
    })

    it('handles special characters in client ID', () => {
      const specialId = 'client-[test].json'
      const result = limiter.check(specialId)
      expect(result.allowed).toBe(true)
    })

    it('handles concurrent checks from same client', () => {
      // Use up all per-second tokens
      const results = []
      for (let i = 0; i < 5; i++) {
        results.push(limiter.check('client1'))
      }

      // First 3 should be allowed (perSecond: 3)
      const allowed = results.filter((r) => r.allowed)
      const blocked = results.filter((r) => !r.allowed)

      expect(allowed.length).toBe(3)
      expect(blocked.length).toBe(2)
    })

    it('handles max clients limit', () => {
      const smallLimiter = new RateLimiter({
        requestsPerMinute: 10,
        requestsPerSecond: 5,
        maxClients: 2,
        cleanupInterval: 10000,
      })

      // Add clients up to limit
      smallLimiter.check('client1')
      smallLimiter.check('client2')

      // This should trigger cleanup but not fail
      const result = smallLimiter.check('client3')
      expect(result.allowed).toBe(true)

      smallLimiter.close()
    })
  })
})
