<script setup lang="ts">
import type { OffersResponse, Purchase, PurchaseResponse, PurchasesResponse } from '#shared/types/paywall'
import type { MascotMood } from '~/components/AppMascot.vue'

const MOODS: MascotMood[] = ['happy', 'thinking', 'sad', 'excited', 'celebrating']

useHead({
  link: MOODS.map(m => ({ rel: 'preload', as: 'image', href: `/mascot/${m}.svg` })),
})


const route = useRoute()
const simulate = computed(() => String(route.query.simulate ?? ''))
const offersQuery = computed(() =>
  ['slow', 'error'].includes(simulate.value) ? { simulate: simulate.value } : {},
)
const purchaseQuery = computed(() => {
  if (simulate.value === 'slow') return { simulate: 'slow' }
  if (simulate.value === 'purchase-error') return { simulate: 'error' }
  return {}
})

const { data, status, refresh } = useFetch<OffersResponse>('/api/offers', {
  server: false,
  query: offersQuery,
})
const offers = computed(() => data.value?.offers ?? [])

const selectedId = ref<string | null>(null)
watch(data, (value) => {
  if (value && !selectedId.value) selectedId.value = value.defaultOfferId
}, { immediate: true })
const selectedOffer = computed(() => offers.value.find(o => o.id === selectedId.value) ?? null)

const purchase = ref<Purchase | null>(null)
const purchasing = ref(false)
const restoring = ref(false)
const notice = ref<{ kind: 'error' | 'info', text: string } | null>(null)

const purchasedOffer = computed(() =>
  purchase.value ? offers.value.find(o => o.id === purchase.value!.offerId) ?? null : null,
)

const mood = computed<MascotMood>(() => {
  if (purchase.value) return 'celebrating'
  if (purchasing.value) return 'excited'
  if (status.value === 'error' || notice.value?.kind === 'error') return 'sad'
  if (status.value === 'pending' || status.value === 'idle' || restoring.value) return 'thinking'
  return 'happy'
})

// One key per purchase intent: reused when the user taps "Continue" again after a failure
// (the first attempt may have succeeded with the response lost), reset when the plan changes.
let idempotencyKey: string | null = null
watch(selectedId, () => {
  idempotencyKey = null
})

async function buy() {
  if (!selectedOffer.value || purchasing.value) return
  purchasing.value = true
  notice.value = null
  idempotencyKey ??= uuidV4()
  try {
    const res = await $fetch<PurchaseResponse>('/api/purchase', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: { offerId: selectedOffer.value.id, deviceId: getDeviceId() },
      query: purchaseQuery.value,
      // Safe to retry a POST only because the server deduplicates by Idempotency-Key.
      retry: 2,
      retryDelay: 400,
    })
    purchase.value = res.purchase
    idempotencyKey = null
  }
  catch {
    notice.value = { kind: 'error', text: 'Purchase failed. Please try again.' }
  }
  finally {
    purchasing.value = false
  }
}

async function restore() {
  if (restoring.value || purchasing.value) return
  restoring.value = true
  notice.value = null
  try {
    const res = await $fetch<PurchasesResponse>('/api/purchases', {
      query: { deviceId: getDeviceId(), ...purchaseQuery.value },
    })
    if (res.purchases[0]) purchase.value = res.purchases[0]
    else notice.value = { kind: 'info', text: 'No purchases found on this device.' }
  }
  catch {
    notice.value = { kind: 'error', text: 'Couldn\'t restore purchases. Try again.' }
  }
  finally {
    restoring.value = false
  }
}

function close() {
  // In the real app the host closes the WebView; in a browser we just go back.
  if (window.history.length > 1) window.history.back()
}

const successHeading = useTemplateRef<HTMLElement>('successHeading')
watch(purchase, async (value) => {
  if (!value) return
  await nextTick()
  successHeading.value?.focus()
})
</script>

