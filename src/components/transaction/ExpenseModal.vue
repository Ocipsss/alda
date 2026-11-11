<script setup>
import { ref, watch, computed } from 'vue'
import {
  HandCoins,
  AlertCircle,
  Wallet as WalletIcon,
  CheckCircle2,
  TrendingDown
} from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import WalletSelect from '../ui/WalletSelect.vue'
import CategorySelect from '../ui/CategorySelect.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'
import { useCategoryStore } from '../../stores/category'
import { formatCurrency, formatDateISO } from '../../lib/format'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'saved'])

const txStore = useTransactionStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()

const saving = ref(false)

function emptyForm() {
  return {
    amount: '',
    date: formatDateISO(),
    category_id: null,
    note: '',
    primary: { wallet_id: null, amount: '' },
    talangan: [], // [{ wallet_id, amount, is_loan }]
    // Piutang mode
    isReceivable: false,
    party_name: '',
    due_date: ''
  }
}

const form = ref(emptyForm())

// --- Saldo snapshot ---
const balances = computed(() => txStore.balances(walletStore.wallets))

function balanceOf(walletId) {
  if (!walletId) return 0
  return Number(balances.value[walletId] ?? 0)
}

function walletOf(walletId) {
  return walletStore.wallets.find(w => w.id === walletId) || null
}

// --- Auto-balance: fill primary amount + talangan ---
function autoBalance() {
  const total = Number(form.value.amount || 0)
  const primaryId = form.value.primary.wallet_id

  if (total <= 0 || !primaryId) {
    form.value.primary.amount = ''
    form.value.talangan = []
    return
  }

  const primaryBal = balanceOf(primaryId)
  const primaryTake = Math.min(total, primaryBal)
  form.value.primary.amount = primaryTake

  let shortfall = total - primaryTake
  if (shortfall <= 0.01) {
    form.value.talangan = []
    return
  }

  const usedIds = new Set([primaryId])
  const talangan = []

  while (shortfall > 0.01) {
    const nextWallet = walletStore.realWallets.find(
      w => !usedIds.has(w.id) && balanceOf(w.id) > 0
    )
    if (!nextWallet) break

    const bal = balanceOf(nextWallet.id)
    const take = Math.min(shortfall, bal)

    talangan.push({
      wallet_id: nextWallet.id,
      amount: take,
      is_loan: true
    })

    usedIds.add(nextWallet.id)
    shortfall -= take
  }

  form.value.talangan = talangan
}

// Reset saat modal dibuka
watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = emptyForm()
    if (walletStore.realWallets.length === 1) {
      form.value.primary.wallet_id = walletStore.realWallets[0].id
    }
  }
})

// Trigger auto-balance saat amount atau primary wallet berubah
watch(
  () => [form.value.amount, form.value.primary.wallet_id],
  () => autoBalance()
)

// Kalau user aktifkan piutang mode, reset split payments (tidak boleh digabung)
watch(
  () => form.value.isReceivable,
  (isOn) => {
    if (isOn) {
      form.value.talangan = []
    }
  }
)

// --- Computed helpers ---
const hasSplitPayment = computed(() => form.value.talangan.length > 0)

const totalTalangan = computed(() =>
  form.value.talangan.reduce((s, t) => s + Number(t.amount || 0), 0)
)

const totalAssigned = computed(() =>
  Number(form.value.primary.amount || 0) + totalTalangan.value
)

const remaining = computed(() =>
  Number(form.value.amount || 0) - totalAssigned.value
)

const isBalanced = computed(() =>
  Number(form.value.amount) > 0 && Math.abs(remaining.value) < 0.01
)

const primaryShortfall = computed(() => {
  if (!form.value.primary.wallet_id) return 0
  const bal = balanceOf(form.value.primary.wallet_id)
  return Math.max(0, Number(form.value.amount || 0) - bal)
})

const showTalangan = computed(() =>
  form.value.talangan.length > 0 && Number(form.value.amount) > 0
)

const noMoreWallets = computed(() => {
  if (!form.value.primary.wallet_id) return false
  const usedIds = new Set([
    form.value.primary.wallet_id,
    ...form.value.talangan.map(t => t.wallet_id)
  ])
  return walletStore.realWallets.every(w => usedIds.has(w.id))
})

const balancePreview = computed(() => {
  const items = []
  if (form.value.primary.wallet_id && Number(form.value.primary.amount) > 0) {
    const w = walletOf(form.value.primary.wallet_id)
    if (w) {
      items.push({
        wallet_id: w.id,
        name: w.name,
        color: w.color,
        before: balanceOf(w.id),
        after: balanceOf(w.id) - Number(form.value.primary.amount)
      })
    }
  }
  for (const t of form.value.talangan) {
    if (!t.wallet_id || !Number(t.amount)) continue
    const w = walletOf(t.wallet_id)
    if (!w) continue
    items.push({
      wallet_id: w.id,
      name: w.name,
      color: w.color,
      before: balanceOf(w.id),
      after: balanceOf(w.id) - Number(t.amount)
    })
  }
  return items
})

