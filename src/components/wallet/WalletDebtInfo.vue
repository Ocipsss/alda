cat > src/components/wallet/WalletDebtInfo.vue << 'VUE_EOF'
<script setup>
import { computed } from 'vue'
import { ArrowUpRight, ArrowDownLeft, ChevronRight, User } from 'lucide-vue-next'
import { formatCurrency } from '../../lib/format'

const props = defineProps({
  data: { type: Object, required: true }
})
const emit = defineEmits(['item-click'])

const hasItems = computed(() =>
  props.data.utang.length > 0 || props.data.piutang.length > 0
)

function onClick(item) {
  emit('item-click', item)
}
</script>

<template>
  <div v-if="hasItems" class="space-y-3">
    <!-- Utang (wallet berutang) -->
    <div
      v-if="data.utang.length"
      class="bg-red-50 border border-red-100 rounded-xl p-3"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-red-700">
          <ArrowUpRight class="w-3.5 h-3.5" />
          Berutang ke
        </div>
        <span class="text-xs font-bold text-red-700">
          {{ formatCurrency(data.totalUtang) }}
        </span>
      </div>
      <div class="space-y-1">
        <button
          v-for="item in data.utang"
          :key="item.debt.id"
          @click="onClick(item)"
          class="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-red-100/50 transition text-left"
        >
          <div class="flex-1 min-w-0 flex items-center gap-1.5">
            <User v-if="item.isTemporary" class="w-3.5 h-3.5 shrink-0 text-red-400" />
            <span
              v-else-if="item.color"
              class="w-2 h-2 rounded-full shrink-0"
              :style="{ background: item.color }"
            />
            <span class="text-sm font-medium truncate">{{ item.label }}</span>
            <span
              v-if="item.isTemporary"
              class="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0"
            >eksternal</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span class="text-xs font-semibold text-red-700">
              {{ formatCurrency(item.amount) }}
            </span>
            <ChevronRight class="w-3.5 h-3.5 text-red-300" />
          </div>
        </button>
      </div>
    </div>

    <!-- Piutang (wallet dipinjami) -->
    <div
      v-if="data.piutang.length"
      class="bg-green-50 border border-green-100 rounded-xl p-3"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-green-700">
          <ArrowDownLeft class="w-3.5 h-3.5" />
          Dipinjami oleh
        </div>
        <span class="text-xs font-bold text-green-700">
          {{ formatCurrency(data.totalPiutang) }}
        </span>
      </div>
      <div class="space-y-1">
        <button
          v-for="item in data.piutang"
          :key="item.debt.id"
          @click="onClick(item)"
          class="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-green-100/50 transition text-left"
        >
          <div class="flex-1 min-w-0 flex items-center gap-1.5">
            <User v-if="item.isTemporary" class="w-3.5 h-3.5 shrink-0 text-green-400" />
            <span
              v-else-if="item.color"
              class="w-2 h-2 rounded-full shrink-0"
              :style="{ background: item.color }"
            />
            <span class="text-sm font-medium truncate">{{ item.label }}</span>
            <span
              v-if="item.isTemporary"
              class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0"
            >eksternal</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span class="text-xs font-semibold text-green-700">
              {{ formatCurrency(item.amount) }}
            </span>
            <ChevronRight class="w-3.5 h-3.5 text-green-300" />
          </div>
        </button>
      </div>
    </div>
  </div>

  <div
    v-else
    class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center"
  >
    <p class="text-sm text-slate-500">Tidak ada utang/piutang untuk dompet ini</p>
  </div>
</template>
VUE_EOF