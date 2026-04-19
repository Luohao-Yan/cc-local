import { describe, expect, it } from 'vitest'
import { AuthManager } from './AuthManager.js'

describe('AuthManager', () => {
  it('accepts Bearer and X-API-Key tokens', () => {
    const auth = new AuthManager({ apiKey: 'secret-token', allowLoopbackOrigins: false })

    expect(auth.authenticateRequest(new Headers({
      Authorization: 'Bearer secret-token',
    }))).toEqual({
      ok: true,
      token: 'secret-token',
    })

    expect(auth.authenticateRequest(new Headers({
      'X-API-Key': 'secret-token',
    }))).toEqual({
      ok: true,
      token: 'secret-token',
    })
  })

  it('rejects malformed auth headers and unknown origins', () => {
    const auth = new AuthManager({
      apiKey: 'secret-token',
      allowedOrigins: ['https://app.example.com'],
      allowLoopbackOrigins: false,
    })

    expect(auth.authenticateRequest(new Headers({
      Authorization: 'Token secret-token',
    }))).toMatchObject({
      ok: false,
      code: 'invalid_auth_format',
    })

    expect(auth.isOriginAllowed('https://app.example.com')).toBe(true)
    expect(auth.isOriginAllowed('http://localhost:3000')).toBe(false)
    expect(auth.isOriginAllowed('https://evil.example.com')).toBe(false)
  })

  it('allows loopback origins by default', () => {
    const auth = new AuthManager({ apiKey: 'secret-token' })

    expect(auth.isOriginAllowed('http://localhost:3000')).toBe(true)
    expect(auth.isOriginAllowed('http://127.0.0.1:5173')).toBe(true)
  })
})