const canSubmit = computed(() => {
  // Basic requirements
  if (
    Number(form.value.amount) <= 0 ||
    !form.value.category_id ||
    !form.value.primary.wallet_id ||
    Number(form.value.primary.amount) <= 0 ||
    !isBalanced.value
  ) {
    return false
  }

  // Piutang mode: wajib nama pihak
  if (form.value.isReceivable) {
    if (!form.value.party_name.trim()) return false
    // Tidak boleh ada split payment
    if (hasSplitPayment.value) return false
  }

  return true
})

// --- Submit ---
async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    if (form.value.isReceivable) {
      // Catat sebagai piutang ke pihak luar
      await txStore.createExpenseWithBorrower({
        amount: Number(form.value.amount),
        date: form.value.date,
        wallet_id: form.value.primary.wallet_id,
        category_id: form.value.category_id,
        note: form.value.note,
        party_name: form.value.party_name.trim(),
        due_date: form.value.due_date || null
      })
    } else {
      // Expense biasa (single / multi-wallet)
      const payments = [
        {
          wallet_id: form.value.primary.wallet_id,
          amount: Number(form.value.primary.amount),
          is_loan: false
        },
        ...form.value.talangan.map(t => ({
          wallet_id: t.wallet_id,
          amount: Number(t.amount),
          is_loan: t.is_loan
        }))
      ]

      await txStore.createExpense({
        amount: Number(form.value.amount),
        date: form.value.date,
        category_id: form.value.category_id,
        note: form.value.note,
        payments
      })
    }

    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}