<template>
  <div class="page">
    <!-- Glows live on the full-width page so they never get cut at the column edge on tablets/desktop. -->
    <div class="glow glow--violet" aria-hidden="true" />
    <div class="glow glow--pink" aria-hidden="true" />

    <div class="screen" :class="{ 'screen--success': purchase }">
      <button type="button" class="close" aria-label="Close" @click="close">
        <IconClose />
      </button>

      <!-- Success -->
      <template v-if="purchase">
        <main class="content">
          <header class="hero">
            <AppMascot mood="celebrating" />
            <div class="heading">
              <span class="pill t-caption"><IconCheck />Purchase complete</span>
              <h1 ref="successHeading" class="t-title" tabindex="-1">You're all set!</h1>
              <p class="t-body subtitle">Every game is unlocked. Have fun!</p>
            </div>
          </header>
          <dl class="receipt">
            <div class="receipt__row">
              <dt class="t-body-sm">Plan</dt>
              <dd class="t-card-title">{{ purchasedOffer?.title ?? purchase.offerId }}</dd>
            </div>
            <div v-if="purchasedOffer" class="receipt__row">
              <dt class="t-body-sm">Price</dt>
              <dd class="t-card-title">{{ purchasedOffer.priceLabel }} / {{ purchasedOffer.period }}</dd>
            </div>
            <div class="receipt__row">
              <dt class="t-body-sm">Order</dt>
              <dd class="t-card-title">#{{ purchase.orderNumber }}</dd>
            </div>
          </dl>
        </main>
        <footer class="footer">
          <PrimaryButton @click="close">Start playing</PrimaryButton>
        </footer>
      </template>

      <!-- Paywall -->
      <template v-else>
        <main class="content">
          <header class="hero">
            <AppMascot :mood="mood" />
            <div class="heading">
              <h1 class="t-title">Unlock all games</h1>
              <p class="t-body subtitle">Every game, every level and zero ads. Made for curious little players.</p>
            </div>
          </header>

          <ul class="benefits">
            <BenefitItem>100+ games, new ones every week</BenefitItem>
            <BenefitItem>No ads, safe for kids</BenefitItem>
            <BenefitItem>Play offline on any device</BenefitItem>
          </ul>

          <div class="offers" :class="{ 'offers--busy': purchasing }">
            <template v-if="status === 'pending' || status === 'idle'">
              <SkeletonCard v-for="i in 2" :key="i" />
              <span class="visually-hidden" role="status">Loading plans…</span>
            </template>
            <ErrorBox
              v-else-if="status === 'error'"
              title="Couldn't load plans"
              message="Check your connection and try again."
              @retry="refresh()"
            />
            <div v-else class="offers__list" role="radiogroup" aria-label="Choose a plan">
              <OfferCard
                v-for="offer in offers"
                :key="offer.id"
                :offer="offer"
                :selected="offer.id === selectedId"
                :disabled="purchasing"
                @select="selectedId = offer.id"
              />
            </div>
          </div>
        </main>

        <footer class="footer">
          <p
            v-if="notice"
            class="notice t-body-sm"
            :class="`notice--${notice.kind}`"
            role="status"
          >
            {{ notice.text }}
          </p>
          <PrimaryButton :loading="purchasing" :disabled="!selectedOffer" @click="buy">
            Continue
          </PrimaryButton>
          <button
            type="button"
            class="restore t-link"
            :class="{ 'restore--dimmed': purchasing }"
            :disabled="purchasing || restoring"
            @click="restore"
          >
            {{ restoring ? 'Restoring…' : 'Restore purchases' }}
          </button>
        </footer>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
}

.screen {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-24);
  max-width: 430px;
  min-height: 100dvh;
  margin-inline: auto;
  padding: calc(40px + env(safe-area-inset-top)) var(--space-24) calc(var(--space-24) + env(safe-area-inset-bottom));
}
.screen--success {
  padding-top: calc(96px + env(safe-area-inset-top));
}

/*
 * Figma layer blur 100 ≈ CSS blur(50px).
 * Figma positions (x = -110 / 230 in the 390px frame) are anchored to the column centre:
 * calc(50% - 195px) is the left edge of a 390px column, so phones match the mockup exactly.
 */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  pointer-events: none;
}
.glow--violet {
  top: -90px;
  left: calc(50% - 195px - 110px);
  width: 300px;
  height: 300px;
  background: var(--color-glow-violet);
  opacity: 0.55;
}
.glow--pink {
  top: 30px;
  left: calc(50% - 195px + 230px);
  width: 260px;
  height: 260px;
  background: var(--color-glow-pink);
  opacity: 0.35;
}

.close {
  position: absolute;
  z-index: 2;
  top: calc(12px + env(safe-area-inset-top));
  right: 12px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--color-text-secondary);
}

.content,
.footer {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.content {
  gap: var(--space-24);
}
.footer {
  gap: var(--space-4);
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  width: 100%;
}
.heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  width: 100%;
  text-align: center;
}
.heading h1:focus {
  outline: none;
}
.subtitle {
  color: var(--color-text-secondary);
}

.benefits {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  width: 100%;
  list-style: none;
}

.offers,
.offers__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  width: 100%;
}
.offers {
  transition: opacity 0.15s ease;
}
.offers--busy {
  opacity: 0.6;
}

.restore {
  height: 44px;
  padding: 0 var(--space-16);
  color: var(--color-text-secondary);
}
.restore:disabled {
  cursor: default;
}
.restore--dimmed {
  opacity: 0.4;
}

.notice {
  margin-bottom: var(--space-8);
  text-align: center;
}
.notice--error {
  color: var(--color-error);
}
.notice--info {
  color: var(--color-text-secondary);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px var(--space-12);
  border-radius: var(--radius-full);
  background: rgb(74 222 128 / 0.16);
  color: var(--color-success);
}

.receipt {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  width: 100%;
  padding: var(--space-16) var(--space-20);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.receipt__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.receipt__row dt {
  color: var(--color-text-muted);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
