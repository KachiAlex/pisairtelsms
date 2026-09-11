// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as crypto from 'crypto'
import { hashPasswordSecurely, verifyPasswordAnyFormat, needsTransparentUpgrade } from './password-hashing.js'

/**
 * Tests for the shared password hashing library (SEC-08).
 * Validates Argon2id hashing, transparent verification of legacy
 * scrypt / HMAC-SHA256 formats, and the upgrade-detection helper.
 */

describe('hashPasswordSecurely', () => {
  it('returns an Argon2id encoded hash that never contains the plaintext', async () => {
    const plaintext = 'correct horse battery staple'
    const encoded = await hashPasswordSecurely(plaintext)
    expect(encoded).toMatch(/^\$argon2id\$/)
    expect(encoded).not.toContain(plaintext)
  })

  it('uses a random salt so the same password hashes differently', async () => {
    const a = await hashPasswordSecurely('same-password')
    const b = await hashPasswordSecurely('same-password')
    expect(a).not.toEqual(b)
  })

  it('round-trips through verifyPasswordAnyFormat', async () => {
    const encoded = await hashPasswordSecurely('hunter2')
    expect(await verifyPasswordAnyFormat('hunter2', encoded)).toBe(true)
    expect(await verifyPasswordAnyFormat('wrong-password', encoded)).toBe(false)
  })
})

describe('verifyPasswordAnyFormat legacy support', () => {
  const plaintext = 'legacy-password'

  it('verifies legacy HMAC-SHA256 `salt:hash` hashes (64 hex chars)', async () => {
    const salt = crypto.randomBytes(16).toString('hex')
    const digest = crypto.createHmac('sha256', salt).update(plaintext).digest('hex')
    expect(digest).toHaveLength(64)

    expect(await verifyPasswordAnyFormat(plaintext, `${salt}:${digest}`)).toBe(true)
    expect(await verifyPasswordAnyFormat('not-the-password', `${salt}:${digest}`)).toBe(false)
  })

  it('verifies legacy scrypt `salt:hash` hashes (128 hex chars)', async () => {
    const salt = crypto.randomBytes(16).toString('hex')
    const derived = await new Promise<string>(resolve => {
      crypto.scrypt(plaintext, salt, 64, (err, buf) => {
        if (err) resolve('')
        else resolve(buf.toString('hex'))
      })
    })
    expect(derived).toHaveLength(128)

    expect(await verifyPasswordAnyFormat(plaintext, `${salt}:${derived}`)).toBe(true)
    expect(await verifyPasswordAnyFormat('not-the-password', `${salt}:${derived}`)).toBe(false)
  })

  it('rejects malformed or unverifiable stored hashes', async () => {
    expect(await verifyPasswordAnyFormat('x', '')).toBe(false)
    expect(await verifyPasswordAnyFormat('x', 'salt-with-no-hash')).toBe(false)
    expect(await verifyPasswordAnyFormat('x', '$argon2id$this-is-not-a-valid-encoding')).toBe(false)
  })
})

describe('needsTransparentUpgrade', () => {
  it('returns false for Argon2id hashes', async () => {
    const encoded = await hashPasswordSecurely('anything')
    expect(needsTransparentUpgrade(encoded)).toBe(false)
  })

  it('returns true for legacy salt:hash values', () => {
    expect(needsTransparentUpgrade('deadbeef:deadbeef')).toBe(true)
  })

  it('returns false for empty / missing hashes', () => {
    expect(needsTransparentUpgrade('')).toBe(false)
    expect(needsTransparentUpgrade(undefined as unknown as string)).toBe(false)
  })
})