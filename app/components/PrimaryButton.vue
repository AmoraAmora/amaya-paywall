<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean
  disabled?: boolean
  loadingLabel?: string
}>(), {
  loading: false,
  disabled: false,
  loadingLabel: 'Processing',
})

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="btn t-button"
    :class="{ 'btn--loading': loading }"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="$emit('click')"
  >
    <IconSpinner v-if="loading" />
    <span v-if="loading">{{ loadingLabel }}</span>
    <span v-else><slot /></span>
  </button>
</template>

<style scoped>
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  width: 100%;
  height: 56px;
  padding: 0 var(--space-24);
  border-radius: var(--radius-full);
  background: var(--gradient-cta);
  box-shadow: var(--shadow-cta);
  color: var(--color-text-primary);
  transition:
    transform 0.1s ease,
    box-shadow 0.15s ease;
}
.btn:active:not(:disabled) {
  background: var(--color-primary-pressed);
  box-shadow: none;
  transform: scale(0.98);
}
.btn:disabled:not(.btn--loading) {
  background: var(--color-surface-raised);
  box-shadow: none;
  color: var(--color-text-muted);
  cursor: default;
}
.btn--loading {
  cursor: progress;
}
</style>
