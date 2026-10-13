<template>
  <div class="skeleton" aria-hidden="true">
    <span class="bone bone--radio" />
    <span class="skeleton__lines">
      <span class="bone bone--title" />
      <span class="bone bone--subtitle" />
    </span>
    <span class="bone bone--price" />
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  width: 100%;
  height: 76px;
  padding: 14px 20px 14px 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.skeleton__lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-8);
}
.bone {
  display: block;
  flex-shrink: 0;
  background: var(--color-surface-raised);
  animation: pulse 1.2s ease-in-out infinite;
}
.bone--radio {
  width: 24px;
  height: 24px;
  border-radius: 12px;
}
.bone--title {
  width: 80px;
  height: 14px;
  border-radius: 7px;
}
.bone--subtitle {
  width: 160px;
  height: 12px;
  border-radius: 6px;
}
.bone--price {
  width: 64px;
  height: 20px;
  border-radius: 8px;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
</style>
