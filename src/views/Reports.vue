<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet as WalletIcon,
  PieChart
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import MonthPicker from '../components/report/MonthPicker.vue'
import BarChart from '../components/report/BarChart.vue'
import { useTransactionStore } from '../stores/transaction'
import { useWalletStore } from '../stores/wallet'
import { useCategoryStore } from '../stores/category'
import { computeMonthlyReport, getAvailableMonths } from '../lib/report'
import { formatCurrency } from '../lib/format'

const router = useRouter()
const txStore = useTransactionStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()

const tab = ref('summary')
const now = new Date()
const selectedMonth = ref({ year: now.getFullYear(), month: now.getMonth() + 1 })

const availableMonths = computed(() => getAvailableMonths(txStore.activeTransactions))

const report = computed(() =>
  computeMonthlyReport({
    transactions: txStore.activeTransactions,
    wallets: walletStore.wallets,
    categories: catStore.categories,
    year: selectedMonth.value.year,
    month: selectedMonth.value.month
  })
)

const prevMonth = computed(() => {
  const { year, month } = selectedMonth.value
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
})

const prevReport = computed(() =>
  computeMonthlyReport({
    transactions: txStore.activeTransactions,
    wallets: walletStore.wallets,
    categories: catStore.categories,
    year: prevMonth.value.year,
    month: prevMonth.value.month
  })
)

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null
  return ((curr - prev) / prev) * 100
}

const incomeDelta = computed(() => pctChange(report.value.income, prevReport.value.income))
const expenseDelta = computed(() => pctChange(report.value.expense, prevReport.value.expense))

const incomeByCategory = computed(() =>
  report.value.byCategory.filter(c => c.type === 'income')
)
const expenseByCategory = computed(() =>
  report.value.byCategory.filter(c => c.type === 'expense')
)

const walletsByIncome = computed(() =>
  report.value.byWallet
    .filter(w => w.in > 0)
    .sort((a, b) => b.in - a.in)
    .map(w => ({ id: w.wallet_id, name: w.name, color: w.color, total: w.in }))
)

const walletsByExpense = computed(() =>
  report.value.byWallet
    .filter(w => w.out > 0)
    .sort((a, b) => b.out - a.out)
    .map(w => ({ id: w.wallet_id, name: w.name, color: w.color, total: w.out }))
)

