<script setup>
import { ref, watch, computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { Trash2 } from 'lucide-vue-next'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import IconPicker from '../ui/IconPicker.vue'
import { useCategoryStore } from '../../stores/category'

const props = defineProps({
  modelValue: Boolean,
  category: { type: Object, default: null },
  defaultType: { type: String, default: 'expense' }
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const store = useCategoryStore()
const saving = ref(false)
const showIconPicker = ref(false)

function emptyForm() {
  return {
    id: null,
    name: '',
    type: props.defaultType,
    icon: 'Tag'
  }
}

const form = ref(emptyForm())

watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = props.category
      ? { ...props.category }
      : emptyForm()
    showIconPicker.value = false
  }
})

const isEdit = computed(() => !!form.value.id)

function resolveIcon(name) {
  return LucideIcons[name] || LucideIcons.Tag
}

function colorOf(type) {
  return type === 'income' ? '#10b981' : '#ef4444'
}

async function submit() {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    await store.upsertCategory(form.value)
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}

async function removeCategory() {
  if (!form.value.id) return
  if (!confirm(`Hapus kategori "${form.value.name}"?`)) return
  await store.softDeleteCategory(form.value.id)
  emit('deleted')
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="isEdit ? 'Edit Kategori' : 'Tambah Kategori'"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <!-- Type Tabs -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          :class="[
            'py-2 text-sm font-medium rounded-lg transition',
            form.type === 'income'
              ? 'bg-white shadow text-green-600'
              : 'text-slate-600'
          ]"
          @click="form.type = 'income'"
        >Pemasukan</button>
        <button
          type="button"
          :class="[
            'py-2 text-sm font-medium rounded-lg transition',
            form.type === 'expense'
              ? 'bg-white shadow text-red-600'
              : 'text-slate-600'
          ]"
          @click="form.type = 'expense'"
        >Pengeluaran</button>
      </div>

      <!-- Icon + Name -->
      <div class="flex gap-3">
        <button
          type="button"
          class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border-2 border-slate-200"
          :style="{ background: colorOf(form.type) + '18', color: colorOf(form.type) }"
          @click="showIconPicker = true"
        >
          <component :is="resolveIcon(form.icon)" class="w-6 h-6" />
        </button>
        <input
          v-model="form.name"
          placeholder="Nama kategori"
          required
          maxlength="30"
          class="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="button"
        class="text-sm text-brand-600"
        @click="showIconPicker = true"
      >
        Pilih ikon: <span class="font-medium">{{ form.icon }}</span>
      </button>
    </form>

    <template #footer>
      <div class="flex gap-2">
        <BaseButton
          v-if="isEdit"
          variant="danger"
          @click="removeCategory"
        >
          <Trash2 class="w-4 h-4 inline mr-1" /> Hapus
        </BaseButton>
        <div class="flex-1" />
        <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Batal</BaseButton>
        <BaseButton :loading="saving" @click="submit">Simpan</BaseButton>
      </div>
    </template>

    <!-- Nested icon picker modal -->
    <BaseModal v-model="showIconPicker" title="Pilih Ikon">
      <IconPicker v-model="form.icon" />
      <template #footer>
        <BaseButton @click="showIconPicker = false">Selesai</BaseButton>
      </template>
    </BaseModal>
  </BaseModal>
</template>