<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'
import { ArrowRight, HandCoins } from 'lucide-vue-next'
import { TX_TYPE, TX_TYPE_LABEL, TX_TYPE_COLOR } from '../../constants/transaction'
import { formatCurrency, formatDate } from '../../lib/format'

const props = defineProps({
  tx: { type: Object, required: true },
  category: { type: Object, default: null },
  wallet: { type: Object, default: null },
  toWallet: { type: Object, default: null },
  hasLoan: { type: Boolean, default: false }
})
defineEmits(['click'])

const isTransfer = computed(() => props.tx.type === TX_TYPE.TRANSFER)

const icon = computed(() => {
  if (isTransfer.value) return LucideIcons.ArrowLeftRight
  return LucideIcons[props.category?.icon] || LucideIcons.Circle
})

const color = computed(() =>
  TX_TYPE_COLOR[props.tx.type] || TX_TYPE_COLOR[TX_TYPE.TRANSFER]
)

const label = computed(() => {
  if (isTransfer.value) return TX_TYPE_LABEL.transfer
  return props.category?.name || TX_TYPE_LABEL[props.tx.type] || props.tx.type
})

const formatted = computed(() => {
  const sign =
    props.tx.type === TX_TYPE.INCOME ? '+' :
    props.tx.type === TX_TYPE.EXPENSE ? '−' : ''
  return sign + formatCurrency(props.tx.amount)
})

const dateLabel = computed(() => formatDate(props.tx.date))

const amountClass = computed(() => {
  if (props.tx.type === TX_TYPE.INCOME) return 'text-green-600'
  if (props.tx.type === TX_TYPE.EXPENSE) return 'text-red-600'
  return 'text-indigo-600'
})
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
        <template v-if="isTransfer">
          {{ wallet?.name }} <ArrowRight class="inline w-3 h-3" /> {{ toWallet?.name }}
        </template>
        <template v-else>
          {{ wallet?.name }} · {{ dateLabel }}
        </template>
        <template v-if="tx.note"> · {{ tx.note }}</template>
      </p>
    </div>

    <p class="font-semibold text-sm whitespace-nowrap" :class="amountClass">
      {{ formatted }}
    </p>
  </button>
</template>