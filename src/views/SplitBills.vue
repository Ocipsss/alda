<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, ArrowLeft, ArrowRight, HandCoins, Split, Filter } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import SplitBillFormModal from '../components/split-bill/SplitBillFormModal.vue'
import TransactionDetailModal from '../components/transaction/TransactionDetailModal.vue'
import { useTransactionStore } from '../stores/transaction'
import { useWalletStore } from '../stores/wallet'
import { useCategoryStore } from '../stores/category'
import { formatCurrency, formatDate } from '../lib/format'

const router = useRouter()
const txStore = useTransactionStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()

const showForm = ref(false)
const showDetail = ref(false)
const detailTx = ref(null)
const filterMode = ref('all') // 'all' | 'loan' | 'no-loan'

// Filter: transaksi expense yang punya >1 split
const splitPayments = computed(() => {
  const result = []
  for (const tx of txStore.activeTransactions) {
    if (tx.type !== 'expense') continue
    const splits = txStore.splits.filter(s => s.transaction_id === tx.id)
    if (splits.length < 2) continue

    const hasLoan = splits.some(s => s.is_loan)

    if (filterMode.value === 'loan' && !hasLoan) continue
    if (filterMode.value === 'no-loan' && hasLoan) continue

    result.push({ tx, splits, hasLoan })
  }
  return result
})

// Hitung total split payments & total pinjaman
const stats = computed(() => {
  let totalAmount = 0
  let totalLoan = 0
  for (const item of splitPayments.value) {
    totalAmount += Number(item.tx.amount)
    for (const s of item.splits) {
      if (s.is_loan) totalLoan += Number(s.amount)
    }
  }
  return { totalAmount, totalLoan, count: splitPayments.value.length }
})

onMounted(async () => {
  await Promise.all([
    txStore.loadLocal(),
    walletStore.loadLocal(),
    catStore.loadLocal()
  ])
})

function walletName(id) {
  return walletStore.wallets.find(w => w.id === id)?.name || '—'
}

function categoryName(id) {
  return catStore.categories.find(c => c.id === id)?.name || 'Transaksi'
}

function openDetail(tx) {
  detailTx.value = tx
  showDetail.value = true
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
      <div>
        <h1 class="text-xl font-bold">Split Payment</h1>
        <p class="text-xs text-slate-500">Pembayaran multi-wallet</p>
      </div>
    </header>

    <main class="px-5 space-y-4">
      <!-- Summary -->
      <section class="grid grid-cols-2 gap-3">
        <div class="bg-brand-50 rounded-xl p-4 border border-brand-100">
          <div class="flex items-center gap-1 text-xs text-brand-700 font-medium mb-1">
            <Split class="w-3.5 h-3.5" /> Total Split
          </div>
          <p class="text-lg font-bold text-brand-700">{{ formatCurrency(stats.totalAmount) }}</p>
          <p class="text-[10px] text-brand-600 mt-0.5">{{ stats.count }} transaksi</p>
        </div>
        <div class="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div class="flex items-center gap-1 text-xs text-amber-700 font-medium mb-1">
            <HandCoins class="w-3.5 h-3.5" /> Total Pinjaman
          </div>
          <p class="text-lg font-bold text-amber-700">{{ formatCurrency(stats.totalLoan) }}</p>
          <p class="text-[10px] text-amber-600 mt-0.5">Internal debt</p>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex gap-2">
        <BaseButton class="flex-1" @click="showForm = true">
          <Plus class="w-4 h-4 inline mr-1" /> Split Payment Baru
        </BaseButton>
      </div>

      <!-- Filter -->
      <div class="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
        <button
          :class="[
            'py-2 text-xs font-medium rounded-lg transition',
            filterMode === 'all' ? 'bg-white shadow text-brand-600' : 'text-slate-600'
          ]"
          @click="filterMode = 'all'"
        >Semua</button>
        <button
          :class="[
            'py-2 text-xs font-medium rounded-lg transition',
            filterMode === 'loan' ? 'bg-white shadow text-amber-600' : 'text-slate-600'
          ]"
          @click="filterMode = 'loan'"
        >Dengan Pinjaman</button>
        <button
          :class="[
            'py-2 text-xs font-medium rounded-lg transition',
            filterMode === 'no-loan' ? 'bg-white shadow text-slate-700' : 'text-slate-600'
          ]"
          @click="filterMode = 'no-loan'"
        >Tanpa Pinjaman</button>
      </div>

      <!-- List -->
      <div v-if="!splitPayments.length" class="bg-white rounded-xl p-8 text-center border border-slate-200">
        <Split class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm text-slate-500 mb-1">Belum ada split payment</p>
        <p class="text-xs text-slate-400">
          {{ filterMode !== 'all' ? 'Coba ubah filter' : 'Split payment muncul saat transaksi dibayar dari >1 dompet' }}
        </p>
      </div>

      <div v-else class="space-y-2">
        <button
          v-for="item in splitPayments"
          :key="item.tx.id"
          @click="openDetail(item.tx)"
          class="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="font-medium text-sm truncate">{{ categoryName(item.tx.category_id) }}</p>
                <HandCoins v-if="item.hasLoan" class="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>
              <p class="text-xs text-slate-500 mt-0.5">{{ formatDate(item.tx.date) }}</p>
            </div>
            <p class="text-sm font-bold text-slate-900 whitespace-nowrap">
              {{ formatCurrency(item.tx.amount) }}
            </p>
          </div>

          <!-- Breakdown per wallet -->
          <div class="space-y-1 pt-2 border-t border-slate-100">
            <div
              v-for="s in item.splits"
              :key="s.id"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-slate-600 flex items-center gap-1">
                {{ walletName(s.wallet_id) }}
                <span
                  v-if="s.is_loan"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium"
                >Pinjam</span>
              </span>
              <span class="font-medium text-slate-700">
                −{{ formatCurrency(s.amount) }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </main>

    <SplitBillFormModal v-model="showForm" @saved="txStore.loadLocal()" />
    <TransactionDetailModal
      v-model="showDetail"
      :tx="detailTx"
      @deleted="txStore.loadLocal()"
    />
  </div>
</template>