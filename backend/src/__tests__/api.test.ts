/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { env } from 'cloudflare:workers'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import worker from '../index'

const BASE = 'http://localhost'

beforeAll(async () => {
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS waitlist (email TEXT PRIMARY KEY, joined_at TEXT NOT NULL, country TEXT)',
  ).run()
})

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(new Request(`${BASE}/health`), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('ok')
  })
})

describe('POST /waitlist', () => {
  it('returns 201 with success: true for valid email', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(
      new Request(`${BASE}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      }),
      env,
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(201)
    const body = (await res.json()) as { success: boolean; entry: { joinedAt: string } }
    expect(body.success).toBe(true)
    expect(new Date(body.entry.joinedAt).toISOString()).toBe(body.entry.joinedAt)
  })

  it('returns 201 with duplicate message for existing email', async () => {
    const ctx1 = createExecutionContext()
    await worker.fetch(
      new Request(`${BASE}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'duplicate@example.com' }),
      }),
      env,
      ctx1,
    )
    await waitOnExecutionContext(ctx1)

    const ctx2 = createExecutionContext()
    const res = await worker.fetch(
      new Request(`${BASE}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'duplicate@example.com' }),
      }),
      env,
      ctx2,
    )
    await waitOnExecutionContext(ctx2)
    expect(res.status).toBe(201)
    const body = (await res.json()) as { success: boolean; message: string }
    expect(body.success).toBe(true)
    expect(body.message).toContain('Ya estás en la lista')
  })

  it('returns 400 for invalid email', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(
      new Request(`${BASE}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      }),
      env,
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(400)
  })
})

describe('POST /auth/token', () => {
  it('returns 200 with token for valid ADMIN_SECRET', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(
      new Request(`${BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'test-admin', scope: 'read:all' }),
      }),
      env,
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { token: string }
    expect(body.token).toBeDefined()
  })

  it('returns 401 for wrong secret', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(
      new Request(`${BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'wrong-secret', scope: 'read:all' }),
      }),
      env,
      ctx,
    )
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(401)
  })
})

describe('GET /waitlist', () => {
  it('returns 401 without Authorization header', async () => {
    const ctx = createExecutionContext()
    const res = await worker.fetch(new Request(`${BASE}/waitlist`), env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(401)
  })
})
