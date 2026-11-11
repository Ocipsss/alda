<script setup>
import * as LucideIcons from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  category: { type: Object, required: true }
})
defineEmits(['click'])

const icon = computed(() => LucideIcons[props.category.icon] || LucideIcons.Tag)

const color = computed(() =>
  props.category.type === 'income' ? '#10b981' : '#ef4444'
)
</script>

<template>
  <button
    @click="$emit('click', category)"
    class="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 active:bg-slate-50 transition text-left"
  >
    <div
      class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      :style="{ background: color + '18', color }"
    >
      <component :is="icon" class="w-5 h-5" />
    </div>

    <div class="flex-1 min-w-0">
      <p class="font-medium text-sm truncate">{{ category.name }}</p>
    </div>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4 text-slate-400 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  </button>
</template>