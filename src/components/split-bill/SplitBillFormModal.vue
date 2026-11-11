<script setup>
import { ref, watch, computed } from 'vue'
import { Plus, Trash2, HandCoins, AlertCircle, CheckCircle2, Wallet as WalletIcon } from 'lucide-vue-next'
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
const form = ref(emptyForm())

function emptyForm() {
  return {
    amount: '',
    date: formatDateISO(),
    category_id: null,
    note: '',
    payments: [{ wallet_id: null, amount: '', is_loan: false }]
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = emptyForm()
    if (walletStore.activeWallets.length === 1) {
      form.value.payments[0].wallet_id = walletStore.activeWallets[0].id
    }
  }
})

// Balances snapshot untuk preview & saran
const balances = computed(() => txStore.balances(walletStore.wallets))

function balanceOf(walletId) {
  return Number(balances.value[walletId] ?? 0)
}

function walletOf(walletId) {
  return walletStore.wallets.find(w => w.id === walletId) || null
}

// Total alokasi dari semua payment
const totalPaid = computed(() =>
  form.value.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
)

// Sisa yang belum dialokasikan
const remaining = computed(() => Number(form.value.amount || 0) - totalPaid.value)

// Apakah alokasi pas?
const isBalanced = computed(() =>
  Number(form.value.amount) > 0 && Math.abs(remaining.value) < 0.01
)

// Deteksi: dompet utama kurang?
const primaryShortfall = computed(() => {
  const primary = form.value.payments[0]
  if (!primary?.wallet_id) return 0
  const allocated = Number(primary.amount || 0)
  const balance = balanceOf(primary.wallet_id)
  return Math.max(0, allocated - balance)
})

// Preview saldo after-transaction per dompet
const balancePreview = computed(() => {
  const usedWallets = new Set()
  const result = []
  for (const p of form.value.payments) {
    if (!p.wallet_id || !Number(p.amount)) continue
    const wallet = walletOf(p.wallet_id)
    if (!wallet) continue
    usedWallets.add(p.wallet_id)
    result.push({
      wallet_id: p.wallet_id,
      name: wallet.name,
      color: wallet.color,
      before: balanceOf(p.wallet_id),
      after: balanceOf(p.wallet_id) - Number(p.amount),
      delta: -Number(p.amount)
    })
  }
  return result
})

// Validasi form
const canSubmit = computed(() =>
  Number(form.value.amount) > 0 &&
  form.value.category_id &&
  isBalanced.value &&
  form.value.payments.every(p => p.wallet_id && Number(p.amount) > 0)
)

// Saran: kalau primary kurang, cari dompet lain yang bisa menutup
const suggestedWallet = computed(() => {
  if (primaryShortfall.value <= 0) return null
  const usedIds = new Set(form.value.payments.map(p => p.wallet_id).filter(Boolean))
  const primary = form.value.payments[0]
  const candidates = walletStore.activeWallets.filter(w =>
    w.id !== primary.wallet_id &&
    !usedIds.has(w.id) &&
    balanceOf(w.id) >= primaryShortfall.value
  )
  return candidates[0] || null
})

// Fungsi helper: tutup kekurangan dengan dompet tertentu
function closeWithSuggested() {
  const suggested = suggestedWallet.value
  if (!suggested) return
  const shortfall = primaryShortfall.value
  form.value.payments.push({
    wallet_id: suggested.id,
    amount: shortfall,
    is_loan: true // default: pinjam
  })
  // Kurangi alokasi primary supaya pas dengan saldo
  form.value.payments[0].amount = balanceOf(form.value.payments[0].wallet_id)
}

function addPayment() {
  form.value.payments.push({ wallet_id: null, amount: '', is_loan: false })
}

