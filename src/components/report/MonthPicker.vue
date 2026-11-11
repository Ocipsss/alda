<script setup>
import { computed } from 'vue'
import { monthLabel } from '../../lib/report'

const props = defineProps({
  modelValue: { type: Object, default: null }, // { year, month }
  months: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

const selectedKey = computed({
  get: () => props.modelValue ? `${props.modelValue.year}-${props.modelValue.month}` : '',
  set: (val) => {
    if (!val) return
    const [y, m] = val.split('-').map(Number)
    emit('update:modelValue', { year: y, month: m })
  }
})
</script>

<template>
  <select
    v-model="selectedKey"
    class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
  >
    <option
      v-for="m in months"
      :key="`${m.year}-${m.month}`"
      :value="`${m.year}-${m.month}`"
    >{{ monthLabel(m.year, m.month) }}</option>
  </select>
</template>