import type { Offer } from '#shared/types/paywall'

// Offers live on the server only: the client never sends a price,
// it can only reference an offer by id.
export const OFFERS: Offer[] = [
  {
    id: 'yearly',
    title: 'Yearly',
    subtitle: '$2.49 / month, billed yearly',
    priceCents: 2999,
    currency: 'USD',
    priceLabel: '$29.99',
    periodLabel: 'per year',
    period: 'year',
    badge: 'Save 50%',
  },
  {
    id: 'monthly',
    title: 'Monthly',
    subtitle: 'Cancel anytime',
    priceCents: 499,
    currency: 'USD',
    priceLabel: '$4.99',
    periodLabel: 'per month',
    period: 'month',
    badge: null,
  },
]

export const DEFAULT_OFFER_ID = 'yearly'

export function findOffer(id: string): Offer | undefined {
  return OFFERS.find(offer => offer.id === id)
}
