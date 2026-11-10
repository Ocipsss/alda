<script setup>
const props = defineProps({
  modelValue: { type: String, default: '#3b82f6' }
})
const emit = defineEmits(['update:modelValue'])

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#64748b', '#0f172a'
]
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