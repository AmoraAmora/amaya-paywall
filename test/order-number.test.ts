import { describe, expect, it } from 'vitest'
import { DEFAULT_OFFER_ID, OFFERS, findOffer } from '../server/data/offers'
import { toOrderNumber } from '../server/utils/purchase-repo'

describe('toOrderNumber', () => {
  it('builds a short upper-case order number from the purchase id', () => {
    expect(toOrderNumber('ef9ad355-5dea-42fa-9c4c-80527cfdc038')).toBe('PW-EF9AD3')
  })
})

describe('offers catalogue', () => {
  it('has unique ids and a valid default', () => {
    const ids = OFFERS.map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findOffer(DEFAULT_OFFER_ID)).toBeDefined()
  })

  it('keeps display price in sync with the amount in cents', () => {
    for (const offer of OFFERS) {
      expect(offer.priceLabel).toBe(`$${(offer.priceCents / 100).toFixed(2)}`)
    }
  })

  it('advertises a yearly saving that matches the prices', () => {
    const yearly = findOffer('yearly')!
    const monthly = findOffer('monthly')!
    const saving = Math.round((1 - yearly.priceCents / (monthly.priceCents * 12)) * 100)
    expect(yearly.badge).toBe(`Save ${saving}%`)
  })
})
