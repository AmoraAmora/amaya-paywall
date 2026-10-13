import { z } from 'zod'
import type { PurchaseResponse } from '#shared/types/paywall'
import { findOffer } from '../data/offers'

const bodySchema = z.object({
  offerId: z.string().min(1).max(64),
  deviceId: z.uuid(),
})

const idempotencyKeySchema = z.string().regex(/^[\w-]{8,128}$/).optional()

export default defineEventHandler(async (event): Promise<PurchaseResponse> => {
  await applySimulation(event)

  const key = idempotencyKeySchema.safeParse(getHeader(event, 'idempotency-key'))
  if (!key.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Idempotency-Key header' })
  }

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }
  const { offerId, deviceId } = parsed.data

  if (!findOffer(offerId)) {
    throw createError({ statusCode: 422, statusMessage: 'Unknown offer' })
  }

  // Test purchase: no payment provider, we only record the fact of purchase.
  const { purchase, replayed } = await usePurchaseRepo().create({ offerId, deviceId, idempotencyKey: key.data })

  if (replayed) {
    // Same key must mean the same request — otherwise the client has a bug.
    if (purchase.offerId !== offerId || purchase.deviceId !== deviceId) {
      throw createError({ statusCode: 409, statusMessage: 'Idempotency-Key was already used for a different request' })
    }
    setResponseHeader(event, 'Idempotent-Replayed', 'true')
    return { purchase }
  }

  setResponseStatus(event, 201)
  return { purchase }
})
