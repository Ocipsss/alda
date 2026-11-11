cat > src/views/Wallets.vue << 'VUE_EOF'
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Wallet as WalletIcon, ArrowLeft, User } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import WalletCard from '../components/wallet/WalletCard.vue'
import WalletFormModal from '../components/wallet/WalletFormModal.vue'
import { useWalletStore } from '../stores/wallet'
import { useTransactionStore } from '../stores/transaction'
import { formatCurrency } from '../lib/format'

const router = useRouter()
const walletStore = useWalletStore()
const txStore = useTransactionStore()

const showForm = ref(false)

const balances = computed(() => txStore.balances(walletStore.wallets))

const realWalletsWithBalance = computed(() =>
  walletStore.realWallets.map(w => ({
    ...w,
    balance: balances.value[w.id] ?? 0
  }))
)

const temporaryWalletsWithDebt = computed(() => {
  return walletStore.temporaryWallets.map(w => {
    const relatedDebts = txStore.activeDebts.filter(
      d =>
        Number(d.remaining) > 0 &&
        (d.debtor_wallet_id === w.id || d.creditor_wallet_id === w.id)
    )
    const totalRemaining = relatedDebts.reduce(
      (s, d) => s + Number(d.remaining),
      0
    )
    const direction = w.temporary_type === 'creditor' ? 'kita_hutang' : 'dia_hutang'
    return {
      wallet: w,
      totalRemaining,
      direction,
      debtCount: relatedDebts.length
    }
  }).filter(item => item.totalRemaining > 0)
})

const totalRealBalance = computed(() =>
  realWalletsWithBalance.value.reduce((s, w) => s + w.balance, 0)
)

onMounted(async () => {
  await Promise.all([
    walletStore.loadLocal(),
    txStore.loadLocal()
  ])
})

function openCreate() {
  showForm.value = true
}

function openDetail(wallet) {
  router.push({ name: 'wallet-detail', params: { id: wallet.id } })
}

function onSaved() {
  walletStore.loadLocal()
  showForm.value = false
}
</script>

<template>
  <div class="min-h-screen pb-32">
    <header class="px-5 pt-6 pb-4 flex items-center gap-3">
      <button
        @click="router.push({ name: 'dashboard' })"
        class="p-2 -ml-2 rounded-lg hover:bg-slate-100"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-bold">Dompet</h1>
        <p class="text-xs text-slate-500">Kelola dompet & pihak luar</p>
      </div>
    </header>

    <main class="px-5 space-y-4">
      <section class="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl p-5 shadow-lg">
        <p class="text-sm opacity-80">Total Saldo Aset</p>
        <p class="text-3xl font-bold mt-1">{{ formatCurrency(totalRealBalance) }}</p>
        <p class="text-xs opacity-70 mt-2">{{ realWalletsWithBalance.length }} dompet aktif</p>
      </section>

      <BaseButton class="w-full" @click="openCreate">
        <Plus class="w-4 h-4 inline mr-1" /> Tambah Dompet
      </BaseButton>

      <section>
        <h2 class="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">
          Dompet Saya ({{ realWalletsWithBalance.length }})
        </h2>

        <div
          v-if="!realWalletsWithBalance.length"
          class="bg-white rounded-xl p-8 text-center border border-slate-200"
        >
          <WalletIcon class="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p class="text-sm text-slate-500 mb-4">Belum ada dompet</p>
          <BaseButton size="sm" @click="openCreate">
            <Plus class="w-4 h-4 inline mr-1" /> Buat Dompet Pertama
          </BaseButton>
        </div>

        <div v-else class="space-y-2">
          <WalletCard
            v-for="w in realWalletsWithBalance"
            :key="w.id"
            :wallet="{ ...w, initial_balance: w.balance }"
            @click="openDetail(w)"
          />
        </div>
      </section>

      <section v-if="temporaryWalletsWithDebt.length">
        <h2 class="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">
          Pihak Luar ({{ temporaryWalletsWithDebt.length }})
        </h2>

        <div class="space-y-2">
          <button
            v-for="item in temporaryWalletsWithDebt"
            :key="item.wallet.id"
            @click="openDetail(item.wallet)"
            class="w-full flex items-center gap-3 p-4 bg-white rounded-xl border transition text-left"
            :class="item.direction === 'kita_hutang'
              ? 'border-orange-200 hover:border-orange-300'
              : 'border-emerald-200 hover:border-emerald-300'"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              :style="{
                background: (item.direction === 'kita_hutang' ? '#f97316' : '#10b981') + '20',
                color: item.direction === 'kita_hutang' ? '#f97316' : '#10b981'
              }"
            >
              <User class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-slate-900 truncate">{{ item.wallet.name }}</p>
              <p
                class="text-xs mt-0.5"
                :class="item.direction === 'kita_hutang' ? 'text-orange-600' : 'text-emerald-600'"
              >
                {{ item.direction === 'kita_hutang' ? 'Kita berutang' : 'Dia berutang' }}
                · {{ item.debtCount }} transaksi
              </p>
            </div>
            <p
              class="text-sm font-bold whitespace-nowrap"
              :class="item.direction === 'kita_hutang' ? 'text-orange-600' : 'text-emerald-600'"
            >
              {{ formatCurrency(item.totalRemaining) }}
            </p>
          </button>
        </div>
      </section>
    </main>

    <WalletFormModal
      v-model="showForm"
      :wallet="null"
      @saved="onSaved"
      @deleted="onSaved"
    />
  </div>
</template>
VUE_EOF