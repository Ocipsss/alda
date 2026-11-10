cat > src/components/debt/DebtPaymentModal.vue << 'EOF'
<script setup>
import { ref, watch, computed } from 'vue'
import { CheckCircle2 } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import WalletSelect from '../ui/WalletSelect.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'

const props = defineProps({ modelValue: Boolean, debt: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'saved'])

const txStore = useTransactionStore()
const walletStore = useWalletStore()

const saving = ref(false)
const form = ref({ wallet_id: null, amount: '', date: new Date().toISOString().slice(0, 10), note: '' })

watch(() => props.modelValue, (open) => {
  if (open && props.debt) {
    form.value = {
      wallet_id: null,
      amount: props.debt.remaining,
      date: new Date().toISOString().slice(0, 10),
      note: ''
    }
  }
})

const maxAmount = computed(() => Number(props.debt?.remaining || 0))
const canSubmit = computed(() =>
  Number(form.value.amount) > 0 && Number(form.value.amount) <= maxAmount.value && form.value.wallet_id
)

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await txStore.payDebt({
      debt_id: props.debt.id,
      wallet_id: form.value.wallet_id,
      amount: Number(form.value.amount),
      date: form.value.date,
      note: form.value.note
    })
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}

function fillFull() {
  form.value.amount = maxAmount.value
}

function fmt(v) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)
}
</script>

<template>
  <BaseModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" title="Pelunasan">
    <div v-if="debt" class="space-y-4">
      <div class="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Pihak</span><span class="font-medium">{{ debt.party }}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Jenis</span><span class="font-medium capitalize">{{ debt.type }} ({{ debt.source }})</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Pokok</span><span class="font-medium">{{ fmt(debt.principal) }}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Sisa</span><span class="font-semibold text-red-600">{{ fmt(debt.remaining) }}</span></div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Nominal Bayar</label>
        <input v-model.number="form.amount" type="number" inputmode="numeric" min="1" :max="maxAmount" required
          class="w-full px-4 py-3 text-lg font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button type="button" @click="fillFull" class="text-xs text-brand-600 mt-1 flex items-center gap-1">
          <CheckCircle2 class="w-3 h-3" /> Bayar Lunas ({{ fmt(maxAmount) }})
        </button>
      </div>

      <WalletSelect v-model="form.wallet_id" :wallets="walletStore.activeWallets"
        :label="debt.type === 'utang' ? 'Dompet Penyetor' : 'Dompet Penerima'" />

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
        <input v-model="form.date" type="date" required
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Catatan (opsional)</label>
        <textarea v-model="form.note" rows="2"
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <div class="flex-1" />
        <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Batal</BaseButton>
        <BaseButton :loading="saving" :disabled="!canSubmit" @click="submit">Bayar</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
EOF