// Types shared between the Nuxt app and the Nitro server routes.

export interface Offer {
  id: string
  title: string
  subtitle: string
  /** Price in minor units (cents) — the only source of truth for the amount. */
  priceCents: number
  currency: 'USD'
  /** Pre-formatted for display, e.g. "$29.99". */
  priceLabel: string
  /** e.g. "per year" */
  periodLabel: string
  /** Billing period unit, used for "$29.99 / year". */
  period: 'year' | 'month'
  /** Optional highlight pill, e.g. "Save 50%". */
  badge: string | null
}

export interface OffersResponse {
  offers: Offer[]
  /** Offer that should be pre-selected on the paywall. */
  defaultOfferId: string
}

export interface PurchaseRequest {
  offerId: string
  deviceId: string
}

export interface Purchase {
  id: string
  /** Short human-readable order number, e.g. "PW-7F3A2C". */
  orderNumber: string
  offerId: string
  deviceId: string
  createdAt: string
}

export interface PurchaseResponse {
  purchase: Purchase
}

export interface PurchasesResponse {
  purchases: Purchase[]
}