// Saran dompet yang belum dipakai
const unusedWallets = computed(() => {
  const usedIds = new Set([
    form.value.primary.wallet_id,
    ...form.value.talangan.map(t => t.wallet_id)
  ].filter(Boolean))
  return walletStore.realWallets.filter(w => !usedIds.has(w.id))
})
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Tambah Pengeluaran"
    size="lg"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <!-- Total -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Total Pengeluaran</label>
        <input
          v-model.number="form.amount"
          type="number" inputmode="numeric" min="1" required
          placeholder="0"
          class="w-full px-4 py-3 text-lg font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <!-- Tanggal -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
        <input
          v-model="form.date" type="date" required
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <!-- Kategori -->
      <CategorySelect
        v-model="form.category_id"
        :categories="catStore.expenseCategories"
        label="Kategori"
      />

      <!-- Dompet Utama -->
      <div class="space-y-2">
        <WalletSelect
          v-model="form.primary.wallet_id"
          :wallets="walletStore.realWallets"
          label="Dompet Utama"
        />

        <div v-if="form.primary.wallet_id" class="bg-slate-50 rounded-xl p-3 space-y-2">
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">Saldo tersedia</span>
            <span class="font-medium text-slate-700">
              {{ formatCurrency(balanceOf(form.primary.wallet_id)) }}
            </span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Nominal dipakai</label>
            <input
              v-model.number="form.primary.amount"
              type="number" inputmode="numeric" min="0"
              placeholder="0"
              class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <p
            v-if="primaryShortfall > 0"
            class="text-xs text-red-600 flex items-center gap-1"
          >
            <AlertCircle class="w-3 h-3" />
            Saldo kurang {{ formatCurrency(primaryShortfall) }}
          </p>
        </div>
      </div>

      <!-- Talangan (muncul otomatis kalau saldo kurang) -->
      <div v-if="showTalangan" class="space-y-3">
        <div class="flex items-center gap-2 text-sm font-medium text-amber-700">
          <HandCoins class="w-4 h-4" />
          Dompet Talangan
        </div>

        <div
          v-for="(t, i) in form.talangan"
          :key="i"
          class="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2"
        >
          <div class="text-xs text-amber-800 font-medium">
            Talangan {{ i + 1 }}
          </div>

          <WalletSelect
            v-model="t.wallet_id"
            :wallets="walletStore.realWallets"
            :exclude="[
              form.primary.wallet_id,
              ...form.talangan.filter((_, idx) => idx !== i).map(x => x.wallet_id)
            ].filter(Boolean)"
            label=""
          />

          <div class="flex justify-between text-xs">
            <span class="text-slate-500">Saldo tersedia</span>
            <span class="font-medium text-slate-700">
              {{ formatCurrency(balanceOf(t.wallet_id)) }}
            </span>
          </div>

          <input
            v-model.number="t.amount"
            type="number" inputmode="numeric" min="1"
            placeholder="Nominal talangan"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <div class="flex items-center justify-between pt-1">
            <div>
              <p class="text-xs font-medium text-slate-700">Tandai sebagai Pinjaman</p>
              <p class="text-[10px] text-slate-500 mt-0.5">
                {{ t.is_loan ? 'Dompet ini berutang ke dompet utama' : 'Beban dibagi biasa' }}
              </p>
            </div>
            <button
              type="button"
              @click="t.is_loan = !t.is_loan"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0',
                t.is_loan ? 'bg-amber-500' : 'bg-slate-300'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition',
                  t.is_loan ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>

        <div
          v-if="remaining > 0.01 && noMoreWallets"
          class="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700"
        >
          <p class="font-medium mb-1 flex items-center gap-1">
            <AlertCircle class="w-3 h-3" />
            Saldo tidak cukup
          </p>
          <p>Semua dompet sudah terpakai, masih kurang {{ formatCurrency(remaining) }}</p>
        </div>
      </div>

      <!-- Checkbox: catat sebagai piutang -->
      <div
        class="border rounded-xl p-3 space-y-3 transition"
        :class="hasSplitPayment
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : 'bg-emerald-50 border-emerald-200'"
      >
        <label class="flex items-start gap-2 cursor-pointer" :class="{ 'cursor-not-allowed': hasSplitPayment }">
          <input
            v-model="form.isReceivable"
            type="checkbox"
            :disabled="hasSplitPayment"
            class="mt-0.5 accent-emerald-600"
          />
          <span class="flex-1">
            <span class="flex items-center gap-1 font-medium text-sm"
              :class="hasSplitPayment ? 'text-slate-500' : 'text-emerald-900'">
              <TrendingDown class="w-4 h-4" />
              Catat sebagai piutang ke pihak luar
            </span>
            <span class="block text-xs mt-0.5"
              :class="hasSplitPayment ? 'text-slate-400' : 'text-emerald-700'">
              {{ hasSplitPayment
                ? 'Tidak bisa digabung dengan split payment (dompet talangan)'
                : 'Uang keluar sekarang, tapi tercatat sebagai piutang ke pihak lain.' }}
            </span>
          </span>
        </label>

        <template v-if="form.isReceivable && !hasSplitPayment">
          <div>
            <label class="block text-xs font-medium text-emerald-900 mb-1">
              Nama Pihak <span class="text-red-600">*</span>
            </label>
            <input
              v-model="form.party_name"
              type="text"
              placeholder="Contoh: Andi, Koperasi Maju"
              class="w-full px-3 py-2 rounded-lg border border-emerald-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-emerald-900 mb-1">
              Jatuh Tempo (opsional)
            </label>
            <input
              v-model="form.due_date"
              type="date"
              class="w-full px-3 py-2 rounded-lg border border-emerald-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </template>
      </div>

      <!-- Summary -->
      <div class="bg-slate-100 rounded-xl p-3 text-sm space-y-1">
        <div class="flex justify-between">
          <span class="text-slate-600">Total belanja</span>
          <span class="font-medium">{{ formatCurrency(form.amount) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Dialokasikan</span>
          <span class="font-medium">{{ formatCurrency(totalAssigned) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Sisa</span>
          <span
            :class="isBalanced ? 'text-green-600' : 'text-red-600'"
            class="font-semibold flex items-center gap-1"
          >
            <CheckCircle2 v-if="isBalanced" class="w-3 h-3" />
            {{ formatCurrency(remaining) }}
          </span>
        </div>
      </div>

      <!-- Preview saldo -->
      <div
        v-if="balancePreview.length > 0"
        class="bg-white border border-slate-200 rounded-xl p-3 space-y-2"
      >
        <p class="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
          <WalletIcon class="w-3 h-3" /> Preview Saldo
        </p>
        <div
          v-for="item in balancePreview"
          :key="item.wallet_id"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-slate-700 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :style="{ background: item.color }" />
            {{ item.name }}
          </span>
          <span class="text-xs text-slate-500">
            {{ formatCurrency(item.before) }}
            <span class="mx-1">→</span>
            <span
              class="font-medium"
              :class="item.after < 0 ? 'text-red-600' : 'text-slate-900'"
            >
              {{ formatCurrency(item.after) }}
            </span>
          </span>
        </div>
      </div>

      <!-- Catatan -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Catatan (opsional)</label>
        <textarea
          v-model="form.note" rows="2"
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex gap-2">
        <div class="flex-1" />
        <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Batal</BaseButton>
        <BaseButton :loading="saving" :disabled="!canSubmit" @click="submit">Simpan</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>