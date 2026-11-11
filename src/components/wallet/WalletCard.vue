<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'
import { formatCurrency } from '../../lib/format'

const props = defineProps({
  wallet: { type: Object, required: true }
})
defineEmits(['click'])

const icon = computed(() => LucideIcons[props.wallet.icon] || LucideIcons.Wallet)
const formattedBalance = computed(() =>
  formatCurrency(props.wallet.initial_balance || 0)
)
</script>

<template>
  <button
    @click="$emit('click', wallet)"
    class="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 active:bg-slate-50 transition text-left"
  >
    <div
      class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
      :style="{ background: wallet.color + '20', color: wallet.color }"
    >
      <component :is="icon" class="w-5 h-5" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="font-medium text-slate-900 truncate">{{ wallet.name }}</p>
      <p class="text-sm text-slate-500">{{ formattedBalance }}</p>
    </div>
  </button>
</template>