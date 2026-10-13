import { z } from 'zod'
import type { PurchasesResponse } from '#shared/types/paywall'

const querySchema = z.object({
  deviceId: z.uuid(),
})

// Used by "Restore purchases": returns purchases made from this device.
export default defineEventHandler(async (event): Promise<PurchasesResponse> => {
  await applySimulation(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid deviceId' })
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
  const purchases = await usePurchaseRepo().listByDevice(parsed.data.deviceId)
  return { purchases }
})
