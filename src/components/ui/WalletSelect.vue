<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  wallets: { type: Array, default: () => [] },
  label: { type: String, default: 'Dompet' },
  exclude: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

const list = computed(() => props.wallets.filter(w => !props.exclude.includes(w.id)))

function iconOf(name) {
  return LucideIcons[name] || LucideIcons.Wallet
}

function fmt(v) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(v)
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-1.5">{{ label }}</label>
    <div class="space-y-2">
      <button
        v-for="w in list" :key="w.id"
        type="button"
        @click="emit('update:modelValue', w.id)"
        :class="[
          'w-full flex items-center gap-3 p-3 rounded-xl border transition text-left',
          modelValue === w.id
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-200 hover:border-slate-300'
        ]"
      >
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          :style="{ background: w.color + '20', color: w.color }"
        >
          <component :is="iconOf(w.icon)" class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ w.name }}</p>
        </div>
        <div v-if="modelValue === w.id" class="w-4 h-4 rounded-full bg-brand-500" />
      </button>
    </div>
  </div>
</template>