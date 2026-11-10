<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  categories: { type: Array, default: () => [] },
  label: { type: String, default: 'Kategori' }
})
const emit = defineEmits(['update:modelValue'])

function iconOf(name) {
  return LucideIcons[name] || LucideIcons.Tag
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-1.5">{{ label }}</label>
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="c in categories" :key="c.id"
        type="button"
        @click="emit('update:modelValue', c.id)"
        :class="[
          'flex flex-col items-center gap-1 p-2.5 rounded-xl border transition text-xs',
          modelValue === c.id
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-slate-200 text-slate-700 hover:border-slate-300'
        ]"
      >
        <component :is="iconOf(c.icon)" class="w-5 h-5" />
        <span class="truncate w-full text-center">{{ c.name }}</span>
      </button>
    </div>
  </div>
</template>