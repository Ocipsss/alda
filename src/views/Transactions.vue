<script setup>
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Filter, X, TrendingUp, TrendingDown, ArrowLeftRight, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import TransactionItem from '../components/transaction/TransactionItem.vue'
import TransactionDetailModal from '../components/transaction/TransactionDetailModal.vue'
import TransactionFilterModal from '../components/transaction/TransactionFilterModal.vue'
import { useTransactionStore } from '../stores/transaction'
import { useWalletStore } from '../stores/wallet'
import { useCategoryStore } from '../stores/category'
import { applyFilter, summarize, defaultFilter } from '../lib/filter'
import { formatCurrency } from '../lib/format'

const router = useRouter()
const txStore = useTransactionStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()

const showFilter = ref(false)
const showDetail = ref(false)
const detailTx = ref(null)
const filter = ref(defaultFilter())

const filteredTransactions = computed(() =>
  applyFilter(txStore.activeTransactions, filter.value)
)

const stats = computed(() => summarize(filteredTransactions.value))

const hasActiveFilter = computed(() => {
  const f = filter.value
  const def = defaultFilter()
  return (
    f.dateFrom !== def.dateFrom ||
    f.dateTo !== def.dateTo ||
    f.types.length !== def.types.length ||
    f.wallet_id !== null ||
    f.category_id !== null ||
    (f.search || '').trim() !== ''
  )
})

onMounted(async () => {
  await Promise.all([
    txStore.loadLocal(),
    walletStore.loadLocal(),
    catStore.loadLocal()
  ])
})

function catOf(id) {
  return catStore.categories.find(c => c.id === id) || null
}
function walletOf(id) {
  return walletStore.wallets.find(w => w.id === id) || null
}
function hasLoan(txId) {
  return txStore.splits.some(s => s.transaction_id === txId && s.is_loan)
}

function openDetail(tx) {
  detailTx.value = tx
  showDetail.value = true
}

function onApplyFilter(newFilter) {
  filter.value = newFilter
}

function clearFilter() {
  filter.value = defaultFilter()
}
</script>

<template>
  <div class="min-h-screen pb-24">
    <header class="px-5 pt-6 pb-4 flex items-center gap-3">
      <button
        @click="router.push({ name: 'dashboard' })"
        class="p-2 -ml-2 rounded-lg hover:bg-slate-100"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-bold">Transaksi</h1>
        <p class="text-xs text-slate-500">Semua riwayat transaksi</p>
      </div>
      <button
        @click="showFilter = true"
        class="relative flex items-center gap-1 p-2 rounded-lg hover:bg-slate-100"
      >
        <Filter class="w-5 h-5 text-slate-600" />
        <span
          v-if="hasActiveFilter"
          class="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500"
        />
      </button>
    </header>

    <main class="px-5 space-y-4">
      <!-- Summary -->
      <section class="grid grid-cols-3 gap-2">
        <div class="bg-green-50 rounded-xl p-3 border border-green-100">
          <div class="flex items-center gap-1 text-[10px] text-green-700 font-medium mb-0.5">
            <TrendingUp class="w-3 h-3" /> Masuk
          </div>
          <p class="text-sm font-bold text-green-700">{{ formatCurrency(stats.income) }}</p>
        </div>
        <div class="bg-red-50 rounded-xl p-3 border border-red-100">
          <div class="flex items-center gap-1 text-[10px] text-red-700 font-medium mb-0.5">
            <TrendingDown class="w-3 h-3" /> Keluar
          </div>
          <p class="text-sm font-bold text-red-700">{{ formatCurrency(stats.expense) }}</p>
        </div>
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div class="text-[10px] text-slate-600 font-medium mb-0.5">Net</div>
          <p
            class="text-sm font-bold"
            :class="stats.net >= 0 ? 'text-slate-900' : 'text-red-600'"
          >{{ formatCurrency(stats.net) }}</p>
        </div>
      </section>

      <!-- Active filter summary -->
      <div
        v-if="hasActiveFilter"
        class="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg p-2 text-xs"
      >
        <span class="text-brand-700 flex-1">
          Filter aktif — {{ stats.count }} transaksi
        </span>
        <button
          @click="clearFilter"
          class="flex items-center gap-1 text-brand-600 font-medium hover:text-brand-700"
        >
          <X class="w-3 h-3" /> Hapus
        </button>
      </div>

      <!-- List -->
      <div
        v-if="!filteredTransactions.length"
        class="bg-white rounded-xl p-8 text-center border border-slate-200"
      >
        <Search class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm text-slate-500 mb-1">Tidak ada transaksi</p>
        <p class="text-xs text-slate-400">
          {{ hasActiveFilter ? 'Coba ubah filter atau hapus filter' : 'Belum ada transaksi di bulan ini' }}
        </p>
      </div>

      <div v-else class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <TransactionItem
          v-for="tx in filteredTransactions"
          :key="tx.id"
          :tx="tx"
          :category="catOf(tx.category_id)"
          :wallet="walletOf(tx.wallet_id)"
          :to-wallet="walletOf(tx.to_wallet_id)"
          :has-loan="hasLoan(tx.id)"
          @click="openDetail"
        />
      </div>
    </main>

    <TransactionFilterModal
      v-model="showFilter"
      :current-filter="filter"
      @apply="onApplyFilter"
    />

    <TransactionDetailModal
      v-model="showDetail"
      :tx="detailTx"
      @deleted="txStore.loadLocal()"
    />
  </div>
</template>