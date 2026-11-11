<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Wallet as WalletIcon,
  ScrollText,
  ArrowRight,
  RefreshCw
} from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import WalletCard from '../components/wallet/WalletCard.vue'
import WalletFormModal from '../components/wallet/WalletFormModal.vue'
import IncomeModal from '../components/transaction/IncomeModal.vue'
import ExpenseModal from '../components/transaction/ExpenseModal.vue'
import TransferModal from '../components/transaction/TransferModal.vue'
import TransactionItem from '../components/transaction/TransactionItem.vue'
import TransactionDetailModal from '../components/transaction/TransactionDetailModal.vue'
import FabMenu from '../components/layout/FabMenu.vue'
import { useAuthStore } from '../stores/auth'
import { useWalletStore } from '../stores/wallet'
import { useCategoryStore } from '../stores/category'
import { useTransactionStore } from '../stores/transaction'
import { useAutoSync } from '../composables/useAutoSync'
import { seedCategories } from '../db/seed'
import { formatCurrency } from '../lib/format'
import { computeTotalReal } from '../lib/balance'

const auth = useAuthStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()
const txStore = useTransactionStore()
const router = useRouter()

// Sync lifecycle global (timer + event online) — dipasang sekali di App.vue
const { syncing, syncAll } = useAutoSync()

const showWalletForm = ref(false)
const showIncome = ref(false)
const showExpense = ref(false)
const showTransfer = ref(false)
const showDetail = ref(false)
const detailTx = ref(null)
const bootstrapped = ref(false)

// ============ COMPUTED ============

const balances = computed(() => txStore.balances(walletStore.wallets))

// Hanya wallet real (bukan temporer)
const realWalletsWithBalance = computed(() =>
  walletStore.realWallets.map(w => ({
    ...w,
    balance: balances.value[w.id] ?? 0
  }))
)

// Total saldo aset riil (exclude wallet temporer)
const totalBalance = computed(() =>
  computeTotalReal(balances.value, walletStore.wallets)
)

const recentTx = computed(() => txStore.activeTransactions.slice(0, 15))

// Initial loading: setelah bootstrapped, kalau data kosong & masih syncing
// → tampilkan skeleton. Begitu sync selesai, kalau memang kosong tetap kosong.
const isInitialLoading = computed(() =>
  bootstrapped.value &&
  syncing.value &&
  realWalletsWithBalance.value.length === 0 &&
  recentTx.value.length === 0
)

// ============ HELPERS ============

function catOf(id) { return catStore.categories.find(c => c.id === id) || null }
function walletOf(id) { return walletStore.wallets.find(w => w.id === id) || null }
function hasLoan(txId) {
  return txStore.splits.some(s => s.transaction_id === txId && s.is_loan)
}

// ============ NAVIGATION ============

function goWalletDetail(w) {
  router.push({ name: 'wallet-detail', params: { id: w.id } })
}

function openCreateWallet() {
  showWalletForm.value = true
}

function openDetail(tx) {
  detailTx.value = tx
  showDetail.value = true
}

// ============ LIFECYCLE ============

onMounted(async () => {
  if (auth.user) await seedCategories(auth.user.id)
  await Promise.all([
    walletStore.loadLocal(),
    catStore.loadLocal(),
    txStore.loadLocal()
  ])
  bootstrapped.value = true
})
</script>

