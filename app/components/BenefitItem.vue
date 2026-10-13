<template>
  <li class="benefit">
    <span class="benefit__icon"><IconCheck /></span>
    <span class="t-body"><slot /></span>
  </li>
</template>

<style scoped>
.benefit {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  color: var(--color-text-primary);
}
.benefit__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  color: var(--color-success);
}
</style>
