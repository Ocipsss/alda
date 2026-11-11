<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, HandCoins, TrendingDown, TrendingUp, ArrowLeft, CheckCircle2, Clock } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import DebtFormModal from '../components/debt/DebtFormModal.vue'
import DebtPaymentModal from '../components/debt/DebtPaymentModal.vue'
import { useTransactionStore } from '../stores/transaction'
import { useWalletStore } from '../stores/wallet'
import { DEBT_TYPE, DEBT_SOURCE, DEBT_TYPE_LABEL } from '../constants/debt'
import { formatCurrency, formatDate } from '../lib/format'

const router = useRouter()
const txStore = useTransactionStore()
const walletStore = useWalletStore()

const tab = ref(DEBT_TYPE.UTANG)
const showForm = ref(false)
const showPayment = ref(false)
const formType = ref(DEBT_TYPE.UTANG)
const activeDebt = ref(null)

const isUtangTab = computed(() => tab.value === DEBT_TYPE.UTANG)

const list = computed(() =>
  isUtangTab.value ? txStore.utangs : txStore.piutangs
)

const totalUtang = computed(() =>
  txStore.utangs.reduce((s, d) => s + Number(d.remaining), 0)
)
const totalPiutang = computed(() =>
  txStore.piutangs.reduce((s, d) => s + Number(d.remaining), 0)
)

onMounted(async () => {
  await txStore.loadLocal()
})

function openCreate(type) {
  formType.value = type
  showForm.value = true
}
function openPayment(debt) {
  activeDebt.value = debt
  showPayment.value = true
}
function isLunas(d) {
  return Number(d.remaining) <= 0
}
</script>

<template>
  <div class="min-h-screen pb-24">
    <header class="px-5 pt-6 pb-4 flex items-center gap-3">
      <button @click="router.push({ name: 'dashboard' })" class="p-2 -ml-2 rounded-lg hover:bg-slate-100">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-xl font-bold">Pinjaman</h1>
        <p class="text-xs text-slate-500">Utang & Piutang</p>
      </div>
    </header>

    <main class="px-5 space-y-4">
      <!-- Summary -->
      <section class="grid grid-cols-2 gap-3">
        <div class="bg-red-50 rounded-xl p-4 border border-red-100">
          <div class="flex items-center gap-1 text-xs text-red-700 font-medium mb-1">
            <TrendingDown class="w-3.5 h-3.5" /> Utang
          </div>
          <p class="text-lg font-bold text-red-700">{{ formatCurrency(totalUtang) }}</p>
        </div>
        <div class="bg-green-50 rounded-xl p-4 border border-green-100">
          <div class="flex items-center gap-1 text-xs text-green-700 font-medium mb-1">
            <TrendingUp class="w-3.5 h-3.5" /> Piutang
          </div>
          <p class="text-lg font-bold text-green-700">{{ formatCurrency(totalPiutang) }}</p>
        </div>
      </section>

      <!-- Tabs -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          :class="['py-2 text-sm font-medium rounded-lg transition', isUtangTab ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="tab = DEBT_TYPE.UTANG"
        >{{ DEBT_TYPE_LABEL.utang }} ({{ txStore.utangs.length }})</button>
        <button
          :class="['py-2 text-sm font-medium rounded-lg transition', tab === DEBT_TYPE.PIUTANG ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="tab = DEBT_TYPE.PIUTANG"
        >{{ DEBT_TYPE_LABEL.piutang }} ({{ txStore.piutangs.length }})</button>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <BaseButton class="flex-1" @click="openCreate(tab)">
          <Plus class="w-4 h-4 inline mr-1" />
          Catat {{ isUtangTab ? DEBT_TYPE_LABEL.utang : DEBT_TYPE_LABEL.piutang }}
        </BaseButton>
      </div>

      <!-- List -->
      <div v-if="!list.length" class="bg-white rounded-xl p-8 text-center border border-slate-200">
        <HandCoins class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm text-slate-500">
          Belum ada catatan {{ isUtangTab ? DEBT_TYPE_LABEL.utang.toLowerCase() : DEBT_TYPE_LABEL.piutang.toLowerCase() }}
        </p>
      </div>

      <div v-else class="space-y-2">
        <button
          v-for="d in list" :key="d.id"
          @click="openPayment(d)"
          :class="[
            'w-full text-left bg-white rounded-xl border p-4 transition',
            isLunas(d) ? 'border-green-200 opacity-70' : 'border-slate-200 hover:border-slate-300'
          ]"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="font-medium truncate">{{ d.party }}</p>
                <span
                  v-if="d.source === DEBT_SOURCE.INTERNAL"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium"
                >Internal</span>
              </div>
              <p v-if="d.note" class="text-xs text-slate-500 truncate mt-0.5">{{ d.note }}</p>
              <p v-if="d.due_date" class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock class="w-3 h-3" /> Jatuh tempo: {{ formatDate(d.due_date) }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p v-if="isLunas(d)" class="text-xs font-semibold text-green-600 flex items-center gap-1">
                <CheckCircle2 class="w-3.5 h-3.5" /> Lunas
              </p>
              <p v-else class="text-sm font-bold text-slate-900">{{ formatCurrency(d.remaining) }}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">dari {{ formatCurrency(d.principal) }}</p>
            </div>
          </div>
        </button>
      </div>
    </main>

    <DebtFormModal v-model="showForm" :default-type="formType" @saved="txStore.loadLocal()" />
    <DebtPaymentModal v-model="showPayment" :debt="activeDebt" @saved="txStore.loadLocal()" />
  </div>
</template>