import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, uid, getMeta, setMeta } from '../db'
import { supabase } from '../lib/supabase'
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
      wallets.value = await db.wallets.toArray()
    } finally {
      loading.value = false
    }
  }

  async function upsertWallet(payload) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const existing = payload.id ? await db.wallets.get(payload.id) : null

    const record = {
      id: existing?.id ?? uid(),
      user_id: auth.user.id,
      name: payload.name,
      initial_balance: Number(payload.initial_balance || 0),
      color: payload.color || '#3b82f6',
      icon: payload.icon || 'Wallet',
      is_deleted: false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      _pending: true
    }

    await db.wallets.put(record)
    await loadLocal()
    syncWallets().catch(() => {})
    return record
  }

  async function softDeleteWallet(id) {
    const w = await db.wallets.get(id)
    if (!w) return
    await db.wallets.update(id, {
      is_deleted: true,
      updated_at: new Date().toISOString(),
      _pending: true
    })
    await loadLocal()
    syncWallets().catch(() => {})
  }

  async function syncWallets() {
    const auth = useAuthStore()
    if (!auth.user) return
    if (!navigator.onLine) return

    const pending = await db.wallets.filter(w => !!w._pending).toArray()
    for (const w of pending) {
      const { _pending, ...row } = w
      const { error } = await supabase.from('wallets').upsert(row, { onConflict: 'id' })
      if (!error) {
        await db.wallets.update(w.id, { _pending: false })
      }
    }

    const last = await getMeta('wallets_sync_at') ?? '1970-01-01T00:00:00Z'
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .gt('updated_at', last)
      .order('updated_at', { ascending: true })

    if (!error && data) {
      for (const remote of data) {
        const local = await db.wallets.get(remote.id)
        if (!local || new Date(remote.updated_at) >= new Date(local.updated_at)) {
          await db.wallets.put({ ...remote, _pending: false })
        }
      }
      const newest = data.at(-1)?.updated_at ?? last
      await setMeta('wallets_sync_at', newest)
      await loadLocal()
    }
  }

  return {
    wallets, activeWallets, totalBalance, loading,
    loadLocal, upsertWallet, softDeleteWallet, syncWallets
  }
})