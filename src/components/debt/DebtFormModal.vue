mkdir -p src/components/debt
cat > src/components/debt/DebtFormModal.vue << 'EOF'
<script setup>
import { ref, watch, computed } from 'vue'
import { HandCoins, ArrowLeftRight } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import WalletSelect from '../ui/WalletSelect.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'

const props = defineProps({ modelValue: Boolean, defaultType: { type: String, default: 'utang' } })
const emit = defineEmits(['update:modelValue', 'saved'])

const txStore = useTransactionStore()
const walletStore = useWalletStore()

const saving = ref(false)
const form = ref(emptyForm())

function emptyForm() {
  return {
    type: props.defaultType,
    source: 'external',
    party: '',
    principal: '',
    wallet_id: null,
    counterpart_wallet_id: null,
    due_date: '',
    note: '',
    date: new Date().toISOString().slice(0, 10)
  }
}

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

const canSubmit = computed(() => {
  const base = Number(form.value.principal) > 0 && form.value.wallet_id
  if (form.value.source === 'external') {
    return base && form.value.party.trim().length > 0
  }
  return base && form.value.counterpart_wallet_id &&
    form.value.counterpart_wallet_id !== form.value.wallet_id
})

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    const payload = {
      type: form.value.type,
      source: form.value.source,
      principal: Number(form.value.principal),
      wallet_id: form.value.wallet_id,
      due_date: form.value.due_date || null,
      note: form.value.note || null,
      date: form.value.date
    }
    if (form.value.source === 'external') {
      payload.party = form.value.party.trim()
    } else {
      const counterpart = walletStore.wallets.find(w => w.id === form.value.counterpart_wallet_id)
      payload.party = counterpart?.name || 'Dompet'
      payload.counterpart_wallet_id = form.value.counterpart_wallet_id
    }
    await txStore.createDebt(payload)
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}

function fmt(v) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)
}
</script>

<template>
  <BaseModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" :title="form.type === 'utang' ? 'Catat Utang' : 'Catat Piutang'">
    <form class="space-y-4" @submit.prevent="submit">
      <!-- Type Tabs -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition', form.type === 'utang' ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.type = 'utang'">Utang</button>
        <button type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition', form.type === 'piutang' ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.type = 'piutang'">Piutang</button>
      </div>

      <p class="text-xs text-slate-500 -mt-1">
        {{ form.type === 'utang' ? 'Saya meminjam uang dari...' : 'Saya meminjamkan uang ke...' }}
      </p>

      <!-- Source Tabs -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition', form.source === 'external' ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.source = 'external'">Pihak Luar</button>
        <button type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition', form.source === 'internal' ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.source = 'internal'">Antar Dompet</button>
      </div>

      <div v-if="form.source === 'external'">
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Nama Pihak</label>
        <input v-model="form.party" placeholder="Mis. Budi / Koperasi" required
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">
          {{ form.source === 'internal' ? (form.type === 'utang' ? 'Dompet Penerima Pinjaman' : 'Dompet Pemberi Pinjaman') : (form.type === 'utang' ? 'Dompet Penerima Uang' : 'Dompet Sumber Dana') }}
        </label>
        <WalletSelect v-model="form.wallet_id" :wallets="walletStore.activeWallets" label="" />
      </div>

      <div v-if="form.source === 'internal'">
        <label class="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
          <ArrowLeftRight class="w-4 h-4" /> {{ form.type === 'utang' ? 'Dompet Pemberi Pinjaman' : 'Dompet Penerima Pinjaman' }}
        </label>
        <WalletSelect
          v-model="form.counterpart_wallet_id"
          :wallets="walletStore.activeWallets"
          :exclude="form.wallet_id ? [form.wallet_id] : []"
          label=""
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Nominal Pokok</label>
        <input v-model.number="form.principal" type="number" inputmode="numeric" min="1" required placeholder="0"
          class="w-full px-4 py-3 text-lg font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
          <input v-model="form.date" type="date" required
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Jatuh Tempo</label>
          <input v-model="form.due_date" type="date"
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Catatan (opsional)</label>
        <textarea v-model="form.note" rows="2"
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div v-if="Number(form.principal) > 0" class="bg-slate-50 rounded-xl p-3 text-sm flex items-center gap-2">
        <HandCoins class="w-4 h-4 text-brand-600" />
        <span class="text-slate-600">Saldo dompet akan {{ form.type === 'utang' ? 'bertambah' : 'berkurang' }} sebesar <b>{{ fmt(form.principal) }}</b></span>
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
EOF