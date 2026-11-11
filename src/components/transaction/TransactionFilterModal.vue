<script setup>
import { ref, watch, computed } from 'vue'
import { Check } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import { useWalletStore } from '../../stores/wallet'
import { useCategoryStore } from '../../stores/category'
import { TX_TYPE, TX_TYPE_LABEL } from '../../constants/transaction'
import {
  todayRange,
  last7DaysRange,
  last30DaysRange,
  thisMonthRange,
  lastMonthRange,
  defaultFilter
} from '../../lib/filter'

const props = defineProps({
  modelValue: Boolean,
  currentFilter: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'apply'])

const walletStore = useWalletStore()
const catStore = useCategoryStore()

const form = ref(defaultFilter())

const allTypes = [
  { value: TX_TYPE.INCOME, label: TX_TYPE_LABEL.income },
  { value: TX_TYPE.EXPENSE, label: TX_TYPE_LABEL.expense },
  { value: TX_TYPE.TRANSFER, label: TX_TYPE_LABEL.transfer }
]

const quickRanges = [
  { key: 'today', label: 'Hari ini', fn: todayRange },
  { key: '7d', label: '7 hari', fn: last7DaysRange },
  { key: '30d', label: '30 hari', fn: last30DaysRange },
  { key: 'month', label: 'Bulan ini', fn: thisMonthRange },
  { key: 'lastMonth', label: 'Bulan lalu', fn: lastMonthRange }
]

watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = props.currentFilter
      ? JSON.parse(JSON.stringify(props.currentFilter))
      : defaultFilter()
  }
})

const allCategories = computed(() => {
  // Gabungkan income & expense, urutkan berdasarkan jenis
  return [
    ...catStore.incomeCategories.map(c => ({ ...c, _type: 'income' })),
    ...catStore.expenseCategories.map(c => ({ ...c, _type: 'expense' }))
  ]
})

function applyQuick(fn) {
  const { dateFrom, dateTo } = fn()
  form.value.dateFrom = dateFrom
  form.value.dateTo = dateTo
}

function toggleType(value) {
  const idx = form.value.types.indexOf(value)
  if (idx === -1) form.value.types.push(value)
  else form.value.types.splice(idx, 1)
}

function resetFilter() {
  form.value = defaultFilter()
}

function apply() {
  emit('apply', { ...form.value })
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Filter Transaksi"
  >
    <div class="space-y-4">
      <!-- Quick Range -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Rentang Cepat</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="q in quickRanges"
            :key="q.key"
            type="button"
            @click="applyQuick(q.fn)"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-700"
          >{{ q.label }}</button>
        </div>
      </div>

      <!-- Custom Date Range -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Dari</label>
          <input
            v-model="form.dateFrom"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Sampai</label>
          <input
            v-model="form.dateTo"
            type="date"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <!-- Jenis -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Jenis Transaksi</label>
        <div class="space-y-2">
          <button
            v-for="t in allTypes"
            :key="t.value"
            type="button"
            @click="toggleType(t.value)"
            class="w-full flex items-center gap-2 p-2 rounded-lg border transition text-left"
            :class="form.types.includes(t.value)
              ? 'border-brand-500 bg-brand-50'
              : 'border-slate-200 hover:border-slate-300'"
          >
            <div
              class="w-4 h-4 rounded border flex items-center justify-center shrink-0"
              :class="form.types.includes(t.value)
                ? 'bg-brand-500 border-brand-500'
                : 'border-slate-300'"
            >
              <Check v-if="form.types.includes(t.value)" class="w-3 h-3 text-white" />
            </div>
            <span class="text-sm">{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Dompet -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Dompet</label>
        <select
          v-model="form.wallet_id"
          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option :value="null">Semua dompet</option>
          <option
            v-for="w in walletStore.activeWallets"
            :key="w.id"
            :value="w.id"
          >{{ w.name }}</option>
        </select>
      </div>

      <!-- Kategori -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Kategori</label>
        <select
          v-model="form.category_id"
          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option :value="null">Semua kategori</option>
          <optgroup label="Pemasukan">
            <option
              v-for="c in catStore.incomeCategories"
              :key="c.id"
              :value="c.id"
            >{{ c.name }}</option>
          </optgroup>
          <optgroup label="Pengeluaran">
            <option
              v-for="c in catStore.expenseCategories"
              :key="c.id"
              :value="c.id"
            >{{ c.name }}</option>
          </optgroup>
        </select>
      </div>

      <!-- Search -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Cari di Catatan</label>
        <input
          v-model="form.search"
          type="text"
          placeholder="Kata kunci catatan..."
          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <BaseButton variant="secondary" @click="resetFilter">Reset</BaseButton>
        <div class="flex-1" />
        <BaseButton variant="ghost" @click="emit('update:modelValue', false)">Batal</BaseButton>
        <BaseButton @click="apply">Terapkan</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>