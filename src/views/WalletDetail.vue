cat > src/views/WalletDetail.vue << 'VUE_EOF'
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Pencil,
  TrendingUp,
  TrendingDown,
  ScrollText,
  ChevronRight,
  Wallet as WalletIcon,
  User,
  MoreVertical
} from 'lucide-vue-next'
import WalletFormModal from '../components/wallet/WalletFormModal.vue'
import WalletDebtInfo from '../components/wallet/WalletDebtInfo.vue'
import DebtPaymentModal from '../components/debt/DebtPaymentModal.vue'
import TransactionItem from '../components/transaction/TransactionItem.vue'
import TransactionDetailModal from '../components/transaction/TransactionDetailModal.vue'
import { useWalletStore } from '../stores/wallet'
import { useTransactionStore } from '../stores/transaction'
import { useCategoryStore } from '../stores/category'
import { getWalletDebts } from '../lib/wallet-debt'
import { formatCurrency } from '../lib/format'

const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()
const txStore = useTransactionStore()
const catStore = useCategoryStore()

const showEditForm = ref(false)
const showMoreMenu = ref(false)
const showDetail = ref(false)
const detailTx = ref(null)
const showPayment = ref(false)
const activeDebt = ref(null)

const walletId = computed(() => route.params.id)
const wallet = computed(() => walletStore.getById(walletId.value))
const isTemporary = computed(() => wallet.value?.is_temporary === true)

const balance = computed(() => {
  const map = txStore.balances(walletStore.wallets)
  return map[walletId.value] ?? 0
})

const debtsInfo = computed(() =>
  getWalletDebts(walletId.value, {
    debts: txStore.debts,
    wallets: walletStore.wallets
  })
)

const recentTransactions = computed(() => {
  if (isTemporary.value) return []
  return txStore.activeTransactions
    .filter(tx =>
      tx.wallet_id === walletId.value ||
      tx.to_wallet_id === walletId.value ||
      txStore.splits.some(
        s => s.transaction_id === tx.id && s.wallet_id === walletId.value
      )
    )
    .slice(0, 20)
})

const monthSummary = computed(() => {
  if (isTemporary.value) return { income: 0, expense: 0, net: 0 }
  const prefix = new Date().toISOString().slice(0, 7)
  let income = 0
  let expense = 0
  for (const tx of txStore.activeTransactions) {
    if (!tx.date?.startsWith(prefix)) continue
    if (tx.type === 'income' && tx.wallet_id === walletId.value) {
      income += Number(tx.amount)
    } else if (tx.type === 'expense') {
      const splits = txStore.splits.filter(s => s.transaction_id === tx.id)
      if (splits.length) {
        for (const s of splits) {
          if (s.wallet_id === walletId.value) expense += Number(s.amount)
        }
      } else if (tx.wallet_id === walletId.value) {
        expense += Number(tx.amount)
      }
    }
  }
  return { income, expense, net: income - expense }
})

onMounted(async () => {
  await Promise.all([
    walletStore.loadLocal(),
    txStore.loadLocal(),
    catStore.loadLocal()
  ])
})

function catOf(id) { return catStore.categories.find(c => c.id === id) || null }
function walletOf(id) { return walletStore.getById(id) }
function hasLoan(txId) {
  return txStore.splits.some(s => s.transaction_id === txId && s.is_loan)
}

function openDetail(tx) {
  detailTx.value = tx
  showDetail.value = true
}

function openDebtPayment(item) {
  activeDebt.value = item.debt
  showPayment.value = true
}

function openEdit() {
  showMoreMenu.value = false
  showEditForm.value = true
}

function onSaved() {
  walletStore.loadLocal()
  showEditForm.value = false
}

async function onDeleted() {
  showEditForm.value = false
  await walletStore.loadLocal()
  router.push({ name: 'wallets' })
}

function goTransactions() {
  router.push({ name: 'transactions' })
}
</script>