function deltaText(delta) {
  if (delta === null) return null
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}% vs bulan lalu`
}

function deltaClass(delta, positiveIsGood = true) {
  if (delta === null || delta === 0) return 'text-slate-400'
  const isGood = positiveIsGood ? delta > 0 : delta < 0
  return isGood ? 'text-green-600' : 'text-red-600'
}

onMounted(async () => {
  await Promise.all([
    txStore.loadLocal(),
    walletStore.loadLocal(),
    catStore.loadLocal()
  ])

  // Auto-pilih bulan terbaru yang punya transaksi
  if (txStore.activeTransactions.length > 0) {
    for (const m of availableMonths.value) {
      const r = computeMonthlyReport({
        transactions: txStore.activeTransactions,
        wallets: walletStore.wallets,
        categories: catStore.categories,
        year: m.year,
        month: m.month
      })
      if (r.count > 0) {
        selectedMonth.value = m
        break
      }
    }
  }
})
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
      <div class="flex-1 min-w-0">
        <h1 class="text-xl font-bold">Laporan</h1>
        <p class="text-xs text-slate-500 truncate">Analisis keuangan bulanan</p>
      </div>
      <MonthPicker v-model="selectedMonth" :months="availableMonths" />
    </header>

    <main class="px-5 space-y-4">
      <!-- Tabs -->
      <div class="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
        <button
          :class="[
            'py-2 text-xs font-medium rounded-lg transition',
            tab === 'summary' ? 'bg-white shadow text-brand-600' : 'text-slate-600'
          ]"
          @click="tab = 'summary'"
        >Ringkasan</button>
        <button
          :class="[
            'py-2 text-xs font-medium rounded-lg transition',
            tab === 'category' ? 'bg-white shadow text-brand-600' : 'text-slate-600'
          ]"
          @click="tab = 'category'"
        >Kategori</button>
        <button
          :class="[
            'py-2 text-xs font-medium rounded-lg transition',
            tab === 'wallet' ? 'bg-white shadow text-brand-600' : 'text-slate-600'
          ]"
          @click="tab = 'wallet'"
        >Dompet</button>
      </div>

      <!-- Tab: Ringkasan -->
      <div v-if="tab === 'summary'" class="space-y-3">
        <section class="grid grid-cols-2 gap-2">
          <div class="bg-green-50 rounded-xl p-3 border border-green-100">
            <div class="flex items-center gap-1 text-[10px] text-green-700 font-medium mb-1">
              <TrendingUp class="w-3 h-3" /> Pemasukan
            </div>
            <p class="text-lg font-bold text-green-700">{{ formatCurrency(report.income) }}</p>
            <p
              v-if="incomeDelta !== null"
              class="text-[10px] mt-1 font-medium"
              :class="deltaClass(incomeDelta, true)"
            >{{ deltaText(incomeDelta) }}</p>
          </div>
          <div class="bg-red-50 rounded-xl p-3 border border-red-100">
            <div class="flex items-center gap-1 text-[10px] text-red-700 font-medium mb-1">
              <TrendingDown class="w-3 h-3" /> Pengeluaran
            </div>
            <p class="text-lg font-bold text-red-700">{{ formatCurrency(report.expense) }}</p>
            <p
              v-if="expenseDelta !== null"
              class="text-[10px] mt-1 font-medium"
              :class="deltaClass(expenseDelta, false)"
            >{{ deltaText(expenseDelta) }}</p>
          </div>
        </section>

        <section
          class="rounded-xl p-4 shadow-sm"
          :class="report.net >= 0
            ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white'
            : 'bg-gradient-to-br from-red-600 to-red-700 text-white'"
        >
          <p class="text-xs opacity-80">Net Bulan Ini (Pemasukan − Pengeluaran)</p>
          <p class="text-2xl font-bold mt-1">{{ formatCurrency(report.net) }}</p>
          <p class="text-[10px] opacity-70 mt-1">
            {{ report.net >= 0 ? 'Surplus' : 'Defisit' }} bulan ini
          </p>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <div class="flex items-center justify-between p-3 text-sm">
            <span class="text-slate-600 flex items-center gap-2">
              <PieChart class="w-4 h-4 text-slate-400" />
              Total transaksi
            </span>
            <span class="font-semibold text-slate-900">{{ report.count }}</span>
          </div>
          <div class="flex items-center justify-between p-3 text-sm">
            <span class="text-slate-600 flex items-center gap-2">
              <ArrowLeftRight class="w-4 h-4 text-slate-400" />
              Transfer antar dompet
            </span>
            <span class="font-semibold text-slate-900">{{ formatCurrency(report.transfer) }}</span>
          </div>
        </section>

        <div
          v-if="report.count === 0"
          class="bg-white rounded-xl p-8 text-center border border-slate-200"
        >
          <PieChart class="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p class="text-sm text-slate-500">Belum ada data di bulan ini</p>
          <p class="text-xs text-slate-400 mt-1">Coba pilih bulan lain di atas</p>
        </div>
      </div>

      <!-- Tab: Kategori -->
      <div v-if="tab === 'category'" class="space-y-3">
        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h3 class="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <TrendingDown class="w-4 h-4 text-red-600" /> Pengeluaran per Kategori
          </h3>
          <BarChart
            :items="expenseByCategory"
            color-class="bg-red-500"
            :show-icon="true"
            empty-text="Belum ada pengeluaran di bulan ini"
          />
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h3 class="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <TrendingUp class="w-4 h-4 text-green-600" /> Pemasukan per Kategori
          </h3>
          <BarChart
            :items="incomeByCategory"
            color-class="bg-green-500"
            :show-icon="true"
            empty-text="Belum ada pemasukan di bulan ini"
          />
        </section>
      </div>

      <!-- Tab: Dompet -->
      <div v-if="tab === 'wallet'" class="space-y-3">
        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h3 class="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <WalletIcon class="w-4 h-4 text-red-600" /> Pengeluaran per Dompet
          </h3>
          <BarChart
            :items="walletsByExpense"
            color-class="bg-red-500"
            empty-text="Belum ada pengeluaran di bulan ini"
          />
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h3 class="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <WalletIcon class="w-4 h-4 text-green-600" /> Pemasukan per Dompet
          </h3>
          <BarChart
            :items="walletsByIncome"
            color-class="bg-green-500"
            empty-text="Belum ada pemasukan di bulan ini"
          />
        </section>
      </div>
    </main>
  </div>
</template>