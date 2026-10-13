<script setup lang="ts">
defineProps<{ title: string, message: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error" role="alert">
    <IconAlert class="error__icon" />
    <div class="error__text">
      <p class="t-card-title">{{ title }}</p>
      <p class="t-body-sm error__message">{{ message }}</p>
    </div>
    <button type="button" class="error__retry t-button" @click="$emit('retry')">
      Try again
    </button>
  </div>
</template>

<style scoped>

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-12);
  width: 100%;
  padding: var(--space-20);
  border: 2px solid rgb(244 63 94 / 0.5);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  text-align: center;
}
.error__icon {
  color: var(--color-error);
}
.error__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.error__message {
  color: var(--color-text-secondary);
}
.error__retry {
  height: 44px;
  padding: 0 var(--space-24);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
}
.error__retry:active {
  background: var(--color-primary);
}
</style>
