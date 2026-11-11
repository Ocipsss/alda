<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { Check } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] },
  selectedId: { type: String, default: null }
})
const emit = defineEmits(['update:modelValue', 'select'])

function pick(category) {
  emit('select', category)
  emit('update:modelValue', false)
}

function iconOf(name) {
  return LucideIcons[name] || LucideIcons.Tag
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Pilih Kategori"
  >
    <div v-if="!categories.length" class="text-center py-8">
      <p class="text-sm text-slate-500">Belum ada kategori</p>
    </div>

    <div v-else class="grid grid-cols-3 gap-2">
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        @click="pick(c)"
        :class="[
          'flex flex-col items-center gap-1 p-3 rounded-xl border transition relative',
          selectedId === c.id
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-slate-200 text-slate-700 hover:border-slate-300'
        ]"
      >
        <Check
          v-if="selectedId === c.id"
          class="absolute top-1 right-1 w-3.5 h-3.5 text-brand-600"
        />
        <component :is="iconOf(c.icon)" class="w-6 h-6" />
        <span class="text-xs font-medium truncate w-full text-center">{{ c.name }}</span>
      </button>
    </div>
  </BaseModal>
</template>