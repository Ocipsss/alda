import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, uid, getMeta, setMeta } from '../db'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref([])
  const loading = ref(false)

  const incomeCategories = computed(() =>
    categories.value.filter(c => !c.is_deleted && c.type === 'income')
  )
  const expenseCategories = computed(() =>
    categories.value.filter(c => !c.is_deleted && c.type === 'expense')
  )

  async function loadLocal() {
    loading.value = true
    try {
      categories.value = await db.categories.toArray()
    } finally {
      loading.value = false
    }
  }

  async function upsertCategory(payload) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const existing = payload.id ? await db.categories.get(payload.id) : null

    const record = {
      id: existing?.id ?? uid(),
      user_id: auth.user.id,
      name: payload.name,
      type: payload.type,
      icon: payload.icon || 'Tag',
      is_deleted: false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      _pending: true
    }

    await db.categories.put(record)
    await loadLocal()
    syncCategories().catch(() => {})
    return record
  }

  async function softDeleteCategory(id) {
    await db.categories.update(id, {
      is_deleted: true,
      updated_at: new Date().toISOString(),
      _pending: true
    })
    await loadLocal()
    syncCategories().catch(() => {})
  }

  async function syncCategories() {
    const auth = useAuthStore()
    if (!auth.user || !navigator.onLine) return

    const pending = await db.categories.filter(c => !!c._pending).toArray()
    for (const c of pending) {
      const { _pending, ...row } = c
      const { error } = await supabase.from('categories').upsert(row, { onConflict: 'id' })
      if (!error) await db.categories.update(c.id, { _pending: false })
    }

    const last = await getMeta('categories_sync_at') ?? '1970-01-01T00:00:00Z'
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .gt('updated_at', last)
      .order('updated_at', { ascending: true })

    if (!error && data) {
      for (const remote of data) {
        const local = await db.categories.get(remote.id)
        if (!local || new Date(remote.updated_at) >= new Date(local.updated_at)) {
          await db.categories.put({ ...remote, _pending: false })
        }
      }
      const newest = data.at(-1)?.updated_at ?? last
      await setMeta('categories_sync_at', newest)
      await loadLocal()
    }
  }

  return {
    categories, incomeCategories, expenseCategories, loading,
    loadLocal, upsertCategory, softDeleteCategory, syncCategories
  }
})