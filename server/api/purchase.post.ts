import { z } from 'zod'
import type { PurchaseResponse } from '#shared/types/paywall'
import { findOffer } from '../data/offers'

const bodySchema = z.object({
  offerId: z.string().min(1).max(64),
  deviceId: z.uuid(),
})

export default defineEventHandler(async (event): Promise<PurchaseResponse> => {
  await applySimulation(event)

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }
  const { offerId, deviceId } = parsed.data

  if (!findOffer(offerId)) {
    throw createError({ statusCode: 422, statusMessage: 'Unknown offer' })
  }

  // Test purchase: no payment provider, we only record the fact of purchase.
  const purchase = await usePurchaseRepo().create({ offerId, deviceId })
  setResponseStatus(event, 201)
  return { purchase }
})
