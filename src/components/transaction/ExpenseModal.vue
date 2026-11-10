<script setup>
import { ref, watch, computed } from 'vue'
import { Plus, Trash2, HandCoins } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import WalletSelect from '../ui/WalletSelect.vue'
import CategorySelect from '../ui/CategorySelect.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'
import { useCategoryStore } from '../../stores/category'

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
    date: new Date().toISOString().slice(0, 10),
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

const totalPaid = computed(() =>
  form.value.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
)
const remaining = computed(() => Number(form.value.amount || 0) - totalPaid.value)
const canSubmit = computed(() =>
  Number(form.value.amount) > 0 &&
  form.value.category_id &&
  form.value.payments.every(p => p.wallet_id && Number(p.amount) > 0) &&
  Math.abs(remaining.value) < 0.01
)

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

function fmt(v) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(v || 0)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Tambah Pengeluaran"
    size="lg"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Total Pengeluaran</label>
        <input
          v-model.number="form.amount"
          type="number" inputmode="numeric" min="1" required
          placeholder="0"
          class="w-full px-4 py-3 text-lg font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
        <input
          v-model="form.date" type="date" required
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <CategorySelect
        v-model="form.category_id"
        :categories="catStore.expenseCategories"
        label="Kategori"
      />

      <!-- Payments -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-slate-700">Sumber Pembayaran</label>
          <button type="button" @click="addPayment" class="text-xs text-brand-600 font-medium flex items-center gap-1">
            <Plus class="w-3 h-3" /> Tambah Dompet
          </button>
        </div>

        <div v-for="(p, i) in form.payments" :key="i" class="bg-slate-50 rounded-xl p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-500">
              {{ i === 0 ? 'Dompet Utama' : `Dompet Tambahan ${i}` }}
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

          <input
            v-model.number="p.amount"
            type="number" inputmode="numeric" min="1" placeholder="Nominal dari dompet ini"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

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

      <!-- Summary -->
      <div class="bg-slate-100 rounded-xl p-3 text-sm space-y-1">
        <div class="flex justify-between">
          <span class="text-slate-600">Total tagihan</span>
          <span class="font-medium">{{ fmt(form.amount) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Dialokasikan</span>
          <span class="font-medium">{{ fmt(totalPaid) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Sisa</span>
          <span :class="Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-red-600'" class="font-semibold">
            {{ fmt(remaining) }}
          </span>
        </div>
      </div>

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