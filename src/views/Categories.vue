<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, ArrowLeft, Tag } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import CategoryItem from '../components/category/CategoryItem.vue'
import CategoryFormModal from '../components/category/CategoryFormModal.vue'
import { useCategoryStore } from '../stores/category'

const router = useRouter()
const catStore = useCategoryStore()

const tab = ref('expense')
const showForm = ref(false)
const editingCategory = ref(null)

const isExpenseTab = computed(() => tab.value === 'expense')

const list = computed(() =>
  isExpenseTab.value ? catStore.expenseCategories : catStore.incomeCategories
)

onMounted(async () => {
  await catStore.loadLocal()
})

function openCreate() {
  editingCategory.value = null
  showForm.value = true
}

function openEdit(category) {
  editingCategory.value = category
  showForm.value = true
}
</script>

<template>
  <div class="min-h-screen pb-24">
    <header class="px-5 pt-6 pb-4 flex items-center gap-3">
      <button
        @click="router.push({ name: 'dashboard' })"
        class="p-2 -ml-2 rounded-lg hover:bg-slate-100"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-xl font-bold">Kategori</h1>
        <p class="text-xs text-slate-500">Kelola kategori transaksi</p>
      </div>
    </header>

    <main class="px-5 space-y-4">
      <!-- Tabs -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          :class="[
            'py-2 text-sm font-medium rounded-lg transition',
            isExpenseTab ? 'bg-white shadow text-red-600' : 'text-slate-600'
          ]"
          @click="tab = 'expense'"
        >Pengeluaran ({{ catStore.expenseCategories.length }})</button>
        <button
          :class="[
            'py-2 text-sm font-medium rounded-lg transition',
            !isExpenseTab ? 'bg-white shadow text-green-600' : 'text-slate-600'
          ]"
          @click="tab = 'income'"
        >Pemasukan ({{ catStore.incomeCategories.length }})</button>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <BaseButton class="flex-1" @click="openCreate">
          <Plus class="w-4 h-4 inline mr-1" />
          Tambah Kategori {{ isExpenseTab ? 'Pengeluaran' : 'Pemasukan' }}
        </BaseButton>
      </div>

      <!-- List -->
      <div
        v-if="!list.length"
        class="bg-white rounded-xl p-8 text-center border border-slate-200"
      >
        <Tag class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm text-slate-500">
          Belum ada kategori {{ isExpenseTab ? 'pengeluaran' : 'pemasukan' }}
        </p>
      </div>

      <div v-else class="space-y-2">
        <CategoryItem
          v-for="c in list"
          :key="c.id"
          :category="c"
          @click="openEdit"
        />
      </div>
    </main>

    <CategoryFormModal
      v-model="showForm"
      :category="editingCategory"
      :default-type="tab"
      @saved="catStore.loadLocal()"
      @deleted="catStore.loadLocal()"
    />
  </div>
</template>