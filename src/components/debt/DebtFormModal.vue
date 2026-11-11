<script setup>
import { ref, watch, computed } from 'vue'
import { HandCoins, ArrowLeftRight } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import WalletSelect from '../ui/WalletSelect.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'
import { DEBT_TYPE, DEBT_TYPE_LABEL } from '../../constants/debt'
import { formatCurrency, formatDateISO } from '../../lib/format'

const props = defineProps({
  modelValue: Boolean,
  defaultType: { type: String, default: DEBT_TYPE.UTANG }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const txStore = useTransactionStore()
const walletStore = useWalletStore()

// Mode internal (antar dompet) atau eksternal (pihak luar)
const MODE = {
  EXTERNAL: 'external',
  INTERNAL: 'internal'
}

const saving = ref(false)
const form = ref(emptyForm())

function emptyForm() {
  return {
    type: props.defaultType,
    mode: MODE.EXTERNAL,
    party: '',
    principal: '',
    // Untuk eksternal: wallet_id = wallet user (Cash)
    // Untuk internal: wallet_id = wallet debtor atau creditor sesuai tipe
    wallet_id: null,
    // Untuk internal: wallet lawan
    counterpart_wallet_id: null,
    due_date: '',
    note: '',
    date: formatDateISO()
  }
}

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

// Reset counterpart saat mode berubah
watch(() => form.value.mode, () => {
  form.value.counterpart_wallet_id = null
})

const isUtang = computed(() => form.value.type === DEBT_TYPE.UTANG)
const isInternal = computed(() => form.value.mode === MODE.INTERNAL)

// Validasi
const canSubmit = computed(() => {
  if (Number(form.value.principal) <= 0) return false
  if (!form.value.wallet_id) return false

  if (form.value.mode === MODE.EXTERNAL) {
    return form.value.party.trim().length > 0
  }

  // Internal: butuh counterpart, dan counterpart ≠ wallet_id
  return (
    form.value.counterpart_wallet_id &&
    form.value.counterpart_wallet_id !== form.value.wallet_id
  )
})

// Label dynamic untuk field dompet utama
const primaryWalletLabel = computed(() => {
  if (form.value.mode === MODE.EXTERNAL) {
    return isUtang.value ? 'Dompet Penerima Uang' : 'Dompet Sumber Dana'
  }
  return isUtang.value ? 'Dompet Peminjam (Anda)' : 'Dompet Pemberi Pinjam (Anda)'
})

const counterpartWalletLabel = computed(() => {
  return isUtang.value ? 'Dompet Pemberi Pinjam' : 'Dompet Peminjam'
})

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    if (form.value.mode === MODE.EXTERNAL) {
      // Pihak luar → createWithExternalParty
      await txStore.createDebtWithExternalParty({
        type: form.value.type,
        party: form.value.party.trim(),
        principal: Number(form.value.principal),
        wallet_id: form.value.wallet_id,
        due_date: form.value.due_date || null,
        note: form.value.note || null,
        date: form.value.date
      })
    } else {
      // Internal → create dengan debtor_wallet_id + creditor_wallet_id
      // Arah:
      // - Utang (kita pinjam dari wallet lain): debtor = wallet utama (kita), creditor = counterpart
      // - Piutang (kita pinjamkan ke wallet lain): debtor = counterpart, creditor = wallet utama (kita)
      const debtor_wallet_id = isUtang.value
        ? form.value.wallet_id
        : form.value.counterpart_wallet_id
      const creditor_wallet_id = isUtang.value
        ? form.value.counterpart_wallet_id
        : form.value.wallet_id

      await txStore.createDebt({
        type: form.value.type,
        debtor_wallet_id,
        creditor_wallet_id,
        principal: Number(form.value.principal),
        due_date: form.value.due_date || null,
        note: form.value.note || null,
        date: form.value.date
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
    :title="isUtang ? 'Catat Utang' : 'Catat Piutang'"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <!-- Type Tabs -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition',
            isUtang ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.type = DEBT_TYPE.UTANG"
        >{{ DEBT_TYPE_LABEL.utang }}</button>
        <button
          type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition',
            !isUtang ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.type = DEBT_TYPE.PIUTANG"
        >{{ DEBT_TYPE_LABEL.piutang }}</button>
      </div>

      <p class="text-xs text-slate-500 -mt-1">
        {{ isUtang ? 'Saya meminjam uang dari...' : 'Saya meminjamkan uang ke...' }}
      </p>

      <!-- Mode Tabs: Eksternal vs Internal -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition',
            form.mode === MODE.EXTERNAL ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.mode = MODE.EXTERNAL"
        >Pihak Luar</button>
        <button
          type="button"
          :class="['py-2 text-sm font-medium rounded-lg transition',
            isInternal ? 'bg-white shadow text-brand-600' : 'text-slate-600']"
          @click="form.mode = MODE.INTERNAL"
        >Antar Dompet</button>
      </div>

      <!-- Nama pihak (external only) -->
      <div v-if="form.mode === MODE.EXTERNAL">
        <label class="block text-sm font-medium text-slate-700 mb-1.5">
          Nama Pihak <span class="text-red-600">*</span>
        </label>
        <input
          v-model="form.party"
          placeholder="Mis. Budi / Koperasi Maju"
          class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <!-- Wallet utama -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">
          {{ primaryWalletLabel }}
        </label>
        <WalletSelect
          v-model="form.wallet_id"
          :wallets="walletStore.realWallets"
          :exclude="form.counterpart_wallet_id ? [form.counterpart_wallet_id] : []"
          label=""
        />
      </div>

      <!-- Counterpart wallet (internal only) -->
      <div v-if="isInternal">
        <label class="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
          <ArrowLeftRight class="w-4 h-4" />
          {{ counterpartWalletLabel }}
        </label>
        <WalletSelect
          v-model="form.counterpart_wallet_id"
          :wallets="walletStore.realWallets"
          :exclude="form.wallet_id ? [form.wallet_id] : []"
          label=""
        />
      </div>

      <!-- Nominal -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Nominal Pokok</label>
        <input
          v-model.number="form.principal"
          type="number" inputmode="numeric" min="1" required placeholder="0"
          class="w-full px-4 py-3 text-lg font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <!-- Tanggal + Jatuh Tempo -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
          <input
            v-model="form.date" type="date" required
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Jatuh Tempo</label>
          <input
            v-model="form.due_date" type="date"
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
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

      <!-- Info dampak saldo -->
      <div
        v-if="Number(form.principal) > 0 && form.wallet_id"
        class="bg-slate-50 rounded-xl p-3 text-sm flex items-center gap-2"
      >
        <HandCoins class="w-4 h-4 text-brand-600 shrink-0" />
        <span class="text-slate-600">
          Saldo dompet utama akan
          <b>{{ isUtang ? 'bertambah' : 'berkurang' }}</b>
          sebesar <b>{{ formatCurrency(form.principal) }}</b>
        </span>
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