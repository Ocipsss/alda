import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { walletRepo } from '../repositories'
import { walletService } from '../services'
import { syncTable } from '../lib/sync-engine'
import { useAuthStore } from './auth'

export const useWalletStore = defineStore('wallet', () => {
  const wallets = ref([])
  const loading = ref(false)

  const activeWallets = computed(() =>
    wallets.value.filter(w => !w.is_deleted)
  )

  const totalBalance = computed(() =>
    activeWallets.value.reduce((sum, w) => sum + Number(w.initial_balance || 0), 0)
  )

  async function loadLocal() {
    loading.value = true
    try {
      wallets.value = await walletRepo.getAll()
    } finally {
      loading.value = false
    }
  }

  async function upsertWallet(payload) {
    const auth = useAuthStore()
    const record = await walletService.save(payload, auth.user.id)
    await loadLocal()
    syncWallets().catch(() => {})
    return record
  }

  async function softDeleteWallet(id) {
    const deleted = await walletService.softDelete(id)
    if (!deleted) return
    await loadLocal()
    syncWallets().catch(() => {})
  }

  async function syncWallets() {
    const auth = useAuthStore()
    if (!auth.user) return
    await syncTable('wallets')
    await loadLocal()
  }

  return {
    wallets, activeWallets, totalBalance, loading,
    loadLocal, upsertWallet, softDeleteWallet, syncWallets
  }
})