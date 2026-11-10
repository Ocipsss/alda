import { ref, onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '../stores/wallet'
import { useCategoryStore } from '../stores/category'
import { useTransactionStore } from '../stores/transaction'
import { SYNC_INTERVAL_MS } from '../constants/sync'

let timerId = null
let isRunning = false
let activeInstances = 0

export function useAutoSync() {
  const syncing = ref(false)
  const lastSyncAt = ref(null)

  const walletStore = useWalletStore()
  const catStore = useCategoryStore()
  const txStore = useTransactionStore()

  async function syncAll() {
    if (syncing.value) return
    if (!navigator.onLine) return

    syncing.value = true
    try {
      await Promise.allSettled([
        walletStore.syncWallets(),
        catStore.syncCategories(),
        txStore.syncAll()
      ])
      lastSyncAt.value = new Date()
    } catch (e) {
      console.warn('[useAutoSync] sync error:', e)
    } finally {
      syncing.value = false
    }
  }

  function start() {
    if (isRunning) return
    isRunning = true

    // Sync pertama (kalau online)
    syncAll()

    // Timer periodik
    timerId = setInterval(() => {
      syncAll()
    }, SYNC_INTERVAL_MS)

    // Listener online/offline
    window.addEventListener('online', syncAll)
  }

  function stop() {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
    window.removeEventListener('online', syncAll)
    isRunning = false
  }

  onMounted(() => {
    activeInstances++
    start()
  })

  onUnmounted(() => {
    activeInstances--
    // Hanya stop kalau tidak ada instance aktif lain
    if (activeInstances === 0) {
      stop()
    }
  })

  return {
    syncing,
    lastSyncAt,
    syncAll,
    start,
    stop
  }
}