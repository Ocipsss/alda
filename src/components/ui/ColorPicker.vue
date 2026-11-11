<script setup>
import { WALLET_COLORS } from '../../constants/wallet'

const props = defineProps({
  modelValue: { type: String, default: '#3b82f6' }
})
const emit = defineEmits(['update:modelValue'])

const COLORS = WALLET_COLORS
</script>

<template>
  <div class="grid grid-cols-8 gap-2">
    <button
      v-for="c in COLORS" :key="c"
      type="button"
      @click="emit('update:modelValue', c)"
      :class="[
        'aspect-square rounded-full border-2 transition',
        modelValue === c ? 'border-slate-900 scale-110' : 'border-white shadow'
      ]"
      :style="{ background: c }"
      :aria-label="c"
    />
  </div>
</template>