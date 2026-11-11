<script setup>
import { ref, watch, computed } from 'vue'
import { HandCoins } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import WalletSelect from '../ui/WalletSelect.vue'
import CategorySelect from '../ui/CategorySelect.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'
import { useCategoryStore } from '../../stores/category'
import { formatDateISO } from '../../lib/format'

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
    wallet_id: null,
    category_id: null,
    note: '',
    isLoan: false,
    party_name: '',
    due_date: ''
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = emptyForm()
    if (walletStore.realWallets.length === 1) {
      form.value.wallet_id = walletStore.realWallets[0].id
    }
  }
})

// Validasi: kalau isLoan=true, party_name wajib diisi
const canSubmit = computed(() => {
  const base =
    Number(form.value.amount) > 0 &&
    form.value.wallet_id &&
    form.value.category_id

  if (form.value.isLoan) {
    return base && form.value.party_name.trim().length > 0
  }
  return base
})

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    if (form.value.isLoan) {
      // Catat sebagai pinjaman dari pihak luar
      await txStore.createIncomeWithBorrower({
        amount: Number(form.value.amount),
        date: form.value.date,
        wallet_id: form.value.wallet_id,
        category_id: form.value.category_id,
        note: form.value.note,
        party_name: form.value.party_name.trim(),
        due_date: form.value.due_date || null
      })
    } else {
      // Income biasa
      await txStore.createIncome({
        amount: Number(form.value.amount),
        date: form.value.date,
        wallet_id: form.value.wallet_id,
        category_id: form.value.category_id,
        note: form.value.note
      })
    }

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
    title="Tambah Pemasukan"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Nominal</label>
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

      <WalletSelect
        v-model="form.wallet_id"
        :wallets="walletStore.realWallets"
        label="Dompet Penerima"
      />

      <CategorySelect
        v-model="form.category_id"
        :categories="catStore.incomeCategories"
        label="Kategori"
      />

      <!-- Checkbox: catat sebagai pinjaman -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
        <label class="flex items-start gap-2 cursor-pointer">
          <input
            v-model="form.isLoan"
            type="checkbox"
            class="mt-0.5 accent-amber-600"
          />
          <span class="flex-1">
            <span class="flex items-center gap-1 font-medium text-sm text-amber-900">
              <HandCoins class="w-4 h-4" />
              Catat sebagai pinjaman dari pihak luar
            </span>
            <span class="block text-xs text-amber-700 mt-0.5">
              Uang masuk sekarang, tapi tercatat sebagai utang ke pihak lain.
            </span>
          </span>
        </label>

        <template v-if="form.isLoan">
          <div>
            <label class="block text-xs font-medium text-amber-900 mb-1">
              Nama Pihak <span class="text-red-600">*</span>
            </label>
            <input
              v-model="form.party_name"
              type="text"
              placeholder="Contoh: Andi, Koperasi Maju"
              class="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-amber-900 mb-1">
              Jatuh Tempo (opsional)
            </label>
            <input
              v-model="form.due_date"
              type="date"
              class="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </template>
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