function removePayment(i) {
  if (form.value.payments.length <= 1) return
  form.value.payments.splice(i, 1)
}

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await txStore.createExpense({
      amount: Number(form.value.amount),
      date: form.value.date,
      category_id: form.value.category_id,
      note: form.value.note,
      payments: form.value.payments.map(p => ({
        wallet_id: p.wallet_id,
        amount: Number(p.amount),
        is_loan: p.is_loan
      }))
    })
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Split Payment"
    size="lg"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <!-- Total Belanja -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Total Belanja</label>
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

      <!-- Sumber Pembayaran -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-slate-700">Sumber Pembayaran</label>
          <button
            type="button"
            @click="addPayment"
            class="text-xs text-brand-600 font-medium flex items-center gap-1"
          >
            <Plus class="w-3 h-3" /> Tambah Dompet
          </button>
        </div>

        <div
          v-for="(p, i) in form.payments"
          :key="i"
          class="bg-slate-50 rounded-xl p-3 space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-500">
              {{ i === 0 ? 'Dompet Utama' : `Dompet Penutup ${i}` }}
            </span>
            <button
              v-if="form.payments.length > 1"
              type="button"
              class="text-red-500 p-1"
              @click="removePayment(i)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <WalletSelect
            v-model="p.wallet_id"
            :wallets="walletStore.activeWallets"
            :exclude="form.payments.filter((_, idx) => idx !== i).map(x => x.wallet_id).filter(Boolean)"
            label=""
          />

          <!-- Saldo info -->
          <div v-if="p.wallet_id" class="flex items-center justify-between text-xs">
            <span class="text-slate-500">Saldo tersedia:</span>
            <span
              class="font-medium"
              :class="balanceOf(p.wallet_id) < Number(p.amount || 0) ? 'text-red-600' : 'text-slate-700'"
            >
              {{ formatCurrency(balanceOf(p.wallet_id)) }}
            </span>
          </div>

          <input
            v-model.number="p.amount"
            type="number" inputmode="numeric" min="1" placeholder="Nominal dari dompet ini"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <!-- Warning saldo kurang -->
          <p
            v-if="p.wallet_id && Number(p.amount) > balanceOf(p.wallet_id)"
            class="text-xs text-red-600 flex items-center gap-1"
          >
            <AlertCircle class="w-3 h-3" />
            Saldo kurang {{ formatCurrency(Number(p.amount) - balanceOf(p.wallet_id)) }}
          </p>

          <!-- Loan checkbox (hanya untuk dompet penutup) -->
          <label v-if="i > 0" class="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
            <input v-model="p.is_loan" type="checkbox" class="mt-0.5 accent-brand-600" />
            <span class="flex-1">
              <span class="flex items-center gap-1 font-medium">
                <HandCoins class="w-3 h-3" /> Tandai sebagai Pinjaman
              </span>
              <span class="block text-slate-500 mt-0.5">
                Dompet ini berutang ke dompet utama. Otomatis catat utang internal.
              </span>
            </span>
          </label>
        </div>
      </div>

      <!-- Saran penutup (jika primary kurang) -->
      <div
        v-if="suggestedWallet"
        class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm"
      >
        <div class="flex items-start gap-2">
          <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="text-amber-900 font-medium mb-1">
              Dompet utama kurang {{ formatCurrency(primaryShortfall) }}
            </p>
            <p class="text-amber-700 text-xs mb-2">
              Saran: tutup dengan <b>{{ suggestedWallet.name }}</b>
              (saldo: {{ formatCurrency(balanceOf(suggestedWallet.id)) }})
            </p>
            <button
              type="button"
              @click="closeWithSuggested"
              class="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium"
            >
              Tutup dengan {{ suggestedWallet.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="bg-slate-100 rounded-xl p-3 text-sm space-y-1">
        <div class="flex justify-between">
          <span class="text-slate-600">Total belanja</span>
          <span class="font-medium">{{ formatCurrency(form.amount) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Dialokasikan</span>
          <span class="font-medium">{{ formatCurrency(totalPaid) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Sisa</span>
          <span
            :class="Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-red-600'"
            class="font-semibold flex items-center gap-1"
          >
            <CheckCircle2 v-if="Math.abs(remaining) < 0.01" class="w-3 h-3" />
            {{ formatCurrency(remaining) }}
          </span>
        </div>
      </div>

      <!-- Preview saldo before/after -->
      <div v-if="balancePreview.length" class="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <p class="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
          <WalletIcon class="w-3 h-3" /> Preview Saldo
        </p>
        <div
          v-for="item in balancePreview"
          :key="item.wallet_id"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-slate-700 flex items-center gap-1.5">
            <span
              class="w-2 h-2 rounded-full"
              :style="{ background: item.color }"
            />
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