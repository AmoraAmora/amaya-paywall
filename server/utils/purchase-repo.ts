import { randomUUID } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import type { Purchase } from '#shared/types/paywall'

export interface NewPurchase {
  offerId: string
  deviceId: string
  /** Client-generated key: retries with the same key never create a second purchase. */
  idempotencyKey?: string
}

export interface CreateResult {
  purchase: Purchase
  /** True when the key was already used and the existing purchase is returned. */
  replayed: boolean
}

export interface PurchaseRepo {
  create(input: NewPurchase): Promise<CreateResult>
  listByDevice(deviceId: string): Promise<Purchase[]>
}

export function toOrderNumber(id: string): string {
  return `PW-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

interface PurchaseRow {
  id: string
  offer_id: string
  device_id: string
  created_at: Date | string
}

function fromRow(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    orderNumber: toOrderNumber(row.id),
    offerId: row.offer_id,
    deviceId: row.device_id,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

// Neon serverless driver: plain HTTPS per query, no connection pool to manage on serverless hosts.
function createPostgresRepo(databaseUrl: string): PurchaseRepo {
  const sql = neon(databaseUrl)
  return {
    async create({ offerId, deviceId, idempotencyKey }) {
      // ON CONFLICT makes concurrent retries safe: the unique index decides the winner.
      const inserted = await sql`
        INSERT INTO purchases (id, offer_id, device_id, idempotency_key)
        VALUES (${randomUUID()}, ${offerId}, ${deviceId}, ${idempotencyKey ?? null})
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id, offer_id, device_id, created_at
      ` as PurchaseRow[]
      if (inserted[0]) return { purchase: fromRow(inserted[0]), replayed: false }

      const existing = await sql`
        SELECT id, offer_id, device_id, created_at
        FROM purchases
        WHERE idempotency_key = ${idempotencyKey!}
      ` as PurchaseRow[]
      return { purchase: fromRow(existing[0]!), replayed: true }
    },
    async listByDevice(deviceId) {
      const rows = await sql`
        SELECT id, offer_id, device_id, created_at
        FROM purchases
        WHERE device_id = ${deviceId}
        ORDER BY created_at DESC
        LIMIT 20
      ` as PurchaseRow[]
      return rows.map(fromRow)
    },
  }
}

// Local-only fallback so `npm run dev` works before a database is configured.
function createMemoryRepo(): PurchaseRepo {
  const memory: Purchase[] = []
  const byKey = new Map<string, Purchase>()
  return {
    async create({ offerId, deviceId, idempotencyKey }) {
      const existing = idempotencyKey ? byKey.get(idempotencyKey) : undefined
      if (existing) return { purchase: existing, replayed: true }

      const id = randomUUID()
      const purchase: Purchase = { id, orderNumber: toOrderNumber(id), offerId, deviceId, createdAt: new Date().toISOString() }
      memory.push(purchase)
      if (idempotencyKey) byKey.set(idempotencyKey, purchase)
      return { purchase, replayed: false }
    },
    async listByDevice(deviceId) {
      return memory
        .filter(p => p.deviceId === deviceId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
  }
}

let repo: PurchaseRepo | undefined

export function usePurchaseRepo(): PurchaseRepo {
  if (repo) return repo
  const url = process.env.DATABASE_URL
  if (process.env.PURCHASE_STORAGE === 'memory') {
    // Explicit opt-in used by the test suite so it never touches a real database.
    repo = createMemoryRepo()
  }
  else if (url) {
    repo = createPostgresRepo(url)
  }
  else if (import.meta.dev) {
    console.warn('[purchases] DATABASE_URL is not set — using in-memory storage (dev only)')
    repo = createMemoryRepo()
  }
  else {
    throw createError({ statusCode: 500, statusMessage: 'Database is not configured' })
  }
  return repo
}
