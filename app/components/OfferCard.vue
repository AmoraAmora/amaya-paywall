<script setup lang="ts">
import type { Offer } from '#shared/types/paywall'

defineProps<{
  offer: Offer
  selected: boolean
  disabled?: boolean
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    role="radio"
    class="offer"
    :class="{ 'offer--selected': selected }"
    :aria-checked="selected"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span class="offer__radio">
      <IconCheck v-if="selected" />
    </span>
    <span class="offer__info">
      <span class="t-card-title">{{ offer.title }}</span>
      <span class="t-body-sm offer__subtitle">{{ offer.subtitle }}</span>
    </span>
    <span class="offer__price">
      <span class="t-price">{{ offer.priceLabel }}</span>
      <span class="t-caption offer__period">{{ offer.periodLabel }}</span>
    </span>
    <span v-if="offer.badge" class="offer__badge t-badge">{{ offer.badge }}</span>
  </button>
</template>

<style scoped>

.offer {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-12);
  width: 100%;
  min-height: 76px;
  padding: 14px 20px 14px 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  text-align: left;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
}
.offer:active:not(:disabled) {
  transform: scale(0.98);
}
.offer:disabled {
  cursor: default;
}
.offer--selected {
  border-color: var(--color-primary);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-glow-selected);
}

.offer__radio {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: 2px solid var(--color-text-muted);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
}
.offer--selected .offer__radio {
  border: 0;
  background: var(--color-primary);
}

.offer__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}
.offer__subtitle {
  color: var(--color-text-secondary);
}

.offer__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
  white-space: nowrap;
}
.offer__period {
  color: var(--color-text-muted);
}

/* Offsets are from the outer edge in Figma (-11 / 16); CSS measures from inside the 2px border. */
.offer__badge {
  position: absolute;
  top: -13px;
  right: 14px;
  padding: 4px var(--space-8);
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: var(--color-on-accent);
}
</style>