<template>
  <div class="min-h-screen pb-32">
    <header class="px-5 pt-6 pb-4 flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold">Alda</h1>
        <p class="text-xs text-slate-500 truncate max-w-[220px]">{{ auth.user?.email }}</p>
      </div>
      <button
        class="p-2 rounded-lg hover:bg-slate-100 transition"
        @click="syncAll"
        :disabled="syncing"
        title="Sync manual"
      >
        <RefreshCw
          class="w-5 h-5 text-slate-500"
          :class="{ 'animate-spin': syncing }"
        />
      </button>
    </header>

    <main class="px-5 space-y-5">
      <!-- Skeleton loading -->
      <template v-if="isInitialLoading">
        <section class="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-5 shadow-lg">
          <div class="h-3 w-32 bg-white/20 rounded animate-pulse mb-2" />
          <div class="h-8 w-48 bg-white/20 rounded animate-pulse mb-3" />
          <div class="h-2 w-24 bg-white/20 rounded animate-pulse" />
        </section>

        <section>
          <div class="h-5 w-20 bg-slate-200 rounded animate-pulse mb-3" />
          <div class="space-y-2">
            <div
              v-for="i in 2"
              :key="i"
              class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"
            >
              <div class="w-11 h-11 rounded-xl bg-slate-200 animate-pulse shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                <div class="h-3 w-16 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        <p class="text-xs text-center text-slate-400 py-4">
          Memuat data dari server...
        </p>
      </template>

      <!-- Normal content -->
      <template v-else>
        <!-- Total Balance -->
        <section class="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl p-5 shadow-lg">
          <p class="text-sm opacity-80">Total Saldo Aset</p>
          <p class="text-3xl font-bold mt-1">{{ formatCurrency(totalBalance) }}</p>
          <p class="text-xs opacity-70 mt-2">{{ realWalletsWithBalance.length }} dompet aktif</p>
        </section>

        <!-- Wallets -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold">Dompet</h2>
            <button
              class="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 font-medium transition"
              @click="router.push({ name: 'wallets' })"
            >
              Kelola <ArrowRight class="w-3 h-3" />
            </button>
          </div>

          <!-- Empty state: belum punya dompet sama sekali -->
          <div
            v-if="!realWalletsWithBalance.length"
            class="bg-white rounded-xl p-8 text-center border border-slate-200"
          >
            <WalletIcon class="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p class="text-sm text-slate-500 mb-4">Belum ada dompet</p>
            <BaseButton size="sm" @click="openCreateWallet">
              <Plus class="w-4 h-4 inline mr-1" /> Buat Dompet Pertama
            </BaseButton>
          </div>

          <!-- Wallet list (klik untuk buka detail) -->
          <div v-else class="space-y-2">
            <WalletCard
              v-for="w in realWalletsWithBalance"
              :key="w.id"
              :wallet="{ ...w, initial_balance: w.balance }"
              @click="goWalletDetail(w)"
            />
          </div>
        </section>

        <!-- Recent Transactions -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold">Riwayat Transaksi</h2>
            <button
              class="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 font-medium transition"
              @click="router.push({ name: 'transactions' })"
            >
              Lihat Semua <ArrowRight class="w-3 h-3" />
            </button>
          </div>

          <div
            v-if="!recentTx.length"
            class="bg-white rounded-xl p-8 text-center border border-slate-200"
          >
            <ScrollText class="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p class="text-sm text-slate-500">Belum ada transaksi</p>
          </div>

          <div v-else class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            <TransactionItem
              v-for="tx in recentTx" :key="tx.id"
              :tx="tx"
              :category="catOf(tx.category_id)"
              :wallet="walletOf(tx.wallet_id)"
              :to-wallet="walletOf(tx.to_wallet_id)"
              :has-loan="hasLoan(tx.id)"
              @click="openDetail"
            />
          </div>
        </section>
      </template>
    </main>

    <FabMenu
      @income="showIncome = true"
      @expense="showExpense = true"
      @transfer="showTransfer = true"
    />

    <!-- Wallet form modal (hanya untuk empty state create pertama) -->
    <WalletFormModal
      v-model="showWalletForm"
      :wallet="null"
      @saved="walletStore.loadLocal()"
      @deleted="walletStore.loadLocal()"
    />

    <IncomeModal v-model="showIncome" @saved="txStore.loadLocal()" />
    <ExpenseModal v-model="showExpense" @saved="txStore.loadLocal()" />
    <TransferModal v-model="showTransfer" @saved="txStore.loadLocal()" />
    <TransactionDetailModal
      v-model="showDetail"
      :tx="detailTx"
      @deleted="txStore.loadLocal()"
    />
  </div>
</template>