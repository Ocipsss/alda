<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'
import { formatCurrency } from '../../lib/format'

const props = defineProps({
  items: { type: Array, default: () => [] },
  // Setiap item: { id, name, total, icon?, color? }
  colorClass: { type: String, default: 'bg-brand-500' },
  showIcon: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Belum ada data' },
  maxItems: { type: Number, default: 10 }
})

const visibleItems = computed(() => props.items.slice(0, props.maxItems))

const maxValue = computed(() => {
  const max = Math.max(...visibleItems.value.map(i => Number(i.total) || 0), 0)
  return max > 0 ? max : 1
})

function widthOf(item) {
  const val = Number(item.total) || 0
  if (val <= 0) return 0
  // Minimal 3% supaya bar tetap kelihatan
  return Math.max(3, (val / maxValue.value) * 100)
}

function iconOf(name) {
  return LucideIcons[name] || LucideIcons.Circle
}
</script>

<template>
  <div v-if="!visibleItems.length" class="text-center py-6 text-sm text-slate-400">
    {{ emptyText }}
  </div>

  <div v-else class="space-y-2.5">
    <div v-for="item in visibleItems" :key="item.id || item.name">
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="flex items-center gap-1.5 text-slate-700 font-medium truncate min-w-0">
          <component
            v-if="showIcon && item.icon"
            :is="iconOf(item.icon)"
            class="w-3.5 h-3.5 shrink-0"
          />
          <span
            v-else-if="item.color"
            class="w-2 h-2 rounded-full shrink-0"
            :style="{ background: item.color }"
          />
          <span class="truncate">{{ item.name }}</span>
        </span>
        <span class="text-slate-500 text-[10px] shrink-0 ml-2 tabular-nums">
          {{ formatCurrency(item.total) }}
        </span>
      </div>
      <div class="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="colorClass"
          :style="{ width: widthOf(item) + '%' }"
        />
      </div>
    </div>
  </div>
</template>