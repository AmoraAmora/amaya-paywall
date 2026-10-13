import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { OffersResponse, PurchaseResponse, PurchasesResponse } from '../shared/types/paywall'

// Builds the app and starts the production server with in-memory storage,
// so the suite never writes to a real database.
await setup({
  rootDir: fileURLToPath(new URL('..', import.meta.url)),
  server: true,
  env: { PURCHASE_STORAGE: 'memory', DATABASE_URL: '' },
})

const post = (body: unknown, init: RequestInit = {}) =>
  fetch('/api/purchase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  })

describe('GET /api/offers', () => {
  it('returns both offers with yearly pre-selected', async () => {
    const res = await $fetch<OffersResponse>('/api/offers')
    expect(res.defaultOfferId).toBe('yearly')
    expect(res.offers.map(o => o.id)).toEqual(['yearly', 'monthly'])
    expect(res.offers.map(o => o.priceCents)).toEqual([2999, 499])
  })

  it('is never cached', async () => {
    const res = await fetch('/api/offers')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('can simulate a failure for the error state demo', async () => {
    const res = await fetch('/api/offers?simulate=error')
    expect(res.status).toBe(503)
  })
})

describe('POST /api/purchase', () => {
  it('records a purchase and returns an order number', async () => {
    const deviceId = randomUUID()
    const res = await post({ offerId: 'monthly', deviceId })
    expect(res.status).toBe(201)

    const { purchase } = await res.json() as PurchaseResponse
    expect(purchase).toMatchObject({ offerId: 'monthly', deviceId })
    expect(purchase.orderNumber).toMatch(/^PW-[0-9A-F]{6}$/)
    expect(new Date(purchase.createdAt).toISOString()).toBe(purchase.createdAt)
  })

  it('ignores any price sent by the client', async () => {
    const res = await post({ offerId: 'yearly', deviceId: randomUUID(), priceCents: 1, price: 0 })
    expect(res.status).toBe(201)
    const { purchase } = await res.json() as PurchaseResponse
    expect(Object.keys(purchase).sort()).toEqual(['createdAt', 'deviceId', 'id', 'offerId', 'orderNumber'])
  })

  it('rejects an unknown offer with 422', async () => {
    const res = await post({ offerId: 'lifetime', deviceId: randomUUID() })
    expect(res.status).toBe(422)
  })

  it.each([
    ['missing fields', {}],
    ['invalid device id', { offerId: 'yearly', deviceId: 'not-a-uuid' }],
    ['empty offer id', { offerId: '', deviceId: randomUUID() }],
    ['malformed JSON', '{"offerId":'],
  ])('rejects %s with 400', async (_, body) => {
    const res = await post(body)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/purchases (restore)', () => {
  it('returns only this device’s purchases, newest first', async () => {
    const deviceId = randomUUID()
    await post({ offerId: 'monthly', deviceId })
    await new Promise(r => setTimeout(r, 5))
    await post({ offerId: 'yearly', deviceId })
    await post({ offerId: 'yearly', deviceId: randomUUID() }) // another device

    const { purchases } = await $fetch<PurchasesResponse>('/api/purchases', { query: { deviceId } })
    expect(purchases.map(p => p.offerId)).toEqual(['yearly', 'monthly'])
    expect(purchases.every(p => p.deviceId === deviceId)).toBe(true)
  })

  it('returns an empty list for a new device', async () => {
    const { purchases } = await $fetch<PurchasesResponse>('/api/purchases', { query: { deviceId: randomUUID() } })
    expect(purchases).toEqual([])
  })

  it('requires a valid device id', async () => {
    const res = await fetch('/api/purchases')
    expect(res.status).toBe(400)
  })
})
