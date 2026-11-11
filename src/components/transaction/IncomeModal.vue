<script setup>
import { ref, watch } from 'vue'
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
    note: ''
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = emptyForm()
    if (walletStore.activeWallets.length === 1) {
      form.value.wallet_id = walletStore.activeWallets[0].id
    }
  }
})

async function submit() {
  if (!form.value.amount || !form.value.wallet_id || !form.value.category_id) return
  saving.value = true
  try {
    await txStore.createIncome(form.value)
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
        :wallets="walletStore.activeWallets"
        label="Dompet Penerima"
      />

      <CategorySelect
        v-model="form.category_id"
        :categories="catStore.incomeCategories"
        label="Kategori"
      />

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
        <BaseButton :loading="saving" @click="submit">Simpan</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>