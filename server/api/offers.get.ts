import type { OffersResponse } from '#shared/types/paywall'
import { DEFAULT_OFFER_ID, OFFERS } from '../data/offers'

export default defineEventHandler(async (event): Promise<OffersResponse> => {
  await applySimulation(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { offers: OFFERS, defaultOfferId: DEFAULT_OFFER_ID }
})