<template>
  <div class="min-h-screen pb-32">
    <header class="px-5 pt-6 pb-4 flex items-center gap-3">
      <button
        @click="router.push({ name: 'wallets' })"
        class="p-2 -ml-2 rounded-lg hover:bg-slate-100"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-xl font-bold truncate">{{ wallet?.name || 'Dompet' }}</h1>
        <p class="text-xs text-slate-500">
          {{ isTemporary ? 'Pihak Luar' : 'Detail dompet' }}
        </p>
      </div>
      <div v-if="!isTemporary" class="relative">
        <button
          @click="showMoreMenu = !showMoreMenu"
          class="p-2 rounded-lg hover:bg-slate-100"
        >
          <MoreVertical class="w-5 h-5 text-slate-600" />
        </button>
        <div
          v-if="showMoreMenu"
          class="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50"
        >
          <button
            @click="openEdit"
            class="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left text-sm"
          >
            <Pencil class="w-4 h-4 text-slate-500" /> Edit Dompet
          </button>
        </div>
      </div>
    </header>

    <main v-if="wallet" class="px-5 space-y-4">
      <section
        class="text-white rounded-2xl p-5 shadow-lg"
        :style="{
          background: isTemporary
            ? `linear-gradient(135deg, ${wallet.temporary_type === 'creditor' ? '#f97316' : '#10b981'}, ${wallet.temporary_type === 'creditor' ? '#ea580c' : '#059669'})`
            : `linear-gradient(135deg, ${wallet.color}, ${wallet.color}dd)`
        }"
      >
        <div class="flex items-center gap-2 mb-1">
          <component
            :is="isTemporary ? User : WalletIcon"
            class="w-4 h-4 opacity-80"
          />
          <p class="text-sm opacity-80">
            {{ isTemporary ? 'Status' : 'Saldo' }}
          </p>
        </div>
        <p v-if="!isTemporary" class="text-3xl font-bold mt-1">
          {{ formatCurrency(balance) }}
        </p>
        <p v-else class="text-2xl font-bold mt-1">
          {{ debtsInfo.totalUtang > 0
            ? 'Kita berutang ' + formatCurrency(debtsInfo.totalUtang)
            : debtsInfo.totalPiutang > 0
              ? 'Dia berutang ' + formatCurrency(debtsInfo.totalPiutang)
              : 'Lunas' }}
        </p>
      </section>

      <section v-if="!isTemporary" class="grid grid-cols-3 gap-2">
        <div class="bg-green-50 rounded-xl p-3 border border-green-100">
          <div class="flex items-center gap-1 text-[10px] text-green-700 font-medium mb-0.5">
            <TrendingUp class="w-3 h-3" /> Masuk
          </div>
          <p class="text-sm font-bold text-green-700">{{ formatCurrency(monthSummary.income) }}</p>
        </div>
        <div class="bg-red-50 rounded-xl p-3 border border-red-100">
          <div class="flex items-center gap-1 text-[10px] text-red-700 font-medium mb-0.5">
            <TrendingDown class="w-3 h-3" /> Keluar
          </div>
          <p class="text-sm font-bold text-red-700">{{ formatCurrency(monthSummary.expense) }}</p>
        </div>
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div class="text-[10px] text-slate-600 font-medium mb-0.5">Net</div>
          <p
            class="text-sm font-bold"
            :class="monthSummary.net >= 0 ? 'text-slate-900' : 'text-red-600'"
          >{{ formatCurrency(monthSummary.net) }}</p>
        </div>
      </section>

      <section>
        <h2 class="font-semibold mb-2">Utang & Piutang</h2>
        <WalletDebtInfo :data="debtsInfo" @item-click="openDebtPayment" />
      </section>

      <section v-if="!isTemporary">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Transaksi Terbaru</h2>
          <button
            @click="goTransactions"
            class="text-xs text-slate-500 hover:text-brand-600 font-medium flex items-center gap-1"
          >
            Lihat Semua <ChevronRight class="w-3 h-3" />
          </button>
        </div>

        <div
          v-if="!recentTransactions.length"
          class="bg-white rounded-xl p-6 text-center border border-slate-200"
        >
          <ScrollText class="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p class="text-sm text-slate-500">Belum ada transaksi</p>
        </div>

        <div v-else class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <TransactionItem
            v-for="tx in recentTransactions"
            :key="tx.id"
            :tx="tx"
            :category="catOf(tx.category_id)"
            :wallet="walletOf(tx.wallet_id)"
            :to-wallet="walletOf(tx.to_wallet_id)"
            :has-loan="hasLoan(tx.id)"
            @click="openDetail"
          />
        </div>
      </section>
    </main>

    <div v-else class="px-5">
      <div class="bg-white rounded-xl p-8 text-center border border-slate-200">
        <p class="text-sm text-slate-500">Dompet tidak ditemukan</p>
      </div>
    </div>

    <WalletFormModal
      v-model="showEditForm"
      :wallet="wallet"
      @saved="onSaved"
      @deleted="onDeleted"
    />

    <DebtPaymentModal
      v-model="showPayment"
      :debt="activeDebt"
      @saved="txStore.loadLocal()"
    />

    <TransactionDetailModal
      v-model="showDetail"
      :tx="detailTx"
      @deleted="txStore.loadLocal()"
    />
  </div>
</template>
VUE_EOF