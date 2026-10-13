<script setup lang="ts">
export type MascotMood = 'happy' | 'thinking' | 'sad' | 'excited' | 'celebrating'

defineProps<{ mood: MascotMood }>()
</script>

<template>
  <img
    class="mascot"
    :src="`/mascot/${mood}.svg`"
    alt=""
    width="200"
    height="168"
    decoding="async"
  >
</template>

<style scoped>
.mascot {
  width: 200px;
  height: 168px;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
