<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'
import { ArrowRight, HandCoins } from 'lucide-vue-next'

const props = defineProps({
  tx: { type: Object, required: true },
  category: { type: Object, default: null },
  wallet: { type: Object, default: null },
  toWallet: { type: Object, default: null },
  hasLoan: { type: Boolean, default: false }
})
defineEmits(['click'])

const icon = computed(() => {
  if (props.tx.type === 'transfer') return LucideIcons.ArrowLeftRight
  return LucideIcons[props.category?.icon] || LucideIcons.Circle
})

const color = computed(() => {
  if (props.tx.type === 'income') return '#10b981'
  if (props.tx.type === 'expense') return '#ef4444'
  return '#6366f1'
})

const label = computed(() => {
  if (props.tx.type === 'transfer') return 'Transfer'
  return props.category?.name || props.tx.type
})

const formatted = computed(() => {
  const sign = props.tx.type === 'income' ? '+' : props.tx.type === 'expense' ? '−' : ''
  return sign + new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(props.tx.amount)
})

const dateLabel = computed(() =>
  new Date(props.tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
)
</script>

<template>
  <button
    @click="$emit('click', tx)"
    class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 active:bg-slate-100 transition text-left rounded-lg"
  >
    <div
      class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      :style="{ background: color + '18', color }"
    >
      <component :is="icon" class="w-5 h-5" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <p class="font-medium text-sm truncate">{{ label }}</p>
        <HandCoins v-if="hasLoan" class="w-3.5 h-3.5 text-amber-500 shrink-0" />
      </div>
      <p class="text-xs text-slate-500 truncate">
        <template v-if="tx.type === 'transfer'">
          {{ wallet?.name }} <ArrowRight class="inline w-3 h-3" /> {{ toWallet?.name }}
        </template>
        <template v-else>
          {{ wallet?.name }} · {{ dateLabel }}
        </template>
        <template v-if="tx.note"> · {{ tx.note }}</template>
      </p>
    </div>

    <p
      class="font-semibold text-sm whitespace-nowrap"
      :class="tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-indigo-600'"
    >
      {{ formatted }}
    </p>
  </button>
</template>