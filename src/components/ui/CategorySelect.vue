<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import CategoryPickerModal from './CategoryPickerModal.vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  categories: { type: Array, default: () => [] },
  label: { type: String, default: 'Kategori' }
})
const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)

const selected = computed(() =>
  props.categories.find(c => c.id === props.modelValue) || null
)

function iconOf(name) {
  return LucideIcons[name] || LucideIcons.Tag
}

function onSelect(category) {
  emit('update:modelValue', category.id)
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-1.5">{{ label }}</label>

    <button
      type="button"
      @click="showPicker = true"
      class="w-full flex items-center gap-3 p-3 rounded-xl border transition text-left"
      :class="selected
        ? 'border-slate-200 hover:border-slate-300'
        : 'border-slate-200 hover:border-slate-300 text-slate-500'"
    >
      <div
        v-if="selected"
        class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-brand-50 text-brand-600"
      >
        <component :is="iconOf(selected.icon)" class="w-4 h-4" />
      </div>
      <div
        v-else
        class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-slate-400"
      >
        <component :is="iconOf('Tag')" class="w-4 h-4" />
      </div>

      <span class="flex-1 text-sm font-medium truncate">
        {{ selected ? selected.name : 'Pilih Kategori' }}
      </span>

      <ChevronDown class="w-4 h-4 text-slate-400 shrink-0" />
    </button>

    <CategoryPickerModal
      v-model="showPicker"
      :categories="categories"
      :selected-id="modelValue"
      @select="onSelect"
    />
  </div>
</template>