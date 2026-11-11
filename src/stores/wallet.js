import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { walletRepo } from '../repositories'
import { walletService } from '../services'
import { syncTable } from '../lib/sync-engine'
import { useAuthStore } from './auth'

export const useWalletStore = defineStore('wallet', () => {
  const wallets = ref([])
  const loading = ref(false)

  // ============ COMPUTED: FILTER ============

  /**
   * Semua wallet aktif (real + temporer, tidak dihapus).
   * Dipakai untuk lookup & operasi internal.
   */
  const activeWallets = computed(() =>
    wallets.value.filter(w => !w.is_deleted)
  )

  /**
   * Wallet real (bukan temporer). Untuk UI picker & dashboard.
   */
  const realWallets = computed(() =>
    wallets.value.filter(w => !w.is_deleted && !w.is_temporary)
  )

  /**
   * Wallet temporer (pihak luar). Untuk section "Pihak Luar" di /wallets.
   */
  const temporaryWallets = computed(() =>
    wallets.value.filter(w => !w.is_deleted && w.is_temporary === true)
  )

  /**
   * Total initial balance (bukan saldo real).
   * ⚠️ JANGAN dipakai untuk total saldo di Dashboard.
   * Pakai `txStore.balances()` + `computeTotalReal()` di Dashboard.
   */
  const totalInitialBalance = computed(() =>
    realWallets.value.reduce((sum, w) => sum + Number(w.initial_balance || 0), 0)
  )

  // ============ LOAD LOCAL ============

  async function loadLocal() {
    loading.value = true
    try {
      wallets.value = await walletRepo.getAll()
    } finally {
      loading.value = false
    }
  }

  // ============ CRUD (REAL WALLET) ============

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

  // ============ TEMPORARY WALLET ============

  /**
   * Bikin wallet temporer baru (pihak luar).
   * Untuk reuse, pakai `findOrCreateTemporary`.
   */
  async function createTemporary({ name, type }) {
    const auth = useAuthStore()
    const record = await walletService.createTemporary({
      name,
      type,
      userId: auth.user.id
    })
    await loadLocal()
    syncWallets().catch(() => {})
    return record
  }

  /**
   * Cari atau bikin wallet temporer.
   */
  async function findOrCreateTemporary({ name, type }) {
    const auth = useAuthStore()
    const record = await walletService.findOrCreateTemporary({
      name,
      type,
      userId: auth.user.id
    })
    await loadLocal()
    syncWallets().catch(() => {})
    return record
  }

  /**
   * Cleanup wallet temporer kalau orphan (tidak ada debt aktif).
   * Dipanggil setelah debt lunas / soft delete.
   */
  async function deleteTemporaryIfOrphan(walletId, debts = []) {
    const deleted = await walletService.deleteTemporaryIfOrphan(walletId, debts)
    if (deleted) {
      await loadLocal()
      syncWallets().catch(() => {})
    }
    return deleted
  }

  // ============ SYNC ============

  async function syncWallets() {
    const auth = useAuthStore()
    if (!auth.user) return
    await syncTable('wallets')
    await loadLocal()
  }

  // ============ HELPERS ============

  function getById(id) {
    return wallets.value.find(w => w.id === id) || null
  }

  function getRealById(id) {
    return realWallets.value.find(w => w.id === id) || null
  }

  function getTemporaryById(id) {
    return temporaryWallets.value.find(w => w.id === id) || null
  }

  // ============ RETURN ============

  return {
    // State
    wallets,
    loading,

    // Computed
    activeWallets,
    realWallets,
    temporaryWallets,
    totalInitialBalance,

    // CRUD
    loadLocal,
    upsertWallet,
    softDeleteWallet,

    // Temporary wallet
    createTemporary,
    findOrCreateTemporary,
    deleteTemporaryIfOrphan,

    // Sync
    syncWallets,

    // Helpers
    getById,
    getRealById,
    getTemporaryById
  }
})