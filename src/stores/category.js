import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { categoryRepo } from '../repositories'
import { categoryService } from '../services'
import { syncTable } from '../lib/sync-engine'
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
      categories.value = await categoryRepo.getAll()
    } finally {
      loading.value = false
    }
  }

  async function upsertCategory(payload) {
    const auth = useAuthStore()
    const record = await categoryService.save(payload, auth.user.id)
    await loadLocal()
    syncCategories().catch(() => {})
    return record
  }

  async function softDeleteCategory(id) {
    const deleted = await categoryService.softDelete(id)
    if (!deleted) return
    await loadLocal()
    syncCategories().catch(() => {})
  }

  async function syncCategories() {
    const auth = useAuthStore()
    if (!auth.user) return
    await syncTable('categories')
    await loadLocal()
  }

  return {
    categories, incomeCategories, expenseCategories, loading,
    loadLocal, upsertCategory, softDeleteCategory, syncCategories
  }
})