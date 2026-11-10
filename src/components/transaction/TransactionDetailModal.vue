<script setup>
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import { useTransactionStore } from '../../stores/transaction'
import { useWalletStore } from '../../stores/wallet'
import { useCategoryStore } from '../../stores/category'

const props = defineProps({
  modelValue: Boolean,
  tx: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'deleted'])

const txStore = useTransactionStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()

const category = computed(() =>
  props.tx ? catStore.categories.find(c => c.id === props.tx.category_id) : null
)
const wallet = computed(() =>
  props.tx ? walletStore.wallets.find(w => w.id === props.tx.wallet_id) : null
)
const toWallet = computed(() =>
  props.tx ? walletStore.wallets.find(w => w.id === props.tx.to_wallet_id) : null
)
const txSplits = computed(() =>
  props.tx ? txStore.splits.filter(s => s.transaction_id === props.tx.id) : []
)

function fmt(v) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(v || 0)
}
function walletName(id) {
  return walletStore.wallets.find(w => w.id === id)?.name || '—'
}

async function remove() {
  if (!confirm('Hapus transaksi ini?')) return
  await txStore.softDeleteTransaction(props.tx.id)
  emit('deleted')
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Detail Transaksi"
  >
    <div v-if="tx" class="space-y-4">
      <div class="text-center py-2">
        <p
          class="text-2xl font-bold"
          :class="tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-indigo-600'"
        >
          {{ fmt(tx.amount) }}
        </p>
        <p class="text-sm text-slate-500 mt-1">{{ category?.name || tx.type }}</p>
      </div>

      <div class="bg-slate-50 rounded-xl divide-y divide-slate-200 text-sm">
        <div class="flex justify-between p-3">
          <span class="text-slate-500">Tanggal</span>
          <span class="font-medium">{{ tx.date }}</span>
        </div>
        <div class="flex justify-between p-3">
          <span class="text-slate-500">Jenis</span>
          <span class="font-medium capitalize">{{ tx.type }}</span>
        </div>
        <div class="flex justify-between p-3">
          <span class="text-slate-500">Dompet</span>
          <span class="font-medium">{{ wallet?.name || '—' }}</span>
        </div>
        <div v-if="tx.type === 'transfer'" class="flex justify-between p-3">
          <span class="text-slate-500">Ke Dompet</span>
          <span class="font-medium">{{ toWallet?.name || '—' }}</span>
        </div>
        <div v-if="tx.note" class="flex justify-between p-3">
          <span class="text-slate-500">Catatan</span>
          <span class="font-medium text-right">{{ tx.note }}</span>
        </div>
      </div>

      <!-- Multi-wallet breakdown -->
      <div v-if="txSplits.length > 1" class="bg-slate-50 rounded-xl p-3 space-y-2">
        <p class="text-xs font-medium text-slate-500 uppercase">Rincian Pembayaran</p>
        <div v-for="s in txSplits" :key="s.id" class="flex justify-between text-sm">
          <span class="text-slate-600">
            {{ walletName(s.wallet_id) }}
            <span v-if="s.is_loan" class="text-xs text-amber-600">(pinjaman)</span>
          </span>
          <span class="font-medium">{{ fmt(s.amount) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <BaseButton variant="danger" @click="remove">
          <Trash2 class="w-4 h-4 inline mr-1" /> Hapus
        </BaseButton>
        <div class="flex-1" />
        <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Tutup</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>