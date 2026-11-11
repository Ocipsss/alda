<script setup>
import { ref } from 'vue'
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, X } from 'lucide-vue-next'

const emit = defineEmits(['income', 'expense', 'transfer'])

const open = ref(false)

function act(name) {
  open.value = false
  emit(name)
}
</script>

<template>
  <div class="fab-container fixed right-5 z-40 flex flex-col items-end gap-2">
    <Transition name="fab">
      <div v-if="open" class="flex flex-col items-end gap-2">
        <button
          @click="act('income')"
          class="flex items-center gap-2 bg-green-600 text-white pl-4 pr-3 py-2.5 rounded-full shadow-lg"
        >
          <span class="text-sm font-medium">Pemasukan</span>
          <TrendingUp class="w-4 h-4" />
        </button>
        <button
          @click="act('expense')"
          class="flex items-center gap-2 bg-red-600 text-white pl-4 pr-3 py-2.5 rounded-full shadow-lg"
        >
          <span class="text-sm font-medium">Pengeluaran</span>
          <TrendingDown class="w-4 h-4" />
        </button>
        <button
          @click="act('transfer')"
          class="flex items-center gap-2 bg-indigo-600 text-white pl-4 pr-3 py-2.5 rounded-full shadow-lg"
        >
          <span class="text-sm font-medium">Transfer</span>
          <ArrowLeftRight class="w-4 h-4" />
        </button>
      </div>
    </Transition>

    <button
      @click="open = !open"
      class="w-14 h-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center transition-transform"
      :class="{ 'rotate-45': open }"
    >
      <Plus v-if="!open" class="w-6 h-6" />
      <X v-else class="w-6 h-6" />
    </button>
  </div>
</template>

<style scoped>
.fab-container {
  /* BottomNav (~56px) + safe-area (iPhone home indicator) + margin 16px */
  bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px);
}

.fab-enter-active,
.fab-leave-active {
  transition: all 0.2s ease;
}
.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>