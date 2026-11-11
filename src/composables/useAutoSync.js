import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '../stores/wallet'
import { useCategoryStore } from '../stores/category'
import { useTransactionStore } from '../stores/transaction'
import { useAuthStore } from '../stores/auth'
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
  const auth = useAuthStore()

  async function syncAll() {
    if (syncing.value) return
    if (!navigator.onLine) return
    if (!auth.user) return

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

  // Auto-sync saat user baru login (state false → true)
  // Juga fire saat page reload dengan session tersimpan (immediate: true)
  watch(
    () => auth.isAuthenticated,
    (isAuth, wasAuth) => {
      if (isAuth && !wasAuth) {
        console.log('[useAutoSync] user logged in, triggering sync')
        syncAll()
      }
    },
    { immediate: true }
  )

  function start() {
    if (isRunning) return
    isRunning = true
    timerId = setInterval(() => { syncAll() }, SYNC_INTERVAL_MS)
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
    if (activeInstances === 0) stop()
  })

  return { syncing, lastSyncAt, syncAll, start, stop }
}