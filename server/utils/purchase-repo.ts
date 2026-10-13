import { randomUUID } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import type { Purchase } from '#shared/types/paywall'

export interface NewPurchase {
  offerId: string
  deviceId: string
}

export interface PurchaseRepo {
  create(input: NewPurchase): Promise<Purchase>
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
    async create({ offerId, deviceId }) {
      const rows = await sql`
        INSERT INTO purchases (id, offer_id, device_id)
        VALUES (${randomUUID()}, ${offerId}, ${deviceId})
        RETURNING id, offer_id, device_id, created_at
      ` as PurchaseRow[]
      return fromRow(rows[0]!)
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
  return {
    async create({ offerId, deviceId }) {
      const id = randomUUID()
      const purchase: Purchase = { id, orderNumber: toOrderNumber(id), offerId, deviceId, createdAt: new Date().toISOString() }
      memory.push(purchase)
      return purchase
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
