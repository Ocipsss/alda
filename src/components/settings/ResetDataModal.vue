<script setup>
import { ref, watch, computed } from 'vue'
import { AlertTriangle, Loader2 } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import { dataResetService } from '../../services/data-reset.service'
import { useAuthStore } from '../../stores/auth'
import { useWalletStore } from '../../stores/wallet'
import { useCategoryStore } from '../../stores/category'
import { useTransactionStore } from '../../stores/transaction'

const props = defineProps({
  modelValue: Boolean,
  mode: { type: String, default: 'transactions' }
})
const emit = defineEmits(['update:modelValue', 'confirmed'])

const auth = useAuthStore()
const walletStore = useWalletStore()
const catStore = useCategoryStore()
const txStore = useTransactionStore()

const counts = ref(null)
const loading = ref(false)
const loadingCounts = ref(false)
const confirmText = ref('')
const showToast = ref(false)
const toastMessage = ref('')

const isAllMode = computed(() => props.mode === 'all')

const requiredText = computed(() =>
  isAllMode.value ? 'RESET SEMUA' : 'HAPUS'
)

const isTextValid = computed(() =>
  confirmText.value.trim() === requiredText.value
)

watch(() => props.modelValue, async (open) => {
  if (open) {
    confirmText.value = ''
    loadingCounts.value = true
    try {
      counts.value = await dataResetService.countData(auth.user.id)
    } finally {
      loadingCounts.value = false
    }
  }
})

async function confirmReset() {
  if (!isTextValid.value) return
  loading.value = true
  try {
    if (isAllMode.value) {
      await dataResetService.resetAll(auth.user.id)
      toastMessage.value = 'Semua data berhasil direset. Aplikasi siap mulai dari nol.'
    } else {
      const result = await dataResetService.resetTransactions(auth.user.id)
      toastMessage.value = `${result.transactions} transaksi & ${result.debts} pinjaman dihapus`
    }

    await Promise.all([
      walletStore.loadLocal(),
      catStore.loadLocal(),
      txStore.loadLocal()
    ])

    walletStore.syncWallets().catch(() => {})
    catStore.syncCategories().catch(() => {})
    txStore.syncAll().catch(() => {})

    emit('confirmed')
    emit('update:modelValue', false)
    showToast.value = true
    setTimeout(() => { showToast.value = false }, 3500)
  } catch (e) {
    console.error('[ResetData] failed:', e)
    alert('Reset gagal: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="isAllMode ? 'Reset Semua Data' : 'Reset Transaksi'"
  >
    <div class="space-y-4">
      <div class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div class="flex-1 text-sm text-red-800">
          <p class="font-medium mb-1">
            {{ isAllMode ? 'Semua data akan dihapus permanen' : 'Transaksi akan dihapus' }}
          </p>
          <p class="text-xs">
            {{ isAllMode
              ? 'Tindakan ini TIDAK bisa dibatalkan. Semua transaksi, dompet, dan kategori akan hilang.'
              : 'Saldo dompet akan kembali ke saldo awal. Dompet & kategori tetap ada.' }}
          </p>
        </div>
      </div>

      <div v-if="loadingCounts" class="text-center py-4">
        <Loader2 class="w-5 h-5 text-slate-400 animate-spin mx-auto" />
        <p class="text-xs text-slate-500 mt-2">Menghitung data...</p>
      </div>

      <div v-else-if="counts" class="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
        <p class="text-xs font-medium text-slate-500 uppercase mb-2">Data yang akan dihapus</p>
        <div class="flex justify-between">
          <span class="text-slate-600">Transaksi</span>
          <span class="font-medium">{{ counts.transactions }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Utang/Piutang</span>
          <span class="font-medium">{{ counts.debts }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Riwayat pelunasan</span>
          <span class="font-medium">{{ counts.debtPayments }}</span>
        </div>
        <div v-if="isAllMode" class="flex justify-between">
          <span class="text-slate-600">Dompet</span>
          <span class="font-medium">{{ counts.wallets }}</span>
        </div>
        <div v-if="isAllMode" class="flex justify-between">
          <span class="text-slate-600">Kategori</span>
          <span class="font-medium">{{ counts.categories }}</span>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        <p class="font-medium mb-1">
          {{ isAllMode ? 'Setelah reset:' : 'Yang dipertahankan:' }}
        </p>
        <ul class="space-y-0.5 list-disc list-inside">
          <template v-if="isAllMode">
            <li>8 kategori default akan dibuat ulang</li>
            <li>Saldo dompet hilang (belum ada dompet)</li>
            <li>Mulai fresh seperti user baru</li>
          </template>
          <template v-else>
            <li>Dompet (dengan saldo awal)</li>
            <li>Semua kategori</li>
            <li>Tidak ada transaksi</li>
          </template>
        </ul>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">
          Ketik <code class="px-1.5 py-0.5 rounded bg-slate-100 text-red-600 font-mono text-xs">{{ requiredText }}</code> untuk konfirmasi:
        </label>
        <input
          v-model="confirmText"
          type="text"
          autocomplete="off"
          placeholder="Ketik disini..."
          class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <div class="flex-1" />
        <BaseButton variant="secondary" @click="emit('update:modelValue', false)">
          Batal
        </BaseButton>
        <BaseButton
          :loading="loading"
          :disabled="!isTextValid"
          class="!bg-red-600 hover:!bg-red-700"
          @click="confirmReset"
        >
          {{ isAllMode ? 'HAPUS SEMUA' : 'HAPUS' }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>

  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="showToast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[90%] px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-green-600 text-white flex items-center gap-2"
      >
        ✅ {{ toastMessage }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
