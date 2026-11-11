<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Wallet as WalletIcon, LogOut, RefreshCw, ScrollText, HandCoins } from 'lucide-vue-next'
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

const auth = useAuthStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()
const txStore = useTransactionStore()
const router = useRouter()

// Sync lifecycle global (timer + event online) — dipasang sekali di App.vue
// Di sini cukup akses `syncing` state & trigger manual lewat `syncAll`.
const { syncing, syncAll } = useAutoSync()

const showWalletForm = ref(false)
const showIncome = ref(false)
const showExpense = ref(false)
const showTransfer = ref(false)
const showDetail = ref(false)
const editingWallet = ref(null)
const detailTx = ref(null)

const balances = computed(() => txStore.balances(walletStore.wallets))
const walletsWithBalance = computed(() =>
  walletStore.activeWallets.map(w => ({ ...w, balance: balances.value[w.id] ?? 0 }))
)
const totalBalance = computed(() =>
  Object.values(balances.value).reduce((a, b) => a + b, 0)
)
const recentTx = computed(() => txStore.activeTransactions.slice(0, 15))

function catOf(id) { return catStore.categories.find(c => c.id === id) || null }
function walletOf(id) { return walletStore.wallets.find(w => w.id === id) || null }
function hasLoan(txId) { return txStore.splits.some(s => s.transaction_id === txId && s.is_loan) }

function openCreateWallet() { editingWallet.value = null; showWalletForm.value = true }
function openEditWallet(w) { editingWallet.value = w; showWalletForm.value = true }
function openDetail(tx) { detailTx.value = tx; showDetail.value = true }

async function logout() {
  await auth.signOut()
  router.push({ name: 'login' })
}

onMounted(async () => {
  if (auth.user) await seedCategories(auth.user.id)
  await Promise.all([
    walletStore.loadLocal(),
    catStore.loadLocal(),
    txStore.loadLocal()
  ])
})
</script>

<template>
  <div class="min-h-screen pb-24">
    <header class="px-5 pt-6 pb-4 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold">Alda</h1>
        <p class="text-xs text-slate-500 truncate max-w-[220px]">{{ auth.user?.email }}</p>
      </div>
      <div class="flex gap-1">
        <button class="p-2 rounded-lg hover:bg-slate-100" @click="router.push({ name: 'debts' })" title="Pinjaman">
          <HandCoins class="w-5 h-5 text-slate-600" />
        </button>
        <button class="p-2 rounded-lg hover:bg-slate-100" @click="syncAll">
          <RefreshCw class="w-5 h-5 text-slate-600" :class="{ 'animate-spin': syncing }" />
        </button>
        <button class="p-2 rounded-lg hover:bg-slate-100" @click="logout">
          <LogOut class="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </header>

    <main class="px-5 space-y-5">
      <section class="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl p-5 shadow-lg">
        <p class="text-sm opacity-80">Total Saldo Gabungan</p>
        <p class="text-3xl font-bold mt-1">{{ formatCurrency(totalBalance) }}</p>
        <p class="text-xs opacity-70 mt-2">{{ walletsWithBalance.length }} dompet aktif</p>
      </section>

      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">Dompet</h2>
          <button
            class="flex items-center gap-1 text-sm text-brand-600 font-medium"
            @click="openCreateWallet"
          >
            <Plus class="w-4 h-4" /> Tambah
          </button>
        </div>

        <div v-if="!walletsWithBalance.length" class="bg-white rounded-xl p-8 text-center border border-slate-200">
          <WalletIcon class="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p class="text-sm text-slate-500 mb-4">Belum ada dompet</p>
          <BaseButton size="sm" @click="openCreateWallet">
            <Plus class="w-4 h-4 inline mr-1" /> Tambah Dompet
          </BaseButton>
        </div>

        <div v-else class="space-y-2">
          <div v-for="w in walletsWithBalance" :key="w.id" class="relative">
            <WalletCard :wallet="{ ...w, initial_balance: w.balance }" @click="openEditWallet(w)" />
          </div>
        </div>
      </section>

      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">Riwayat Transaksi</h2>
        </div>

        <div v-if="!recentTx.length" class="bg-white rounded-xl p-8 text-center border border-slate-200">
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
    </main>

    <FabMenu
      @income="showIncome = true"
      @expense="showExpense = true"
      @transfer="showTransfer = true"
    />

    <WalletFormModal
      v-model="showWalletForm"
      :wallet="editingWallet"
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