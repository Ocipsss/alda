<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'
import { Wallet as WalletIcon } from 'lucide-vue-next'
import { formatCurrency } from '../../lib/format'

const props = defineProps({
  modelValue: { type: String, default: null },
  wallets: { type: Array, default: () => [] },
  label: { type: String, default: 'Dompet' },
  exclude: { type: Array, default: () => [] },
  // Kalau true, tampilkan wallet temporer juga (untuk kasus khusus seperti form debt)
  includeTemporary: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const list = computed(() => {
  return props.wallets.filter(w => {
    if (props.exclude.includes(w.id)) return false
    if (w.is_deleted) return false
    if (!props.includeTemporary && w.is_temporary) return false
    return true
  })
})

function iconOf(name) {
  return LucideIcons[name] || LucideIcons.Wallet
}
</script>

<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-slate-700 mb-1.5">{{ label }}</label>

    <!-- Empty state -->
    <div
      v-if="!list.length"
      class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center"
    >
      <WalletIcon class="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
      <p class="text-xs text-slate-500">
        {{ includeTemporary
          ? 'Tidak ada dompet tersedia'
          : 'Belum ada dompet. Buat dompet dulu.' }}
      </p>
    </div>

    <!-- Wallet list -->
    <div v-else class="space-y-2">
      <button
        v-for="w in list"
        :key="w.id"
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
          <p v-if="w.is_temporary" class="text-[10px] text-orange-600 font-medium">
            Pihak Luar
          </p>
        </div>
        <div v-if="modelValue === w.id" class="w-4 h-4 rounded-full bg-brand-500" />
      </button>
    </div>
  </div>
</template>