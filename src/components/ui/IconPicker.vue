<script setup>
import { ref, computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { Search } from 'lucide-vue-next'
import { CURATED_WALLET_ICONS } from '../../constants/wallet'

const props = defineProps({
  modelValue: { type: String, default: 'Wallet' }
})
const emit = defineEmits(['update:modelValue'])

const CURATED = CURATED_WALLET_ICONS

const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? CURATED.filter(n => n.toLowerCase().includes(q)) : CURATED
})

function pick(name) {
  emit('update:modelValue', name)
}

function resolveIcon(name) {
  return LucideIcons[name] || LucideIcons.Wallet
}
</script>

<template>
  <div class="space-y-3">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        v-model="query"
        placeholder="Cari ikon..."
        class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>

    <div class="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
      <button
        v-for="name in filtered" :key="name"
        type="button"
        :title="name"
        @click="pick(name)"
        :class="[
          'aspect-square flex items-center justify-center rounded-lg border transition',
          modelValue === name
            ? 'border-brand-500 bg-brand-50 text-brand-600'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        ]"
      >
        <component :is="resolveIcon(name)" class="w-5 h-5" />
      </button>
    </div>

    <p class="text-xs text-slate-500">Dipilih: <span class="font-medium text-slate-700">{{ modelValue }}</span></p>
  </div>
</template>