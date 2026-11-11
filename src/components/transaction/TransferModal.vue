<script setup>
import { ref, watch, computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import WalletSelect from '../ui/WalletSelect.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'
import { formatDateISO } from '../../lib/format'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'saved'])

const txStore = useTransactionStore()
const walletStore = useWalletStore()

const saving = ref(false)
const form = ref(emptyForm())

function emptyForm() {
  return {
    amount: '',
    date: formatDateISO(),
    from_wallet_id: null,
    to_wallet_id: null,
    note: ''
  }
}

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

const canSubmit = computed(() =>
  Number(form.value.amount) > 0 &&
  form.value.from_wallet_id &&
  form.value.to_wallet_id &&
  form.value.from_wallet_id !== form.value.to_wallet_id
)

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await txStore.createTransfer({
      amount: Number(form.value.amount),
      date: form.value.date,
      from_wallet_id: form.value.from_wallet_id,
      to_wallet_id: form.value.to_wallet_id,
      note: form.value.note
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
    title="Transfer Antar Dompet"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Nominal</label>
        <input
          v-model.number="form.amount" type="number" inputmode="numeric" min="1" required
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
        v-model="form.from_wallet_id"
        :wallets="walletStore.activeWallets"
        :exclude="form.to_wallet_id ? [form.to_wallet_id] : []"
        label="Dari Dompet"
      />

      <div class="flex justify-center">
        <ArrowRight class="w-5 h-5 text-slate-400" />
      </div>

      <WalletSelect
        v-model="form.to_wallet_id"
        :wallets="walletStore.activeWallets"
        :exclude="form.from_wallet_id ? [form.from_wallet_id] : []"
        label="Ke Dompet"
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
        <BaseButton :loading="saving" :disabled="!canSubmit" @click="submit">Transfer</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>